const { getOr, size, flow, concat, uniqBy, orderBy } = require('lodash/fp');
const {
  parseErrorToReadableJSON,
  buildQueryByQueryType
} = require('../dataTransformations');

const VULNERABILITIES_QUERY_FIELDS =
  'title,id,qid,title,port,age,typeDetected,assetId,assetName,assetUUID,lastDetected,' +
  'firstDetected,fqdn,ssl,severity,assetCount,cveids,vulnStatus,ignored,disabled,' +
  'isQualysPatchable,missingPatchCount,patchLicenseType,patchPlatform';

const limit = 200;

const queryVulnerabilitiesForAllEntities = async (
  entities,
  options,
  requestWithDefaults,
  Logger,
  offset = 0,
  allVulnerabilities = []
) => {
  try {
    const vulnerabilitiesQuery = buildQueryByQueryType('vulnerabilities', entities);

    const vulnerabilitiesData = getOr(
      [],
      'body',
      await requestWithDefaults({
        uri: `${options.url}/portal-front/rest/assetview/1.0/assets`,
        qs: {
          havingQuery: vulnerabilitiesQuery,
          fields: VULNERABILITIES_QUERY_FIELDS,
          limit,
          offset
        },
        options
      })
    );

    const foundVulnerabilities = flow(
      concat(vulnerabilitiesData),
      uniqBy('id')
    )(allVulnerabilities);

    if (size(vulnerabilitiesData) === 200) {
      return await queryVulnerabilitiesForAllEntities(
        entities,
        options,
        requestWithDefaults,
        Logger,
        offset + limit,
        foundVulnerabilities
      );
    }

    return orderBy('lastDetected.iMillis', 'desc')(foundVulnerabilities);
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to Query Vulnerabilities',
        formattedError: err
      },
      'Query Vulnerabilities Failed'
    );

    throw error;
  }
};

module.exports = queryVulnerabilitiesForAllEntities;
