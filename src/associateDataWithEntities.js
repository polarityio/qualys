const { map, toLower, filter, flow, replace, includes, get, concat, uniqBy, flatMap } = require('lodash/fp');

const associateDataWithEntities = (
  entities,
  { allHostDetections, allFoundKnowledgeBaseRecords },
  Logger
) =>
  map((entity) => {
    const entityType = entity.type;

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
          knowledgeBaseRecords
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
          knowledgeBaseRecords
        }
      };
    }

    // IP / Domain / IPv6 entities: host detections by text search; no KB records
    const hostDetections = getObjectsContainingString(entity.value, allHostDetections);

    return {
      entity,
      results: {
        hostDetections,
        knowledgeBaseRecords: []
      }
    };
  }, entities);

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
