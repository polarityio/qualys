const { flow, map, split, first, last, trim, concat, get, uniqBy } = require('lodash/fp');

const { splitOutIgnoredIps } = require('./dataTransformations');
const createLookupResults = require('./createLookupResults');

const queryAssetsForAllEntities = require('./querying/queryAssetsForAllEntities');
const queryVulnerabilitiesForAllEntities = require('./querying/queryVulnerabilitiesForAllEntities');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');
const queryKnowledgeBase = require('./querying/queryKnowledgeBase');
const associateDataWithEntities = require('./associateDataWithEntities');
const { TABLE_NAME } = require('./constants');

const getLookupResults = async (
  entities,
  options,
  config,
  knex,
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
    config,
    knex,
    requestWithDefaults,
    Logger
  );

  const foundEntities = associateDataWithEntities(entitiesPartition, data, Logger);

  const lookupResults = createLookupResults(foundEntities, Logger);

  return lookupResults.concat(ignoredIpLookupResults);
};

const getData = async (
  entitiesPartition,
  { shouldDeepSearchForAssets },
  config,
  knex,
  requestWithDefaults,
  Logger
) => {
  let knexIsLoaded;
  try {
    knexIsLoaded = knex && (await knex.raw(`SELECT COUNT(*) FROM ${TABLE_NAME}`));
  } catch (error) {}

  const [initialHostDetections, allFoundKnowledgeBaseRecords] = await Promise.all([
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


  let knowledgeBaseDetections = [];
  if (shouldDeepSearchForAssets) {
    knowledgeBaseDetections = await queryHostDetectionListForAllEntities(
      map(
        flow(get('qid'), (qid) => ({ type: 'qid', value: qid })),
        allFoundKnowledgeBaseRecords
      ),
      config,
      requestWithDefaults,
      Logger
    );
  }

  const allHostDetections = flow(
    concat(knowledgeBaseDetections),
    uniqBy('id')
  )(initialHostDetections);

  Logger.trace({ allHostDetections, allFoundKnowledgeBaseRecords });

  return { allHostDetections, allFoundKnowledgeBaseRecords };
};

module.exports = {
  getLookupResults
};
