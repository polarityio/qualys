const { map, toLower, filter, flow, replace, includes, get, concat, uniqBy, flatMap } = require('lodash/fp');

const associateDataWithEntities = (
  entities,
  { allHostDetections, allFoundKnowledgeBaseRecords },
  Logger
) =>
  map((entity) => {
    const knowledgeBaseRecords = getObjectsContainingString(
      entity.value,
      allFoundKnowledgeBaseRecords
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
  }, entities);

const getObjectsContainingString = (string, objs) =>
  filter(
    flow(
      JSON.stringify,
      replace(/[^\w]/g, ''),
      toLower,
      includes(flow(replace(/[^\w]/g, ''), toLower)(string))
    ),
    objs
  );

module.exports = associateDataWithEntities;
