const { getOr } = require('lodash/fp');
const { parseErrorToReadableJSON } = require('./src/dataTransformations');

const onMessageExample = async (
  { /**data from component */ },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    await requestWithDefaults({
      // Add Request Options
    });

    callback(null, { /** return empty object required even if not returning */});
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to <do desired task>',
        options,
        formattedError: err
      },
      '<do desired task> Failed'
    );
    const { title, detail, code } = getOr(
      {
        title: error.message,
        detail: '<doing desired task> Unsuccessful',
        code: error.status
      },
      'errors.0', //TODO: update error path
      err.description && err.description[0] === '{'
        ? JSON.parse(err.description)
        : err.description
    );
    return callback({
      errors: [
        {
          err: error,
          detail: `${title}${detail ? ` - ${detail}` : ''}${
            code ? `, Code: ${code}` : ''
          }`
        }
      ]
    });
  }
};

module.exports = onMessageExample;
