const {
  flow,
  get,
  map,
  size,
  mapValues,
  some,
  identity,
  keys,
  assign,
  eq
} = require('lodash/fp');

const { HOST_DETECTION_DISPLAY_FORMAT } = require('./constants');
const getDisplayResults = require('./getDisplayResults');

const createLookupResults = (foundEntities, Logger) =>
  map(({ entity, results }) => {
    const formattedQueryResult = formatQueryResult(results);

    const lookupResult = {
      entity,
      displayValue: entity.type === 'qid' ? `QID: ${entity.value}` : entity.value,
      data: !!formattedQueryResult
        ? {
            summary: createSummary(entity, results, Logger),
            details: flow(keys, (keys) =>
              assign(formattedQueryResult, {
                tabKeys: keys
              })
            )(formattedQueryResult)
          }
        : null
    };

    return lookupResult;
  }, foundEntities);

const createSummary = (entity, { hostDetections, knowledgeBaseRecords }, Logger) =>
  [].concat(size(hostDetections) ? `Host Detections: ${size(hostDetections)}` : []);

const formatQueryResult = (result) => {
  const resultNotEmpty = flow(mapValues(size), some(identity))(result);

  if (resultNotEmpty) {
    const hostDetections = getDisplayResults(
      HOST_DETECTION_DISPLAY_FORMAT,
      result.hostDetections
    );

    return {
      hostDetections
    };
  }
};

module.exports = createLookupResults;
