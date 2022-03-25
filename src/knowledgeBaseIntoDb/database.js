const { TEMP_TABLE_NAME, TABLE_NAME } = require('../constants');

const SQL_DROP_TABLE = (tableName) => `DROP TABLE IF EXISTS ${tableName};`;

const createSchema = async (knex, Logger) => {
  await knex.raw('PRAGMA journal_mode=OFF');

  await knex.raw(SQL_DROP_TABLE(TEMP_TABLE_NAME));

  await knex.raw(
    `CREATE TABLE ${TEMP_TABLE_NAME} (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      qid TEXT NOT NULL UNIQUE,
      title TEXT,
      severity TEXT,
      category TEXT,
      sub_category TEXT,
      patchable TEXT,
      virtual_patch_available TEXT,
      diagnosis TEXT,
      solution TEXT,
      threat_intelligence TEXT,
      cves TEXT,
      supported_modules TEXT,
      bugtraq TEXT,
      modified TEXT,
      published TEXT,
      vender_references TEXT
    );`
  );
};

const cleanUpTempTable = async (knex, Logger) => {
  await knex.raw(SQL_DROP_TABLE(TABLE_NAME));
  await knex.raw(`ALTER TABLE ${TEMP_TABLE_NAME} RENAME TO ${TABLE_NAME};`);
  await knex.raw(SQL_DROP_TABLE(TEMP_TABLE_NAME));
  await knex.raw('VACUUM;');
};

module.exports = {
  createSchema,
  cleanUpTempTable
};
