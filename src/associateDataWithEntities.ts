import { map, toLower, filter, flow, replace, includes, concat, uniqBy, flatMap } from 'lodash/fp';
import type { Entity } from '@polarityio/integration-types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EntityData {
  allHostDetections: any[];
  allFoundKnowledgeBaseRecords: any[] | undefined;
}

export interface EntityWithResults {
  entity: Entity;
  results: {
    hostDetections: any[];
    knowledgeBaseRecords: any[];
  };
}

const associateDataWithEntities = (
  entities: Entity[],
  { allHostDetections, allFoundKnowledgeBaseRecords }: EntityData
): EntityWithResults[] =>
  map((entity: Entity) => {
    const knowledgeBaseRecords = getObjectsContainingString(
      entity.value,
      allFoundKnowledgeBaseRecords || []
    );
    const hostDetections = flow(
      flatMap(({ qid }: any) => getObjectsContainingString(qid, allHostDetections)),
      concat(getObjectsContainingString(entity.value, allHostDetections)),
      uniqBy('id')
    )(knowledgeBaseRecords);
    return { entity, results: { hostDetections, knowledgeBaseRecords } };
  }, entities);

const getObjectsContainingString = (string: string, objs: any[]): any[] =>
  filter(
    flow(
      JSON.stringify,
      replace(/[^\w]/g, ''),
      toLower,
      includes(flow(replace(/[^\w]/g, ''), toLower)(string))
    ),
    objs
  );

export default associateDataWithEntities;
