import { flow, map, first, last, split, uniqBy } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import { splitOutIgnoredIps } from './dataTransformations';
import createLookupResults from './createLookupResults';
import queryHostDetectionListForAllEntities from './querying/queryHostDetectionListForAllEntities';
import queryKnowledgeBaseForAllEntities from './querying/queryKnowledgeBaseForAllEntities';
import queryScanListForAllEntities from './querying/queryScanListForEntities';
import associateDataWithEntities from './associateDataWithEntities';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const extractQidValue = (value: string): string => {
  const match = value.match(/(?:QID|qid)(?:\s*:\s*|\s+)(\d{1,8})/i);
  return match ? match[1] : value.trim();
};

export const extractCustomTypeValue = (value: string, customTypeValueRegex?: string): string => {
  if (customTypeValueRegex && customTypeValueRegex.trim() !== '') {
    try {
      const re = new RegExp(customTypeValueRegex);
      const match = value.match(re);
      if (match) {
        return match[1] !== undefined ? match[1] : match[0];
      }
    } catch (_) {
      // fall through to default digit extraction
    }
  }
  const match = value.match(/\d+$/);
  return match ? match[0] : value.trim();
};

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

    let value = entity.value;
    if (type === 'qid') {
      value = extractQidValue(entity.value);
    } else if (type === 'customType') {
      value = extractCustomTypeValue(
        entity.value,
        options.customTypeValueRegex?.value as string | undefined
      );
    }

    return { ...entity, type, value } as Entity;
  }, entities);

  const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
    entitiesWithCustomTypesSpecified
  );

  const data = await getData(entitiesPartition, options, request, Logger);
  const foundEntities = associateDataWithEntities(entitiesPartition, data);
  const lookupResults = createLookupResults(foundEntities, options);
  return lookupResults.concat(ignoredIpLookupResults);
};

const getData = async (
  entitiesPartition: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any> => {
  // Sequential queries — Qualys enforces concurrent call limits per subscription tier
  const allHostDetections = uniqBy(
    'id',
    await queryHostDetectionListForAllEntities(entitiesPartition, options, request, Logger)
  );

  const allFoundKnowledgeBaseRecords = await queryKnowledgeBaseForAllEntities(
    entitiesPartition,
    options,
    request,
    Logger
  );

  // Scan list: fetch for IP and QID entities (gracefully skipped on failure)
  let allScanResults: any[] = [];
  try {
    allScanResults = await queryScanListForAllEntities(entitiesPartition, options, request, Logger);
  } catch (error) {
    Logger.warn({ error }, 'Scan list query failed — scans tab will be empty');
  }

  Logger.trace(
    { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults },
    'getData results'
  );

  return { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults };
};
