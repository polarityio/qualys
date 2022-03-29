const { flow, map, split, first, last } = require('lodash/fp');

const { splitOutIgnoredIps } = require('./dataTransformations');
const createLookupResults = require('./createLookupResults');

const queryAssetsForAllEntities = require('./querying/queryAssetsForAllEntities');
const queryVulnerabilitiesForAllEntities = require('./querying/queryVulnerabilitiesForAllEntities');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');
const queryKnowledgeBase = require('./querying/queryKnowledgeBase');
const associateDataWithEntities = require('./associateDataWithEntities');
const { TABLE_NAME } = require('./constants');

const getLookupResults = async (entities, config, knex, requestWithDefaults, Logger) => {
  const entitiesWithCustomTypesSpecified = map(
    ({ type, types, ...entity }) => ({
      ...entity,
      type: type === 'custom' ? flow(first, split('.'), last)(types) : type
    }),
    entities
  );

  const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
    entitiesWithCustomTypesSpecified
  );

  const data = await getData(
    entitiesPartition,
    config,
    knex,
    requestWithDefaults,
    Logger
  );

  const foundEntities = associateDataWithEntities(entitiesPartition, data, Logger);

  const lookupResults = createLookupResults(foundEntities, Logger);

  return lookupResults.concat(ignoredIpLookupResults);
};

const getData = async (entitiesPartition, config, knex, requestWithDefaults, Logger) => {
  let knexIsLoaded;
  try {
    knexIsLoaded = knex && (await knex.raw(`SELECT COUNT(*) FROM ${TABLE_NAME}`));
  } catch (error) {}

  const [allHostDetections, allFoundKnowledgeBaseRecords] = await Promise.all([
    queryHostDetectionListForAllEntities(
      entitiesPartition,
      config,
      requestWithDefaults,
      Logger
    ),
    !config.disableKnowledgeBase && knexIsLoaded
      ? queryKnowledgeBase(entitiesPartition, knex, Logger)
      : async () => []
  ]);

  Logger.trace({ allHostDetections, allFoundKnowledgeBaseRecords });
  
  return { allHostDetections, allFoundKnowledgeBaseRecords };
};

module.exports = {
  getLookupResults
};
