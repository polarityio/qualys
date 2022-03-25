const { flow, get, map, values, assign, flatMap } = require('lodash/fp');

const { mapObject } = require('./dataTransformations');

const getDisplayResults = (displayFormat, results, dontFlatten) =>
  (dontFlatten ? map : flatMap)((record) => {
    const displayResultsAsObject = mapObject(
      (contentInfo, columnName) =>
        (get(columnName, record) ||
          get('isTitle', contentInfo) ||
          get('isNewSectionLineBreak', contentInfo)) && [
          columnName,
          buildDisplayValue(contentInfo, columnName, record)
        ],
      displayFormat
    );

    const displayResults = values(displayResultsAsObject);

    return displayResults;
  }, results);

const buildDisplayValue = (contentInfo, columnName, record) =>
  typeof contentInfo === 'string'
    ? { label: contentInfo, value: get(columnName, record) }
    : assign(contentInfo, {
        value: flow(get(columnName), (value) =>
          contentInfo.isListOfLinks
            ? JSON.parse(value)
            : contentInfo.isList
            ? getDisplayResults(
                contentInfo.itemDisplayFormat,
                get(columnName, record),
                true
              )
            : value
        )(record)
      });

module.exports = getDisplayResults;
