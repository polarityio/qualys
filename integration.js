const { get } = require('lodash/fp');
const schedule = require('node-schedule');
const fs = require('fs');

const createRequestWithDefaults = require('./src/createRequestWithDefaults');
const { validateStringOptions, validateUrlOption } = require('./src/validateOptions');
const { parseErrorToReadableJSON } = require('./src/dataTransformations');
const { getLookupResults } = require('./src/getLookupResults');
const knowledgeBaseIntoDb = require('./src/knowledgeBaseIntoDb/index');
const { DATABASE_PATH, TABLE_NAME } = require('./src/constants');

const loadMoreKnowledgeBaseRecords = require('./src/loadMoreKnowledgeBaseRecords');

let Logger;
let job;
let knex;
let requestWithDefaults;

const getKnex = async () => {
  try {
    const knex = await require('knex')({
      client: 'sqlite3',
      connection: {
        filename: DATABASE_PATH
      },
      useNullAsDefault: true
    });

    await knex.raw(`SELECT COUNT(*) FROM ${TABLE_NAME}`);
    return knex;
  } catch (e) {}
};

const startup = async (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
  const config = require('./config/config');

  if (!config.disableKnowledgeBase) {
    try {
      if (!fs.existsSync(DATABASE_PATH)) {
        fs.mkdirSync('./data', { recursive: true });
        fs.writeFileSync(DATABASE_PATH, '');
      }

      knex = await require('knex')({
        client: 'sqlite3',
        connection: {
          filename: DATABASE_PATH
        },
        useNullAsDefault: true
      });
      if (job) job.cancel();

      await knowledgeBaseIntoDb(knex, config, requestWithDefaults, Logger)();
      if (config.dataRefreshTime !== 'never-update') {
        if (job) job.cancel();

        job = schedule.scheduleJob(
          config.dataRefreshTime,
          knowledgeBaseIntoDb(knex, config, requestWithDefaults, Logger)
        );
      }
    } catch (error) {
      const err = parseErrorToReadableJSON(error);
      Logger.error({ error, formattedError: err }, 'Error on Startup');
      throw error;
    }
  }
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');

  const config = require('./config/config');

  let lookupResults = [];
  try {
    if (!config.disableKnowledgeBase && !knex) knex = await getKnex();

    lookupResults = await getLookupResults(
      entities,
      config,
      knex,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'Get Lookup Results Failed');

    return cb({
      detail: error.message.includes('Knex: Timeout')
        ? 'Too Many Entities searched at once.  Try less at one time.'
        : error.message.includes('Currently Refreshing Database')
        ? error.message
        : 'Searching Failed',
      err
    });
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const getOnMessage = {
  loadMoreKnowledgeBaseRecords
};

const onMessage = ({ action, data: actionParams }, options, callback) =>
  getOnMessage[action](actionParams, getKnex, requestWithDefaults, callback, Logger);

const validateOptions = async (options, callback) => {
  if (!options.configOptionsHaveBeenSet.value) {
    return callback(null, [
      {
        key: 'configOptionsHaveBeenSet',
        message: 'This option must be checked for this integration to function properly.'
      }
    ]);
  }

  const config = require('./config/config');

  const stringOptionsErrorMessages = {
    url: 'You must set a valid Qualys URL to the `url` property in `./config/config.js`',
    username:
      'You must set a valid Qualys Username to the `username` property in `./config/config.js`',
    password:
      'You must set a valid Qualys Password  to the`password` property in `./config/config.js`',
    dataRefreshTime:
      'You must set a valid KnowledgeBase Refresh Time to the `dataRefreshTime` property in `./config/config.js`'
  };

  const stringValidationErrors = validateStringOptions(
    stringOptionsErrorMessages,
    config
  );

  const urlValidationErrors = validateUrlOption(config.url);

  const dataRefreshTime = get('dataRefreshTime', config);
  const cronExpressionRegex =
    /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;
  const dataRefreshTimeError = cronExpressionRegex.test(dataRefreshTime)
    ? []
    : {
        key: 'configOptionsHaveBeenSet',
        message:
          'Your KnowledgeBase Refresh Time is formatted incorrectly. Try using https://crontab.guru/ for help.'
      };

  const errors = stringValidationErrors
    .concat(urlValidationErrors)
    .concat(dataRefreshTimeError);

  if (!errors.length) {
    if (job) job.cancel();
    validateOptionsStartedJob = true;

    Logger.info(`Refresh Data Time set to ${dataRefreshTime} hours`);

    if (!config.disableKnowledgeBase) {
      try {
        if (!knex) knex = await getKnex();

        await knowledgeBaseIntoDb(knex, config, requestWithDefaults, Logger)();

        if (dataRefreshTime !== 'never-update') {
          if (job) job.cancel();

          job = schedule.scheduleJob(
            dataRefreshTime,
            knowledgeBaseIntoDb(knex, config, requestWithDefaults, Logger)
          );
        }
      } catch (error) {
        const err = parseErrorToReadableJSON(error);
        Logger.error({ error, formattedError: err }, 'knowledgeBaseIntoDb Failed');
      }
    }
  }

  callback(null, errors);
};

module.exports = {
  startup,
  validateOptions,
  doLookup,
  onMessage
};
