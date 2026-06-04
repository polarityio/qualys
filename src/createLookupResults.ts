import { flow, map, size, some, identity, keys, assign } from 'lodash/fp';
import type { Entity } from '@polarityio/integration-types';
import type { LookupResult } from '@polarityio/integration-types';

import {
  HOST_DETECTION_DISPLAY_FORMAT,
  KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT,
  CVE_DISPLAY_FORMAT,
  SCAN_DISPLAY_FORMAT
} from './constants';
import getDisplayResults from './getDisplayResults';
import type { EntityWithResults } from './associateDataWithEntities';

/* eslint-disable @typescript-eslint/no-explicit-any */

const createLookupResults = (
  foundEntities: EntityWithResults[],
  options: Record<string, any> = {}
): LookupResult[] =>
  map(({ entity, results }: EntityWithResults) => {
    const formattedQueryResult = formatQueryResult(results, entity, options);
    const lookupResult: LookupResult = {
      entity,
      displayValue: (entity.type as string) === 'qid' ? `QID: ${entity.value}` : entity.value,
      data: formattedQueryResult
        ? {
            summary: createSummary(entity, results),
            details: flow(
              keys,
              (k: string[]) => k.filter((key) => !key.startsWith('_')),
              (k: string[]) => assign(formattedQueryResult, { tabKeys: k })
            )(formattedQueryResult)
          }
        : null
    };
    return lookupResult;
  }, foundEntities);

const createSummary = (
  entity: Entity,
  { hostDetections, knowledgeBaseRecords, scans }: EntityWithResults['results']
): string[] => {
  const summary: string[] = [];
  if (size(hostDetections)) summary.push(`Host Detections: ${size(hostDetections)}`);
  if (size(knowledgeBaseRecords)) summary.push(`KB Records: ${size(knowledgeBaseRecords)}`);
  if (size(scans)) summary.push(`Scans: ${size(scans)}`);
  return summary;
};

const formatQueryResult = (
  result: EntityWithResults['results'],
  entity: Entity,
  options: Record<string, any>
): Record<string, any> | undefined => {
  const hasData =
    size(result.hostDetections) > 0 ||
    size(result.knowledgeBaseRecords) > 0 ||
    size(result.scans) > 0;

  if (!hasData) return undefined;

  const formatted: Record<string, any> = {};

  if (size(result.hostDetections)) {
    formatted.hostDetections = getDisplayResults(
      HOST_DETECTION_DISPLAY_FORMAT,
      result.hostDetections
    );
  }

  if (size(result.knowledgeBaseRecords)) {
    const isCve = (entity as any).type === 'cve';
    const displayFormat = isCve ? CVE_DISPLAY_FORMAT : KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT;
    formatted.knowledgeBaseRecords = getDisplayResults(displayFormat, result.knowledgeBaseRecords);
  }

  if (size(result.scans)) {
    formatted.scans = getDisplayResults(SCAN_DISPLAY_FORMAT, result.scans);
    // Pass scan launch capability info for the web component
    formatted._scanMeta = {
      enableScanLaunch: !!options.enableScanLaunch,
      entityValue: entity.value,
      entityType: (entity as any).type
    };
  }

  return formatted;
};

export default createLookupResults;
