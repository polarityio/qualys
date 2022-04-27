const {
  get,
  getOr,
  map,
  flow,
  compact,
  join,
  includes,
  replace,
  size,
  first,
  values
} = require('lodash/fp');

const {
  parseErrorToReadableJSON,
  processResultWithProcessingFormat,
  processPossibleList,
  xmlToJson
} = require('../dataTransformations');

const { TEMP_TABLE_NAME } = require('../constants');

const QID_PAGE_SIZE = 10000;
const MAX_QID_TO_LOOK_AHEAD = 250000;

const getAndInsertKnowledgeBaseRecords = async (
  knex,
  options,
  requestWithDefaults,
  Logger
) => {
  let id_max = QID_PAGE_SIZE;
  let numberOfEmptyPagesSkipped = 0;
  while (numberOfEmptyPagesSkipped * QID_PAGE_SIZE <= MAX_QID_TO_LOOK_AHEAD) {
    batchMetaData = await getAndInsertKnowledgeBaseRecordsBatch(
      knex,
      options,
      requestWithDefaults,
      Logger,
      id_max,
      numberOfEmptyPagesSkipped
    );
    id_max = batchMetaData.id_max;
    numberOfEmptyPagesSkipped = batchMetaData.numberOfEmptyPagesSkipped;
  }
};
const getAndInsertKnowledgeBaseRecordsBatch = async (
  knex,
  options,
  requestWithDefaults,
  Logger,
  id_max,
  numberOfEmptyPagesSkipped
) => {
  try {
    const responseXml = getOr(
      '',
      'body',
      await requestWithDefaults({
        method: 'POST',
        url: `${options.url}//api/2.0/fo/knowledge_base/vuln/`,
        qs: {
          action: 'list',
          details: 'All',
          id_min: id_max - QID_PAGE_SIZE + 1,
          id_max,
          show_supported_modules_info: 1
        },
        headers: { 'X-Requested-With': 'Polarity' },
        options
      })
    );

    const knowledgeBaseRecords = flow(
      getOr([], 'knowledge_base_vuln_list_output.response.vuln_list.vuln'),
      processPossibleList(false)
    )(await xmlToJson(responseXml, Logger));

    const recordsFormattedForDatabase = map(
      processResultWithProcessingFormat(KNOWLEDGE_BASE_PROCESSING_FORMAT),
      knowledgeBaseRecords
    );

    await knex.batchInsert(TEMP_TABLE_NAME, recordsFormattedForDatabase, 50);

    return {
      id_max: id_max + QID_PAGE_SIZE,
      numberOfEmptyPagesSkipped: size(recordsFormattedForDatabase)
        ? 0
        : numberOfEmptyPagesSkipped + 1
    };
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to Query KnowledgeBase',
        formattedError: err
      },
      'Querying KnowledgeBase Failed'
    );

    throw error;
  }
};


const KNOWLEDGE_BASE_PROCESSING_FORMAT = {
  qid: 'qid',
  title: 'title',
  severity: 'severity_level',
  category: 'category',
  sub_category: {
    path: 'discovery',
    process: (discovery) =>
      flow(
        compact,
        join(', ')
      )([
        get('remote', discovery) == 1 && 'Remote Discovery',
        get('auth_type_list.auth_type', discovery) &&
          `${discovery.auth_type_list.auth_type} Authenticated Discovery`,
        get('additional_info', discovery)
      ])
  },
  patchable: {
    path: 'patchable',
    process: (patchable) => (patchable == 1 ? 'Yes' : 'No')
  },
  virtual_patch_available: {
    path: 'patchable',
    process: (solution) => (includes('Virtual Patch', solution) ? 'Yes' : 'No')
  },
  diagnosis: { path: 'diagnosis', process: replace(/\s+/g, ' ') },
  solution: { path: 'solution', process: replace(/\s+/g, ' ') },
  threat_intelligence: {
    path: 'threat_intelligence.threat_intel',
    process: flow(processPossibleList(false), map(get('value')), join(', '))
  },
  cves: {
    path: 'cve_list.cve',
    process: processPossibleList()
  },
  supported_modules: 'supported_modules',
  bugtraq: {
    path: 'bugtraq_list.bugtraq',
    process: processPossibleList()
  },
  modified: 'last_service_modification_datetime',
  published: 'published_datetime',
  vender_references: {
    path: 'vendor_reference_list.vendor_reference',
    process: processPossibleList()
  }
};

module.exports = getAndInsertKnowledgeBaseRecords;
