const { flow, map, split, first, last, trim, concat, get, uniqBy } = require('lodash/fp');

const { splitOutIgnoredIps } = require('./dataTransformations');
const createLookupResults = require('./createLookupResults');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');
const queryKnowledgeBaseForAllEntities = require('./querying/queryKnowledgeBaseForAllEntities');
const queryScanListForAllEntities = require('./querying/queryScanListForEntities');
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
  const lookupResults = createLookupResults(foundEntities, options, Logger);

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

  // Scan list: fetch for IP and QID entities (gracefully skipped on failure)
  let allScanResults = [];
  try {
    allScanResults = await queryScanListForAllEntities(
      entitiesPartition,
      options,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    Logger.warn({ error }, 'Scan list query failed — scans tab will be empty');
  }

  Logger.trace(
    { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults },
    'getData results'
  );

  return { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults };
};

module.exports = {
  getLookupResults
};
