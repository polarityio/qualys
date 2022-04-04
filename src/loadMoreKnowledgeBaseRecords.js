const { size, map, flow, get, findIndex, split, last, trim, add } = require('lodash/fp');
const { parseErrorToReadableJSON } = require('./dataTransformations');
const queryKnowledgeBase = require('./querying/queryKnowledgeBase');
const queryHostDetectionListForAllEntities = require('./querying/queryHostDetectionListForAllEntities');

const {
  KNOWLEDGE_BASE_QUERY_PAGE_LIMIT,
  KNOWLEDGE_BASE_RECORD_DISPLAY_FORMAT,
  HOST_DETECTION_DISPLAY_FORMAT
} = require('./constants');

const getDisplayResults = require('./getDisplayResults');
const { includes, parseInt } = require('lodash');

const loadMoreKnowledgeBaseRecords = async (
  { entity, knowledgeBasePage, summary },
  { shouldDeepSearchForAssets },
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

    let knowledgeBaseDetectionsDisplayResults, newSummaryTags;
    if (shouldDeepSearchForAssets) {
      const knowledgeBaseDetections = await queryHostDetectionListForAllEntities(
        map(
          flow(get('qid'), (qid) => ({ type: 'qid', value: qid })),
          knowledgeBaseRecords
        ),
        config,
        requestWithDefaults,
        Logger
      );

      knowledgeBaseDetectionsDisplayResults = getDisplayResults(
        HOST_DETECTION_DISPLAY_FORMAT,
        knowledgeBaseDetections
      );
      if (size(knowledgeBaseDetections)) {
        const summaryTagIndex = findIndex(includes('Host Detections'), summary);
        if (summaryTagIndex !== -1) {
          const newCount = flow(
            get(summaryTagIndex),
            split(':'),
            last,
            trim,
            parseInt,
            add(size(knowledgeBaseDetections))
          )(summary);
          newSummaryTags = summary.map((tag, index) => index === summaryTagIndex ? `Host Detections: ${newCount}` : tag)
        } else {
          newSummaryTags = summary.concat(
            `Host Detections: ${size(knowledgeBaseDetections)}`
          );
        }
      }
    }
    callback(null, {
      knowledgeBaseRecords: knowledgeBaseRecordsDisplayResults,
      hostDetections: knowledgeBaseDetectionsDisplayResults,
      showLoadMoreKnowledgeBaseRecords:
        size(knowledgeBaseRecords) % KNOWLEDGE_BASE_QUERY_PAGE_LIMIT === 0,
      knowledgeBaseRecordCount: size(knowledgeBaseRecords),
      newSummaryTags
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
