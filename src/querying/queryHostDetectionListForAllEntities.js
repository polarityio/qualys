const { identity } = require('lodash');
const {
  get,
  getOr,
  map,
  flow,
  filter,
  eq,
  uniqBy,
  join,
  cond,
  size
} = require('lodash/fp');

const {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson,
  or
} = require('../dataTransformations');

const queryHostDetectionListForAllEntities = async (
  entities,
  options,
  requestWithDefaults,
  Logger
) => {
  const allHostDetectionResultForIpAddresses = await flow(
    filter(flow(get('type'), or(eq('IPv4'), eq('IPv6')))),
    map(get('value')),
    cond([[size, queryHostDetectionList('ips', options, requestWithDefaults, Logger)]])
  )(entities);

  const allHostDetectionResultForQids = await flow(
    filter(flow(get('type'), eq('qid'))),
    map(get('value')),
    cond([[size, queryHostDetectionList('qids', options, requestWithDefaults, Logger)]])
  )(entities);

  const allHostDetectionResultForDomains = await flow(
    filter(flow(get('type'), eq('domain'))),
    cond([[size, queryHostDetectionListForDomains(options, requestWithDefaults, Logger)]])
  )(entities);

  return uniqBy('id', allHostDetectionResultForIpAddresses)
    .concat(uniqBy('id', allHostDetectionResultForQids))
    .concat(uniqBy('id', allHostDetectionResultForDomains || []));
};

const queryHostDetectionList =
  (type, options, requestWithDefaults, Logger) => async (entityValues) => {
    try {
      const responseXml = getOr(
        '',
        'body',
        await requestWithDefaults({
          method: 'GET',
          url: `${options.url}/api/5.0/fo/asset/host/vm/detection/`,
          qs: {
            action: 'list',
            [type]: join(',', entityValues),
            show_asset_id: 1,
            show_results: 1,
            show_qds: 1,
            show_qds_factors: 1
          },
          headers: { 'X-Requested-With': 'Polarity' },
          options
        })
      );

      const hostDetections = flow(
        get('host_list_vm_detection_output.response.host_list.host'),
        processPossibleList(false)
      )(await xmlToJson(responseXml, Logger));

      const processedJson = map(
        processResultWithProcessingFormat(HOST_DETECTIONS_LIST_FORMAT),
        hostDetections
      );

      return processedJson;
    } catch (error) {
      const err = parseErrorToReadableJSON(error);
      Logger.error(
        {
          detail: 'Failed to Query Host Detection List',
          formattedError: err
        },
        'Querying Host Detection List Failed'
      );

      throw error;
    }
  };

const HOST_DETECTIONS_LIST_ITEM_FORMAT = {
  qid: 'qid',
  type: 'type',
  severity: 'severity',
  port: 'port',
  protocol: 'protocol',
  ssl: {
    path: 'ssl',
    process: (ssl) => (ssl == 1 ? 'Yes' : 'No')
  },
  qds: {
    path: 'qds',
    process: (qds) => (qds && qds.value != null ? qds.value : qds)
  },
  qds_severity: {
    path: 'qds',
    process: (qds) => (qds && qds.attributes ? qds.attributes.severity : null)
  },
  qds_factors: {
    path: 'qds_factors',
    process: (qdsFactors) => {
      if (!qdsFactors) return null;
      const factors = processPossibleList(false)(
        qdsFactors.qds_factor || qdsFactors
      );
      if (!factors) return null;
      return factors.reduce((acc, f) => {
        if (f && f.attributes && f.attributes.name) {
          acc[f.attributes.name] = f.value || f;
        }
        return acc;
      }, {});
    }
  },
  results: 'results',
  status: 'status',
  first_found_datetime: 'first_found_datetime',
  last_found_datetime: 'last_found_datetime',
  times_found: 'times_found',
  last_test_datetime: 'last_test_datetime',
  last_update_datetime: 'last_update_datetime',
  is_ignored: {
    path: 'is_ignored',
    process: (is_ignored) => (is_ignored == 1 ? 'Yes' : 'No')
  },
  is_disabled: {
    path: 'is_disabled',
    process: (is_disabled) => (is_disabled == 1 ? 'Yes' : 'No')
  },
  last_processed_datetime: 'last_processed_datetime'
};

const HOST_DETECTIONS_LIST_FORMAT = {
  id: 'id',
  asset_id: 'asset_id',
  ip: 'ip',
  os: 'os',
  dns: 'dns',
  last_scan_datetime: 'last_scan_datetime',
  last_vm_scanned_date: 'last_vm_scanned_date',
  last_vm_scanned_duration: 'last_vm_scanned_duration',
  category: 'category',
  detection_list: {
    path: 'detection_list',
    process: flow(
      get('detection'),
      processPossibleList(false),
      map(processResultWithProcessingFormat(HOST_DETECTIONS_LIST_ITEM_FORMAT)),
      uniqBy('qid')
    )
  }
};

// Two-step domain resolution:
// Step 1: query /api/2.0/fo/asset/host/ with tracking_method=DNS to find hosts by DNS name
// Step 2: run detection query against the resolved IPs at /api/5.0/
const queryHostDetectionListForDomains =
  (options, requestWithDefaults, Logger) => async (domainEntities) => {
    const results = [];
    for (const entity of domainEntities) {
      try {
        // Step 1 — resolve domain to IPs via the host list DNS tracking
        const hostListXml = getOr(
          '',
          'body',
          await requestWithDefaults({
            method: 'GET',
            url: `${options.url}/api/2.0/fo/asset/host/`,
            qs: {
              action: 'list',
              details: 'Basic',
              tracking_method: 'DNS',
              show_asset_id: 1
            },
            headers: { 'X-Requested-With': 'Polarity' },
            options
          })
        );

        const hostListJson = await xmlToJson(hostListXml, Logger);
        const hosts = flow(
          get('host_list_output.response.host_list.host'),
          processPossibleList(false)
        )(hostListJson);

        if (!hosts || !hosts.length) continue;

        // Match hosts whose DNS field contains the entity domain value
        const matchingIps = hosts
          .filter((h) => {
            const dns = (h.dns || '').toLowerCase();
            return dns.includes(entity.value.toLowerCase());
          })
          .map((h) => h.ip)
          .filter(Boolean);

        if (!matchingIps.length) continue;

        // Step 2 — run detection on the resolved IPs
        const detections = await queryHostDetectionList(
          'ips',
          options,
          requestWithDefaults,
          Logger
        )(matchingIps);

        results.push(...(detections || []));
      } catch (error) {
        const err = parseErrorToReadableJSON(error);
        Logger.error(
          { detail: 'Failed Domain Two-Step Lookup', domain: entity.value, formattedError: err },
          'Domain Host Detection Failed'
        );
      }
    }
    return uniqBy('id', results);
  };

module.exports = queryHostDetectionListForAllEntities;
