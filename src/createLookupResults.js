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

const { HOST_DETECTION_DISPLAY_FORMAT, CVE_DISPLAY_FORMAT } = require('./constants');
const getDisplayResults = require('./getDisplayResults');

const QDS_SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const createLookupResults = (foundEntities, Logger) =>
  map(({ entity, results }) => {
    const formattedQueryResult = formatQueryResult(entity, results);

    const lookupResult = {
      entity,
      displayValue: entity.type === 'qid' ? `QID: ${entity.value}` : entity.value,
      data: !!formattedQueryResult
        ? {
            summary: createSummary(entity, results, Logger),
            details: flow(keys, (keys) =>
              assign(formattedQueryResult, {
                tabKeys: keys
              })
            )(formattedQueryResult)
          }
        : null
    };

    return lookupResult;
  }, foundEntities);

const createSummary = (entity, { hostDetections, knowledgeBaseRecords }, Logger) => {
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

const formatQueryResult = (entity, result) => {
  const resultNotEmpty = flow(mapValues(size), some(identity))(result);

  if (!resultNotEmpty) return null;

  const { hostDetections, knowledgeBaseRecords } = result;

  // Sort detections by QDS descending (highest risk first)
  const sortedDetections = (hostDetections || []).map((host) => ({
    ...host,
    detection_list: (host.detection_list || []).slice().sort((a, b) => {
      const aScore = parseFloat(a.qds) || 0;
      const bScore = parseFloat(b.qds) || 0;
      return bScore - aScore;
    })
  }));

  if (entity.type === 'cve' || entity.type === 'qid') {
    const kbDisplayResults = getDisplayResults(CVE_DISPLAY_FORMAT, knowledgeBaseRecords);
    const hostDisplayResults = getDisplayResults(HOST_DETECTION_DISPLAY_FORMAT, sortedDetections);

    return {
      knowledgeBaseRecords: kbDisplayResults,
      hostDetections: hostDisplayResults
    };
  }

  // IP / Domain
  const hostDisplayResults = getDisplayResults(HOST_DETECTION_DISPLAY_FORMAT, sortedDetections);
  return {
    hostDetections: hostDisplayResults
  };
};

module.exports = createLookupResults;
