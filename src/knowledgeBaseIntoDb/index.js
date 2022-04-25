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

const knowledgeBaseIntoDb = (knex, _options, requestWithDefaults, Logger) => async () => {
  try {
    const options = {
      url: get('url.value', _options) || _options.url,
      username: get('username.value', _options) || _options.username,
      password: get('password.value', _options) || _options.password
    };

    Logger.info(`Started getting Records from Qualys KnowledgeBase`);

    const startTime = new Date();

    await createSchema(knex, Logger);
    Logger.info(`Database Created`);

    await getAndInsertKnowledgeBaseRecords(knex, options, requestWithDefaults, Logger);
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
      `Finished getting Records from Qualys KnowledgeBase.  ${recordCount} Records Available for Search. Load Time: ${loadTime}`
    );
  } catch (error) {
    const err = parseErrorToReadableJSON(error)
    Logger.error({ err }, 'Failed to get Records from Qualys KnowledgeBase');
  }
};

module.exports = knowledgeBaseIntoDb;
