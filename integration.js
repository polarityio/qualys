const createRequestWithDefaults = require('./src/createRequestWithDefaults');
const {
  validateStringOptions,
  validateUrlOption,
  validateCustomQidValueRegex
} = require('./src/validateOptions');
const { parseErrorToReadableJSON } = require('./src/dataTransformations');
const { getLookupResults } = require('./src/getLookupResults');
const launchScan = require('./src/launchScan');
const checkScanStatus = require('./src/checkScanStatus');

let Logger;
let requestWithDefaults;

const startup = async (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');

  let lookupResults = [];
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
      detail: error.message ? error.message : 'Searching Failed',
      err
    });
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const validateOptions = async (options, callback) => {
  const stringOptionsErrorMessages = {
    url: 'You must provide a valid Qualys URL.',
    username: 'You must provide a valid Qualys Username',
    password: 'You must provide a valid Qualys Password'
  };

  const stringValidationErrors = validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

  const urlValidationErrors = validateUrlOption(options.url.value);

  const customTypeRegexErrors = validateCustomQidValueRegex(options);
  const errors = stringValidationErrors
    .concat(urlValidationErrors)
    .concat(customTypeRegexErrors);

  callback(null, errors);
};

const onMessage = async (payload, options, cb) => {
  Logger.debug({ action: payload.action }, 'onMessage received');

  try {
    if (payload.action === 'LAUNCH_SCAN') {
      const result = await launchScan(
        payload.entityValue,
        options,
        requestWithDefaults,
        Logger
      );
      Logger.debug({ scanResult: result }, 'Scan Result');
      return cb(null, result);
    }

    if (payload.action === 'CHECK_SCAN_STATUS') {
      const result = await checkScanStatus(
        payload.scanRef,
        options,
        requestWithDefaults,
        Logger
      );
      Logger.debug({ scanStatus: result }, 'Scan Status');
      return cb(null, result);
    }

    cb({ detail: `Unknown onMessage action: ${payload.action}` });
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'onMessage failed');
    cb({ detail: error.message || 'onMessage failed' });
  }
};

module.exports = {
  startup,
  validateOptions,
  doLookup,
  onMessage
};
