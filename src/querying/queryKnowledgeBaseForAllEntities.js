'use strict';

const { get, getOr, map, flow, filter, eq, join, cond, size, uniqBy } = require('lodash/fp');

const {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson,
  or
} = require('../dataTransformations');

/**
 * Query the Qualys KnowledgeBase API for CVE and QID entities.
 *
 * CVE  → POST /api/4.0/fo/knowledge_base/vuln/index.php?action=list&cve={id}&details=All
 * QID  → POST /api/4.0/fo/knowledge_base/vuln/index.php?action=list&ids={qid}&details=All
 *
 * Returns an array of parsed KB vulnerability records.
 */
const queryKnowledgeBaseForAllEntities = async (
  entities,
  options,
  requestWithDefaults,
  Logger
) => {
  const kbResultsForCves = await flow(
    filter(flow(get('type'), eq('cve'))),
    cond([[size, queryKnowledgeBaseByFilter('cve', options, requestWithDefaults, Logger)]])
  )(entities);

  const kbResultsForQids = await flow(
    filter(flow(get('type'), eq('qid'))),
    map(get('value')),
    cond([[size, queryKnowledgeBaseByFilter('ids', options, requestWithDefaults, Logger)]])
  )(entities);

  return uniqBy('qid', (kbResultsForCves || []).concat(kbResultsForQids || []));
};

/**
 * For CVE entities, query one-at-a-time to map each CVE to its KB records.
 * For QID entities, pass comma-joined IDs in one call.
 */
const queryKnowledgeBaseByFilter =
  (filterType, options, requestWithDefaults, Logger) => async (entityValuesOrEntities) => {
    const isCveMode = filterType === 'cve';
    const results = [];

    if (isCveMode) {
      // Query one CVE at a time so we can associate results back to the entity
      for (const entity of entityValuesOrEntities) {
        const records = await _queryKnowledgeBase(
          { cve: entity.value },
          options,
          requestWithDefaults,
          Logger
        );
        // Tag each KB record with the originating CVE value for association
        records.forEach((r) => {
          r._sourceCve = entity.value;
        });
        results.push(...records);
      }
    } else {
      // QID — batch all in one call
      const records = await _queryKnowledgeBase(
        { ids: join(',', entityValuesOrEntities) },
        options,
        requestWithDefaults,
        Logger
      );
      results.push(...records);
    }

    return results;
  };

const _queryKnowledgeBase = async (filterParams, options, requestWithDefaults, Logger) => {
  try {
    const responseXml = getOr(
      '',
      'body',
      await requestWithDefaults({
        method: 'POST',
        url: `${options.url}/api/4.0/fo/knowledge_base/vuln/index.php`,
        qs: {
          action: 'list',
          details: 'All',
          ...filterParams
        },
        headers: { 'X-Requested-With': 'Polarity' },
        options
      })
    );

    const json = await xmlToJson(responseXml, Logger);

    const vulns = flow(
      get('knowledge_base_vuln_list_output.response.vuln_list.vuln'),
      processPossibleList(false)
    )(json);

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

// Maps raw XML-parsed KB vuln fields to display-ready shape
const KB_RECORD_FORMAT = {
  qid: 'qid',
  vuln_type: 'vuln_type',
  severity: 'severity_level',
  title: 'title',
  category: 'category',
  patchable: {
    path: 'patchable',
    process: (v) => (v == 1 ? 'Yes' : 'No')
  },
  published: 'published_datetime',
  modified: 'last_service_modification_datetime',
  cves: {
    path: 'cve_list',
    process: (cveList) => {
      if (!cveList) return null;
      const items = processPossibleList(false)(cveList.cve || cveList);
      return JSON.stringify(
        (items || []).map((c) => ({ name: c.id || c, url: c.url || null }))
      );
    }
  },
  cvss_base: 'cvss.base',
  cvss_temporal: 'cvss.temporal',
  cvss_v3_base: 'cvss_v3.cvss3_base',
  cvss_v3_temporal: 'cvss_v3.cvss3_temporal',
  threat_intelligence: {
    path: 'threat_intelligence',
    process: (ti) => {
      if (!ti) return null;
      const items = processPossibleList(false)(ti.threat_intel || ti);
      return (items || []).map((t) => t.value || t).join(', ') || null;
    }
  },
  diagnosis: 'diagnosis',
  consequence: 'consequence',
  solution: 'solution'
};

module.exports = queryKnowledgeBaseForAllEntities;
