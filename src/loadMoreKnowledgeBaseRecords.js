const { size, map, flow, get } = require('lodash/fp');
const { parseErrorToReadableJSON } = require('./dataTransformations');
const queryKnowledgeBase = require('./querying/queryKnowledgeBase');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');

const {
  KNOWLEDGE_BASE_QUERY_PAGE_LIMIT,
  KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT,
  HOST_DETECTION_DISPLAY_FORMAT
} = require('./constants');

const getDisplayResults = require('./getDisplayResults');

const loadMoreKnowledgeBaseRecords = async (
  { entity, knowledgeBasePage },
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

    const config = require('../config/config');

    const knowledgeBaseDetections = await queryHostDetectionListForAllEntities(
      map(
        flow(get('qid'), (qid) => ({ type: 'qid', value: qid })),
        knowledgeBaseRecords
      ),
      config,
      requestWithDefaults,
      Logger
    );

    const knowledgeBaseDetectionsDisplayResults = getDisplayResults(
      HOST_DETECTION_DISPLAY_FORMAT,
      knowledgeBaseDetections
    );

    callback(null, {
      knowledgeBaseRecords: knowledgeBaseRecordsDisplayResults,
      hostDetections: knowledgeBaseDetectionsDisplayResults,
      showLoadMoreKnowledgeBaseRecords:
        size(knowledgeBaseRecords) % KNOWLEDGE_BASE_QUERY_PAGE_LIMIT === 0,
      knowledgeBaseRecordCount: size(knowledgeBaseRecords)
    });
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error(
      {
        detail: 'Failed to Loading More KnowledgeBase Records',
        formattedError: err
      },
      'Loading More KnowledgeBase Records Failed'
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
