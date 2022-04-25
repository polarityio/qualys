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

const startup = async (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');

  let lookupResults = [];
  try {
    if (!options.disableKnowledgeBase && !knex) knex = await getKnex();

    lookupResults = await getLookupResults(
      entities,
      options,
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

const getKnex = async () => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      fs.mkdirSync('./data', { recursive: true });
      fs.writeFileSync(DATABASE_PATH, '');
    }
    const knex = await require('knex')({
      client: 'sqlite3',
      connection: {
        filename: DATABASE_PATH
      },
      useNullAsDefault: true
    });

    if (await knex.schema.hasTable(TABLE_NAME))
      await knex.raw(`SELECT COUNT(*) FROM ${TABLE_NAME}`);

    return knex;
  } catch (e) {
    const err = parseErrorToReadableJSON(e);
    Logger.trace({ MESSAGE: 'Failed to connect to Database', err });
  }
};

const getOnMessage = {
  loadMoreKnowledgeBaseRecords
};

const onMessage = ({ action, data: actionParams }, options, callback) =>
  getOnMessage[action](
    actionParams,
    options,
    getKnex,
    requestWithDefaults,
    callback,
    Logger
  );

const validateOptions = async (options, callback) => {
  const stringOptionsErrorMessages = {
    url: 'You must provide a valid Qualys URL.',
    username: 'You must provide a valid Qualys Username',
    password: 'You must provide a valid Qualys Password',
    dataRefreshTime: 'You must provide a valid KnowledgeBase Refresh Time'
  };

  const stringValidationErrors = validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

  const urlValidationErrors = validateUrlOption(options.url.value);

  const dataRefreshTime = get('dataRefreshTime.value', options);
  const cronExpressionRegex =
    /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;
  const dataRefreshTimeError = cronExpressionRegex.test(dataRefreshTime)
    ? []
    : {
        key: 'dataRefreshTime',
        message:
          'Your KnowledgeBase Refresh Time is formatted incorrectly. Try using https://crontab.guru/ for help.'
      };

  const errors = stringValidationErrors
    .concat(urlValidationErrors)
    .concat(dataRefreshTimeError);

  if (!(errors.length || get('disableKnowledgeBase.value', options))) {
    Logger.info(`Refresh Data Time set to ${dataRefreshTime}`);
    try {
      if (!knex) knex = await getKnex();

      knowledgeBaseIntoDb(knex, options, requestWithDefaults, Logger)();

      if (dataRefreshTime !== 'never-update') {
        if (job) job.cancel();

        job = schedule.scheduleJob(
          dataRefreshTime,
          knowledgeBaseIntoDb(knex, options, requestWithDefaults, Logger)
        );
      }
    } catch (error) {
      const err = parseErrorToReadableJSON(error);
      Logger.error({ error, formattedError: err }, 'knowledgeBaseIntoDb Failed');
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
