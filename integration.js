const createRequestWithDefaults = require('./src/createRequestWithDefaults');
const { validateStringOptions, validateUrlOption } = require('./src/validateOptions');
const { parseErrorToReadableJSON } = require('./src/dataTransformations');
const { getLookupResults } = require('./src/getLookupResults');

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

  const errors = stringValidationErrors.concat(urlValidationErrors);

  callback(null, errors);
};

module.exports = {
  startup,
  validateOptions,
  doLookup
};
