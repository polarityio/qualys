const { getOr, map, flow, join, flatten, uniqBy } = require('lodash/fp');

const {
  TABLE_NAME,
  SEARCH_COLUMN_NAMES_BY_TYPE,
  KNOWLEDGE_BASE_QUERY_PAGE_LIMIT
} = require('../constants');

const queryKnowledgeBase = async (entities, knex, Logger, page = 0) =>
  flow(
    flatten,
    uniqBy('qid')
  )(await Promise.all(map(getEntityQueryResults(knex, page), entities)));

const getEntityQueryResults = (knex, page) => async (entity) =>
  flow(
    getOr(SEARCH_COLUMN_NAMES_BY_TYPE['default'], entity.type),
    map((columnName) => `${columnName} LIKE '%${entity.value}%'`),
    join(' OR '),
    (whereClause) => `
      SELECT *
      FROM ${TABLE_NAME}
      WHERE ${whereClause}
      ORDER BY title ASC
      LIMIT ${KNOWLEDGE_BASE_QUERY_PAGE_LIMIT}
      OFFSET  ${KNOWLEDGE_BASE_QUERY_PAGE_LIMIT * page};
    `,
    async (searchSql) => await knex.raw(searchSql)
  )(SEARCH_COLUMN_NAMES_BY_TYPE);

module.exports = queryKnowledgeBase;