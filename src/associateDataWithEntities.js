const { map, toLower, filter, flow, replace, includes } = require("lodash/fp");

const associateDataWithEntities = (
  entities,
  { allHostDetections, allFoundKnowledgeBaseRecords },
  Logger
) =>
  map(
    (entity) => ({
      entity,
      results: {
        hostDetections: getObjectsContainingString(entity.value, allHostDetections),
        knowledgeBaseRecords: getObjectsContainingString(
          entity.value,
          allFoundKnowledgeBaseRecords
        )
      }
    }),
    entities
  );

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