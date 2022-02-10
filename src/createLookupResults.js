const { flow, map, size, mapValues, some, identity } = require('lodash/fp');

const createLookupResults = (foundEntities, options, Logger) =>
  map(({ entity, result }) => {
    const formattedQueryResult = formatQueryResult(result);

    const lookupResult = {
      entity,
      data: !!formattedQueryResult
        ? {
            summary: createSummary(entity, formattedQueryResult, Logger),
            details: formattedQueryResult
          }
        : null
    };
    
    return lookupResult;
  }, foundEntities);

const createSummary = (entity, formattedQueryResult, Logger) => {
  return [];
}
const formatQueryResult = (result) => {
  const resultNotEmpty = flow(mapValues(size), some(identity))(result);

  return resultNotEmpty && result;
};

module.exports = createLookupResults;
