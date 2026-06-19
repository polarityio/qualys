import { map, toLower, filter, flow, replace, includes, concat, uniqBy, flatMap } from 'lodash/fp';
import type { Entity } from '@polarityio/integration-types';

import type { ScanResult } from './querying/queryScanListForEntities';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EntityData {
  allHostDetections: any[];
  allFoundKnowledgeBaseRecords: any[];
  allScanResults: ScanResult[];
}

export interface EntityWithResults {
  entity: Entity;
  results: {
    hostDetections: any[];
    knowledgeBaseRecords: any[];
    scans: any[];
  };
}

const associateDataWithEntities = (
  entities: Entity[],
  { allHostDetections, allFoundKnowledgeBaseRecords, allScanResults }: EntityData
): EntityWithResults[] =>
  map((entity: Entity) => {
    const entityType = (entity as any).type;
    const entityScans = findEntityScans(entity, allScanResults || []);

    // CVE entities: match KB records by _sourceCve tag
    if (entityType === 'cve') {
      const knowledgeBaseRecords = (allFoundKnowledgeBaseRecords || []).filter(
        (kb: any) => kb._sourceCve && kb._sourceCve.toLowerCase() === entity.value.toLowerCase()
      );

      const hostDetections = flow(
        flatMap(({ qid }: any) => getObjectsContainingString(qid, allHostDetections)),
        uniqBy('id')
      )(knowledgeBaseRecords) as any[];

      return { entity, results: { hostDetections, knowledgeBaseRecords, scans: entityScans } };
    }

    // QID / customType entities: match KB records by qid field
    if (entityType === 'qid' || entityType === 'customType') {
      const knowledgeBaseRecords = (allFoundKnowledgeBaseRecords || []).filter(
        (kb: any) => String(kb.qid) === String(entity.value)
      );

      const hostDetections = flow(
        flatMap(({ qid }: any) => getObjectsContainingString(qid, allHostDetections)),
        concat(getObjectsContainingString(entity.value, allHostDetections)),
        uniqBy('id')
      )(knowledgeBaseRecords) as any[];

      return { entity, results: { hostDetections, knowledgeBaseRecords, scans: entityScans } };
    }

    // IP / Domain / IPv6 entities: host detections by text search; no KB records
    const hostDetections = getObjectsContainingString(entity.value, allHostDetections);

    return {
      entity,
      results: { hostDetections, knowledgeBaseRecords: [], scans: entityScans }
    };
  }, entities);

/**
 * Find scan results for a given entity.
 * IPs: match by entityValue
 * QIDs: use the shared '__RECENT__' bucket
 */
const findEntityScans = (entity: Entity, allScanResults: ScanResult[]): any[] => {
  if ((entity as any).isIP || (entity as any).type === 'IPv4' || (entity as any).type === 'IPv6') {
    const entry = allScanResults.find((r) => r.entityValue === entity.value);
    return entry ? entry.scans : [];
  }
  if ((entity as any).type === 'qid' || (entity as any).type === 'customType') {
    const entry = allScanResults.find((r) => r.entityValue === '__RECENT__');
    return entry ? entry.scans : [];
  }
  return [];
};

const getObjectsContainingString = (string: string, objs: any[]): any[] =>
  filter(
    flow(
      JSON.stringify,
      replace(/[^\w]/g, ''),
      toLower,
      includes(flow(replace(/[^\w]/g, ''), toLower)(string))
    ),
    objs || []
  );

export default associateDataWithEntities;
