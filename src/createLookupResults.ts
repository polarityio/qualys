import { flow, map, size, mapValues, some, identity, keys, assign } from 'lodash/fp';
import type { Entity } from '@polarityio/integration-types';
import type { LookupResult } from '@polarityio/integration-types';

import { HOST_DETECTION_DISPLAY_FORMAT } from './constants';
import getDisplayResults from './getDisplayResults';
import type { EntityWithResults } from './associateDataWithEntities';

/* eslint-disable @typescript-eslint/no-explicit-any */

const createLookupResults = (foundEntities: EntityWithResults[]): LookupResult[] =>
  map(({ entity, results }: EntityWithResults) => {
    const formattedQueryResult = formatQueryResult(results);
    const lookupResult: LookupResult = {
      entity,
      displayValue: (entity.type as string) === 'qid' ? `QID: ${entity.value}` : entity.value,
      data: formattedQueryResult
        ? {
            summary: createSummary(entity, results),
            details: flow(keys, (k: string[]) => assign(formattedQueryResult, { tabKeys: k }))(
              formattedQueryResult
            )
          }
        : null
    };
    return lookupResult;
  }, foundEntities);

const createSummary = (
  _entity: Entity,
  { hostDetections }: { hostDetections: any[]; knowledgeBaseRecords: any[] }
): string[] =>
  ([] as string[]).concat(size(hostDetections) ? `Host Detections: ${size(hostDetections)}` : []);

const formatQueryResult = (result: {
  hostDetections: any[];
  knowledgeBaseRecords: any[];
}): Record<string, any> | undefined => {
  const resultNotEmpty = flow(mapValues(size), some(identity))(result);
  if (resultNotEmpty) {
    const hostDetections = getDisplayResults(HOST_DETECTION_DISPLAY_FORMAT, result.hostDetections);
    return { hostDetections };
  }
};

export default createLookupResults;
