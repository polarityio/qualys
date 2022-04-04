const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });


const validateStringOptions = (stringOptionsErrorMessages, config, otherErrors = []) =>
  reduce((agg, message, configKey) => {
    const isString = typeof config[configKey] === 'string';
    const isEmptyString = isString && fp.isEmpty(config[configKey]);

    return !isString || isEmptyString
      ? agg.concat({
          key: 'configOptionsHaveBeenSet',
          message
        })
      : agg;
  }, otherErrors)(stringOptionsErrorMessages);

const validateUrlOption = (url, otherErrors = []) => {
  const endWithError =
    url && url.endsWith('/')
      ? otherErrors.concat({
          key: 'configOptionsHaveBeenSet',
          message: 'Your `url` property in the `./config/config.js` file must not end with a /'
        })
      : otherErrors;
  if (endWithError.length) return endWithError;

  if (url) {
    try {
      new URL(url);
    } catch (_) {
      return otherErrors.concat({
        key: 'configOptionsHaveBeenSet',
        message:
          'What is currently provided in the `url` property is not a valid URL. You must provide a valid URL.'
      });
    }
  }

  return otherErrors;
};


module.exports = { validateStringOptions, validateUrlOption };
