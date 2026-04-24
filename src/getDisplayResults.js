const { flow, get, map, values, assign, flatMap } = require('lodash/fp');

const { mapObject } = require('./dataTransformations');

const getDisplayResults = (displayFormat, results, dontFlatten) =>
  (dontFlatten ? map : flatMap)((record) => {
    const displayResultsAsObject = mapObject(
      (contentInfo, columnName) => {
        const rawValue = get(columnName, record);

        // For isListOfLinks, skip the field entirely when there are no valid entries
        if (contentInfo.isListOfLinks && rawValue) {
          const parsed = JSON.parse(rawValue);
          const validItems = parsed.filter((item) => item && item.id);
          if (!validItems.length) return false;
        }

        return (
          (rawValue || get('isTitle', contentInfo) || get('isNewSectionLineBreak', contentInfo)) && [
            columnName,
            buildDisplayValue(contentInfo, columnName, record)
          ]
        );
      },
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
            ? JSON.parse(value).filter((item) => item && item.id)
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
