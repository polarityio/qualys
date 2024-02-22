const { flow, map, split, first, last, trim, concat, get, uniqBy } = require('lodash/fp');

const { splitOutIgnoredIps } = require('./dataTransformations');
const createLookupResults = require('./createLookupResults');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');
const associateDataWithEntities = require('./associateDataWithEntities');

const getLookupResults = async (
  entities,
  options,
  requestWithDefaults,
  Logger
) => {
  const entitiesWithCustomTypesSpecified = map(({ type, types, value, ...entity }) => {
    type = type === 'custom' ? flow(first, split('.'), last)(types) : type;

    return {
      ...entity,
      type,
      value: type === 'qid' ? flow(split(':'), last, trim)(value) : value
    };
  }, entities);

  const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
    entitiesWithCustomTypesSpecified
  );

  const data = await getData(
    entitiesPartition,
    options,
    requestWithDefaults,
    Logger
  );

  const foundEntities = associateDataWithEntities(entitiesPartition, data, Logger);
  const lookupResults = createLookupResults(foundEntities, Logger);

  return lookupResults.concat(ignoredIpLookupResults);
};

const getData = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const [initialHostDetections, allFoundKnowledgeBaseRecords] = await Promise.all([
    queryHostDetectionListForAllEntities(
      entitiesPartition,
      options,
      requestWithDefaults,
      Logger
    )
  ]);

  const allHostDetections = flow(
    uniqBy('id')
  )(initialHostDetections);

  Logger.trace({ allHostDetections }, 'All Host Detections');

  return { allHostDetections, allFoundKnowledgeBaseRecords };
};

module.exports = {
  getLookupResults
};
