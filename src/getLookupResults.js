const { flow, map, split, first, last, trim, concat, get, uniqBy } = require('lodash/fp');

const { splitOutIgnoredIps } = require('./dataTransformations');
const createLookupResults = require('./createLookupResults');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');
const queryKnowledgeBaseForAllEntities = require('./querying/queryKnowledgeBaseForAllEntities');
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
  // Sequential queries — Qualys enforces concurrent call limits per subscription tier
  const allHostDetections = uniqBy(
    'id',
    await queryHostDetectionListForAllEntities(
      entitiesPartition,
      options,
      requestWithDefaults,
      Logger
    )
  );

  const allFoundKnowledgeBaseRecords = await queryKnowledgeBaseForAllEntities(
    entitiesPartition,
    options,
    requestWithDefaults,
    Logger
  );

  Logger.trace({ allHostDetections, allFoundKnowledgeBaseRecords }, 'getData results');

  return { allHostDetections, allFoundKnowledgeBaseRecords };
};

module.exports = {
  getLookupResults
};
