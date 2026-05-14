import { size, flow, concat, uniqBy, orderBy } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import { parseErrorToReadableJSON, buildQueryByQueryType } from '../dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

const VULNERABILITIES_QUERY_FIELDS = 'title,id,qid,...';
const limit = 200;

const queryVulnerabilitiesForAllEntities = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger,
  offset = 0,
  allVulnerabilities: any[] = []
): Promise<any[]> => {
  try {
    const vulnerabilitiesQuery = buildQueryByQueryType('vulnerabilities', entities);

    const response = await request.run({
      url: `${options.url}/portal-front/rest/assetview/1.0/assets`,
      qs: {
        havingQuery: vulnerabilitiesQuery,
        fields: VULNERABILITIES_QUERY_FIELDS,
        limit,
        offset
      }
    });

    const vulnerabilitiesData = (response!.body as any[]) || [];
    const foundVulnerabilities = flow(
      concat(vulnerabilitiesData),
      uniqBy('id')
    )(allVulnerabilities);

    if (size(vulnerabilitiesData) === 200) {
      return await queryVulnerabilitiesForAllEntities(
        entities,
        options,
        request,
        Logger,
        offset + limit,
        foundVulnerabilities
      );
    }

    return orderBy('lastDetected.iMillis', 'desc')(foundVulnerabilities);
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      { detail: 'Failed to Query Vulnerabilities', formattedError: err },
      'Query Vulnerabilities Failed'
    );
    throw error;
  }
};

export default queryVulnerabilitiesForAllEntities;
