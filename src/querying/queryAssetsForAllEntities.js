const { getOr, size, flow, concat, uniqBy } = require('lodash/fp');
const {
  parseErrorToReadableJSON,
  buildQueryByQueryType
} = require('../dataTransformations');

const ASSET_QUERY_FIELDS =
  'id,name,host,createdAt,tags,sourceInfo,activationModules,activationModulesPending,' +
  'activationModulesNoProfileFound,activationModulesQueuedManifestGen,updatedAt,' +
  'criticalityScore,isDefaultCriticalityScore,criticalityScoreUpdated,lastVmScanDate,' +
  'lastComplianceScanDate';

const limit = 200;

const queryAssetsForAllEntities = async (
  entities,
  config,
  requestWithDefaults,
  Logger,
  offset = 0,
  allAssets = []
) => {
  try {
    const assetQuery = buildQueryByQueryType('assets', entities);

    const assetsData = getOr(
      [],
      'body',
      await requestWithDefaults({
        uri: `${config.url}/portal-front/rest/assetview/1.0/assets`,
        qs: {
          havingQuery: assetQuery,
          fields: ASSET_QUERY_FIELDS,
          order: '-updatedAt',
          includeAssets: true,
          limit,
          offset
        },
        config
      })
    );

    const foundAssets = flow(concat(assetsData), uniqBy('id'))(allAssets);

    if (size(assetsData) === 200) {
      return await queryAssetsForAllEntities(
        entities,
        options,
        requestWithDefaults,
        Logger,
        offset + limit,
        foundAssets
      );
    }

    return foundAssets;
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to Query Assets',
        options,
        formattedError: err
      },
      'Query Assets Failed'
    );

    throw error;
  }
};

module.exports = queryAssetsForAllEntities;
