import { get, map, flow, filter, eq, uniqBy, join, size } from 'lodash/fp';
import type { Entity, Logger } from '@polarityio/integration-types';
import type { PolarityRequest } from 'polarity-integration-utils';

import {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson,
  or
} from '../dataTransformations';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Query the Qualys KnowledgeBase API for CVE and QID entities.
 *
 * CVE → POST /api/4.0/fo/knowledge_base/vuln/index.php?action=list&cve={id}&details=All
 * QID → POST /api/4.0/fo/knowledge_base/vuln/index.php?action=list&ids={qid}&details=All
 */
const queryKnowledgeBaseForAllEntities = async (
  entities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  const cveEntities = filter(flow(get('type'), eq('cve')), entities) as Entity[];
  const qidEntities = filter(
    flow(get('type'), or(eq('qid'), eq('customQid'))),
    entities
  ) as Entity[];
  const qidValues = map(get('value'), qidEntities) as string[];

  const kbResultsForCves = size(cveEntities)
    ? await queryKnowledgeBaseByCve(cveEntities, options, request, Logger)
    : [];

  const kbResultsForQids = size(qidValues)
    ? await queryKnowledgeBaseByQid(qidValues, options, request, Logger)
    : [];

  return uniqBy('qid', kbResultsForCves.concat(kbResultsForQids));
};

const queryKnowledgeBaseByCve = async (
  cveEntities: Entity[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  const results: any[] = [];

  for (const entity of cveEntities) {
    const records = await queryKnowledgeBase({ cve: entity.value }, options, request, Logger);
    records.forEach((r: any) => {
      r._sourceCve = entity.value;
    });
    results.push(...records);
  }

  return results;
};

const queryKnowledgeBaseByQid = async (
  qidValues: string[],
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  return await queryKnowledgeBase({ ids: join(',', qidValues) }, options, request, Logger);
};

const queryKnowledgeBase = async (
  filterParams: Record<string, string>,
  options: Record<string, any>,
  request: PolarityRequest,
  Logger: Logger
): Promise<any[]> => {
  try {
    const response = await request.run({
      method: 'POST',
      url: `${options.url}/api/4.0/fo/knowledge_base/vuln/index.php`,
      qs: {
        action: 'list',
        details: 'All',
        ...filterParams
      },
      headers: { 'X-Requested-With': 'Polarity' },
      json: false
    });

    const responseXml = (response!.body as string) || '';
    const json = await xmlToJson(responseXml, Logger);

    const vulns = flow(
      get('knowledge_base_vuln_list_output.response.vuln_list.vuln'),
      processPossibleList(false)
    )(json) as any[] | null;

    if (!vulns || !vulns.length) return [];

    return map(processResultWithProcessingFormat(KB_RECORD_FORMAT), vulns);
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      { detail: 'Failed to Query KnowledgeBase', filterParams, formattedError: err },
      'KnowledgeBase Query Failed'
    );
    throw error;
  }
};

const KB_RECORD_FORMAT: Record<string, any> = {
  qid: 'qid',
  vuln_type: 'vuln_type',
  severity: 'severity_level',
  title: 'title',
  category: 'category',
  patchable: {
    path: 'patchable',
    process: (v: any) => (v == 1 ? 'Yes' : 'No')
  },
  published: 'published_datetime',
  modified: 'last_service_modification_datetime',
  cves: {
    path: 'cve_list',
    process: (cveList: any) => {
      if (!cveList) return null;
      const items = processPossibleList(false)(cveList.cve || cveList) as any[];
      return JSON.stringify((items || []).map((c: any) => ({ id: c.id || c, url: c.url || null })));
    }
  },
  cvss_base: 'cvss.base',
  cvss_temporal: 'cvss.temporal',
  cvss_v3_base: 'cvss_v3.cvss3_base',
  cvss_v3_temporal: 'cvss_v3.cvss3_temporal',
  threat_intelligence: {
    path: 'threat_intelligence',
    process: (ti: any) => {
      if (!ti) return null;
      const items = processPossibleList(false)(ti.threat_intel || ti) as any[];
      return (items || []).map((t: any) => t.value || t).join(', ') || null;
    }
  },
  diagnosis: 'diagnosis',
  consequence: 'consequence',
  solution: 'solution'
};

export default queryKnowledgeBaseForAllEntities;
