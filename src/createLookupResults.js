const {
  flow,
  get,
  map,
  size,
  mapValues,
  some,
  identity,
  keys,
  assign,
  eq,
  filter,
  maxBy
} = require('lodash/fp');

const {
  HOST_DETECTION_DISPLAY_FORMAT,
  CVE_DISPLAY_FORMAT,
  SCAN_DISPLAY_FORMAT
} = require('./constants');
const getDisplayResults = require('./getDisplayResults');

const QDS_SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const createLookupResults = (foundEntities, options, Logger) =>
  map(({ entity, results }) => {
    const isIpEntity =
      entity.isIP || entity.type === 'IPv4' || entity.type === 'IPv6';
    const enableScanLaunch = getOptionBool(options && options.enableScanLaunch, true);

    const formattedQueryResult = formatQueryResult(entity, results, isIpEntity);

    const lookupResult = {
      entity,
      displayValue: entity.type === 'qid' ? `QID: ${entity.value}` : entity.value,
      data: !!formattedQueryResult
        ? {
            summary: createSummary(entity, results, Logger),
            details: flow(keys, (tabKeys) =>
              assign(formattedQueryResult, {
                tabKeys,
                // _scanMeta is NOT in tabKeys (computed before this assign) so it
                // won't render as a tab, but is accessible to the component for
                // showing/hiding the Launch Scan button
                _scanMeta: {
                  isIpEntity,
                  enableScanLaunch
                }
              })
            )(formattedQueryResult)
          }
        : null
    };

    return lookupResult;
  }, foundEntities);

const createSummary = (entity, { hostDetections, knowledgeBaseRecords, scans }, Logger) => {
  const type = entity.type;

  if (type === 'cve') {
    const kbRecord = knowledgeBaseRecords && knowledgeBaseRecords[0];
    const cvssBase = kbRecord && (kbRecord.cvss_v3_base || kbRecord.cvss_base);
    const affectedCount = size(hostDetections);
    return [
      entity.value,
      cvssBase ? `CVSS: ${cvssBase}` : null,
      `Affected Hosts: ${affectedCount}`
    ].filter(Boolean);
  }

  if (type === 'qid') {
    const kbRecord = knowledgeBaseRecords && knowledgeBaseRecords[0];
    const severity = kbRecord && kbRecord.severity;
    return [
      `QID: ${entity.value}`,
      severity ? `Severity: ${severity}` : null,
      `Hosts: ${size(hostDetections)}`
    ].filter(Boolean);
  }

  // IP / Domain / IPv6
  const vulnCount = size(hostDetections);
  if (!vulnCount) return [];

  const allDetections = hostDetections.flatMap((h) => h.detection_list || []);
  const activeCount = filter((d) => d.status === 'Active', allDetections).length;

  const topSeverity = allDetections.reduce((best, d) => {
    const rank = QDS_SEVERITY_ORDER[d.qds_severity] || 0;
    return rank > (QDS_SEVERITY_ORDER[best] || 0) ? d.qds_severity : best;
  }, null);

  return [
    `Vulns: ${vulnCount}`,
    topSeverity ? `Max QDS: ${topSeverity}` : null,
    activeCount > 0 ? `Active: ${activeCount}` : null
  ].filter(Boolean);
};

const formatQueryResult = (entity, result, isIpEntity) => {
  const { hostDetections, knowledgeBaseRecords, scans } = result;

  const resultNotEmpty = flow(mapValues(size), some(identity))({
    hostDetections,
    knowledgeBaseRecords
  });

  if (!resultNotEmpty) return null;

  // Sort detections by QDS descending (highest risk first)
  const sortedDetections = (hostDetections || []).map((host) => ({
    ...host,
    detection_list: (host.detection_list || []).slice().sort((a, b) => {
      const aScore = parseFloat(a.qds) || 0;
      const bScore = parseFloat(b.qds) || 0;
      return bScore - aScore;
    })
  }));

  // Build the scans display: process through SCAN_DISPLAY_FORMAT for generic renderer
  // For IPs: always include tab (placeholder when empty so Launch Scan is accessible)
  // For QIDs: only include tab when there are actual scan results
  const scanDisplayResults = getDisplayResults(SCAN_DISPLAY_FORMAT, scans || []);
  const scansTab = isIpEntity
    ? scanDisplayResults.length
      ? scanDisplayResults
      : [{ isTextBlock: true, value: 'No recent scans found for this IP.' }]
    : scanDisplayResults.length
    ? scanDisplayResults
    : null;

  if (entity.type === 'cve' || entity.type === 'qid') {
    const kbDisplayResults = getDisplayResults(CVE_DISPLAY_FORMAT, knowledgeBaseRecords);
    const hostDisplayResults = getDisplayResults(HOST_DETECTION_DISPLAY_FORMAT, sortedDetections);

    return {
      knowledgeBaseRecords: kbDisplayResults,
      hostDetections: hostDisplayResults,
      ...(scansTab ? { scans: scansTab } : {})
    };
  }

  // IP / Domain
  const hostDisplayResults = getDisplayResults(HOST_DETECTION_DISPLAY_FORMAT, sortedDetections);
  return {
    hostDetections: hostDisplayResults,
    ...(scansTab ? { scans: scansTab } : {})
  };
};

/** Safely read a Polarity option that may be a raw value or { value } wrapper */
const getOptionBool = (opt, defaultValue) => {
  if (opt === null || opt === undefined) return defaultValue;
  if (typeof opt === 'boolean') return opt;
  if (typeof opt === 'object' && 'value' in opt) return opt.value;
  return defaultValue;
};

module.exports = createLookupResults;
