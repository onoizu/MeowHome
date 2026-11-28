// Initialise the schema. Sample records are loaded only by npm run db:seed.
const fs = require("node:fs");
const path = require("node:path");
const { openDatabase, transaction } = require("../server/database");
const filename = path.resolve(__dirname, "..", process.env.DATABASE_FILE || "database/meowhome.sqlite");
const db = openDatabase(filename);
try {
  if (process.argv.includes("--seed")) {
    transaction(db, () => {
      if (db.prepare("SELECT 1 FROM users LIMIT 1").get()) {
        console.log("Database already contains accounts. Existing data was preserved.");
        return;
      }
      db.exec(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));
      console.log("Sample accounts, cats, application and diary added.");
    });
  }
  console.log("Database ready: " + filename);
} finally {
  db.close();
}
