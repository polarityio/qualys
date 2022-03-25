const { get, getOr, map, flow, filter, eq, uniqBy, flatten } = require('lodash/fp');

const {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson,
  or
} = require('../dataTransformations');

const queryHostDetectionListForAllEntities = async (
  entities,
  config,
  requestWithDefaults,
  Logger
) => {
  const allHostDetectionResults = await Promise.all(
    flow(
      filter(flow(get('type'), or(eq('IPv4'), eq('IPv6')))),
      map(queryHostDetectionListForOneIpAddress(config, requestWithDefaults, Logger))
    )(entities)
  );

  return flow(flatten, uniqBy('id'))(allHostDetectionResults);
};

const queryHostDetectionListForOneIpAddress =
  (config, requestWithDefaults, Logger) => async (entity) => {
    try {
      const responseXml = getOr(
        '',
        'body',
        await requestWithDefaults({
          method: 'GET',
          url: `${config.url}/api/2.0/fo/asset/host/vm/detection/`,
          qs: {
            action: 'list',
            ips: entity.value,
            show_asset_id: 1,
            show_results: 1
          },
          headers: { 'X-Requested-With': 'Polarity' },
          config
        })
      );

      const hostDetections = flow(
        getOr({}, 'host_list_vm_detection_output.response.host_list.host'),
        processPossibleList(false)
      )(await xmlToJson(responseXml));

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

module.exports = queryHostDetectionListForAllEntities;
