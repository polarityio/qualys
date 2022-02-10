'use strict';

const validateOptions = require('./src/validateOptions');
const createRequestWithDefaults = require('./src/createRequestWithDefaults');
const { parseErrorToReadableJSON } = require('./src/dataTransformations');
const onMessageExample = require('./src/onMessageExample');

const { getLookupResults } = require('./src/getLookupResults');

let Logger;
let requestWithDefaults;
const startup = (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');
  options.url = options.url.endsWith('/') ? options.url.slice(0, -1) : options.url;

  let lookupResults;
  try {
    lookupResults = await getLookupResults(
      entities,
      options,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'Get Lookup Results Failed');

    return cb({
      detail: error.message || 'Command Failed',
      err
    });
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const onDetails = async (lookupObject, options, cb) => {
  try {
    //TODO: Change data when overlay result is opened

    return cb(null, lookupObject);
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'On Details Failed');

    return cb({
      detail: error.message || 'Command Failed',
      err
    });
  }
};


const getOnMessage = {
  //TODO: Add on message functions here
  onMessageExample
};

const onMessage = ({ action, data: actionParams }, options, callback) =>
  getOnMessage[action](actionParams, options, requestWithDefaults, callback, Logger);

module.exports = {
  startup,
  validateOptions,
  doLookup,
  onDetails,
  onMessage
};
