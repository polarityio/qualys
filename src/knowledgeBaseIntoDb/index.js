const {
  get,
  flow,
  map,
  some,
  negate,
  identity,
  __,
  first,
  values
} = require('lodash/fp');
const { createSchema, cleanUpTempTable } = require('./database');
const { millisToHoursMinutesAndSeconds, parseErrorToReadableJSON } = require('../dataTransformations');
const getAndInsertKnowledgeBaseRecords = require('./getAndInsertKnowledgeBaseRecords');
const { TABLE_NAME } = require('../constants');

const knowledgeBaseIntoDb = (knex, config, requestWithDefaults, Logger) => async () => {
  try {
    const requiredOptionsAreMissing = flow(
      map(get(__, config)),
      some(negate(identity))
    )(['url', 'username', 'password']);
    if (requiredOptionsAreMissing || !knex) return;

    Logger.info(`Started getting Records from Qualys Knowledge Base`);

    const startTime = new Date();

    await createSchema(knex, Logger);
    Logger.info(`Database Created`);

    await getAndInsertKnowledgeBaseRecords(knex, config, requestWithDefaults, Logger);
    Logger.info(`Database Data Obtained`);

    await cleanUpTempTable(knex, Logger);
    Logger.info(`Database Cleaned`);

    const recordCount = flow(
      first,
      values,
      first
    )(await knex.raw(`SELECT COUNT(*) FROM ${TABLE_NAME}`));

    const endTime = new Date();
    const loadTime = millisToHoursMinutesAndSeconds(endTime - startTime);
    Logger.info(
      `Finished getting Records from Qualys Knowledge Base.  ${recordCount} Records Available for Search. Load Time: ${loadTime}`
    );
  } catch (error) {
    const err = parseErrorToReadableJSON(error)
    Logger.error({ err }, 'Failed to get Records from Qualys Knowledge Base');
  }
};

module.exports = knowledgeBaseIntoDb;