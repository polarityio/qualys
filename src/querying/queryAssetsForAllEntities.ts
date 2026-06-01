import { size, flow, concat, uniqBy } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import { parseErrorToReadableJSON, buildQueryByQueryType } from '../dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ASSET_QUERY_FIELDS = 'id,name,host,createdAt,tags,sourceInfo,activationModules,...';
const limit = 200;

const queryAssetsForAllEntities = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger,
  offset = 0,
  allAssets: any[] = []
): Promise<any[]> => {
  try {
    const assetQuery = buildQueryByQueryType('assets', entities);

    const response = await request.run({
      url: `${options.url}/portal-front/rest/assetview/1.0/assets`,
      qs: {
        havingQuery: assetQuery,
        fields: ASSET_QUERY_FIELDS,
        order: '-updatedAt',
        includeAssets: true,
        limit,
        offset
      }
    });

    const assetsData = (response!.body as any[]) || [];
    const foundAssets = flow(concat(assetsData), uniqBy('id'))(allAssets);

    if (size(assetsData) === 200) {
      return await queryAssetsForAllEntities(
        entities,
        options,
        request,
        Logger,
        offset + limit,
        foundAssets
      );
    }

    return foundAssets;
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      { detail: 'Failed to Query Assets', url: options.url, formattedError: err },
      'Query Assets Failed'
    );
    throw error;
  }
};

export default queryAssetsForAllEntities;
