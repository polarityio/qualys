const { size } = require('lodash/fp');
const { parseErrorToReadableJSON } = require('./dataTransformations');
const queryKnowledgeBase = require('./querying/queryKnowledgeBase');
const {
  KNOWLEDGE_BASE_QUERY_PAGE_LIMIT,
  KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT
} = require('./constants');

const getDisplayResults = require('./getDisplayResults');

const loadMoreKnowledgeBaseRecords = async (
  { entity, knowledgeBasePage, knowledgeBaseRecordCount },
  getKnex,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const knex = await getKnex();

    const knowledgeBaseRecords = await queryKnowledgeBase(
      [entity],
      knex,
      Logger,
      knowledgeBasePage
    );

    const knowledgeBaseRecordsDisplayResults = getDisplayResults(
      KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT,
      knowledgeBaseRecords
    );

    callback(null, {
      knowledgeBaseRecords: knowledgeBaseRecordsDisplayResults,
      showLoadMoreKnowledgeBaseRecords:
        size(knowledgeBaseRecords) % KNOWLEDGE_BASE_QUERY_PAGE_LIMIT === 0,
      knowledgeBaseRecordCount: size(knowledgeBaseRecords)
    });
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to Loading More Knowledge Base Records',
        options,
        formattedError: err
      },
      'Loading More Knowledge Base Records Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail: err
        }
      ]
    });
  }
};

module.exports = loadMoreKnowledgeBaseRecords;
