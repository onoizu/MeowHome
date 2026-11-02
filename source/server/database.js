// database.js：打开 SQLite、建表和事务。业务查询放在各 routes 文件中。
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
  );
  db.exec(
    fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"),
  );
  db.exec(
    fs.readFileSync(path.join(__dirname, "../database/seed.sql"), "utf8"),
  );
  return db;
}

function transaction(db, work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
module.exports = { openDatabase, transaction };
