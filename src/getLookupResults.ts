import { flow, map, split, first, last, trim, uniqBy } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import { splitOutIgnoredIps } from './dataTransformations';
import createLookupResults from './createLookupResults';
import queryHostDetectionListForAllEntities from './querying/queryHostDetectionListForAllEntities';
import associateDataWithEntities from './associateDataWithEntities';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const getLookupResults = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  const entitiesWithCustomTypesSpecified: Entity[] = map((entity: Entity) => {
    const type: string =
      entity.type === 'custom'
        ? (flow(first, split('.'), last)(entity.types) as string)
        : entity.type;
    const value =
      type === 'qid' ? (flow(split(':'), last, trim)(entity.value) as string) : entity.value;

    return { ...entity, type, value } as Entity;
  }, entities);

  const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
    entitiesWithCustomTypesSpecified
  );

  const data = await getData(entitiesPartition, options, request, Logger);
  const foundEntities = associateDataWithEntities(entitiesPartition, data);
  const lookupResults = createLookupResults(foundEntities);
  return lookupResults.concat(ignoredIpLookupResults);
};

const getData = async (
  entitiesPartition: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any> => {
  const [initialHostDetections] = await Promise.all([
    queryHostDetectionListForAllEntities(entitiesPartition, options, request, Logger)
  ]);

  const allHostDetections = flow(uniqBy('id'))(initialHostDetections);
  Logger.trace({ allHostDetections }, 'All Host Detections');

  return { allHostDetections, allFoundKnowledgeBaseRecords: undefined };
};
