const { map, toLower, filter, flow, replace, includes, get, concat, uniqBy, flatMap } = require('lodash/fp');

const associateDataWithEntities = (
  entities,
  { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults },
  Logger
) =>
  map((entity) => {
    const entityType = entity.type;
    const entityScans = findEntityScans(entity, allScanResults || []);

    // CVE entities: match KB records by _sourceCve tag (set during KB query)
    // then find host detections that contain the QIDs from those KB records
    if (entityType === 'cve') {
      const knowledgeBaseRecords = (allFoundKnowledgeBaseRecords || []).filter(
        (kb) => kb._sourceCve && kb._sourceCve.toLowerCase() === entity.value.toLowerCase()
      );

      const hostDetections = flow(
        flatMap(({ qid }) => getObjectsContainingString(qid, allHostDetections)),
        uniqBy('id')
      )(knowledgeBaseRecords);

      return {
        entity,
        results: {
          hostDetections,
          knowledgeBaseRecords,
          scans: entityScans
        }
      };
    }

    // QID entities: match KB records by qid field, then get host detections containing that qid
    if (entityType === 'qid') {
      const knowledgeBaseRecords = (allFoundKnowledgeBaseRecords || []).filter(
        (kb) => String(kb.qid) === String(entity.value)
      );

      const hostDetections = flow(
        flatMap(({ qid }) => getObjectsContainingString(qid, allHostDetections)),
        concat(getObjectsContainingString(entity.value, allHostDetections)),
        uniqBy('id')
      )(knowledgeBaseRecords);

      return {
        entity,
        results: {
          hostDetections,
          knowledgeBaseRecords,
          scans: entityScans
        }
      };
    }

    // IP / Domain / IPv6 entities: host detections by text search; no KB records
    const hostDetections = getObjectsContainingString(entity.value, allHostDetections);

    return {
      entity,
      results: {
        hostDetections,
        knowledgeBaseRecords: [],
        scans: entityScans
      }
    };
  }, entities);

/**
 * Find scan results for a given entity.
 * IPs: match by entityValue (results filtered by target IP during query)
 * QIDs: use the shared '__RECENT__' bucket (recent account scans, no QID filter available)
 * Others: no scans
 */
const findEntityScans = (entity, allScanResults) => {
  if (entity.isIP || entity.type === 'IPv4' || entity.type === 'IPv6') {
    const entry = allScanResults.find((r) => r.entityValue === entity.value);
    return entry ? entry.scans : [];
  }
  if (entity.type === 'qid') {
    const entry = allScanResults.find((r) => r.entityValue === '__RECENT__');
    return entry ? entry.scans : [];
  }
  return [];
};

const getObjectsContainingString = (string, objs) =>
  filter(
    flow(
      JSON.stringify,
      replace(/[^\w]/g, ''),
      toLower,
      includes(flow(replace(/[^\w]/g, ''), toLower)(string))
    ),
    objs || []
  );

module.exports = associateDataWithEntities;
