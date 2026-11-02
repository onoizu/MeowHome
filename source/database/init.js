// 初始化是幂等操作，不会删除已有账号或业务数据。
const path = require("node:path");
const { openDatabase } = require("../server/database");
const filename = path.resolve(
  __dirname,
  "..",
  process.env.DATABASE_FILE || "database/meowhome.sqlite",
);
const db = openDatabase(filename);
db.close();
console.log("Database ready: " + filename);
