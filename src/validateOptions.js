const fp = require('lodash/fp');
const reduce = require('lodash/fp/reduce').convert({ cap: false });


const validateStringOptions = (stringOptionsErrorMessages, options, otherErrors = []) =>
  reduce((agg, message, optionName) => {
    const isString = typeof options[optionName].value === 'string';
    const isEmptyString = isString && fp.isEmpty(options[optionName].value);

    return !isString || isEmptyString
      ? agg.concat({
          key: optionName,
          message
        })
      : agg;
  }, otherErrors)(stringOptionsErrorMessages);

const validateUrlOption = (url, otherErrors = []) => {
  const endWithError =
    url && url.endsWith('/')
      ? otherErrors.concat({
          key: 'url',
          message:
            'Your URL must not end with a /'
        })
      : otherErrors;
  if (endWithError.length) return endWithError;

  if (url) {
    try {
      new URL(url);
    } catch (_) {
      return otherErrors.concat({
        key: 'url',
        message:
          'This URL is invalid. You must provide a valid URL.'
      });
    }
  }

  return otherErrors;
};


module.exports = { validateStringOptions, validateUrlOption };
