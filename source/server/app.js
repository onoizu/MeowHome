// app.js：配置 Express、中间件和路由；不在这里编写业务流程。
const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const { openDatabase } = require("./database");
const { loadUser } = require("./auth");
const source = path.join(__dirname, "..");
function createApp(options = {}) {
  const filename =
    options.database ||
    path.resolve(
      source,
      process.env.DATABASE_FILE || "database/meowhome.sqlite",
    );
  const uploads =
    options.uploads ||
    path.resolve(source, process.env.UPLOAD_DIRECTORY || "database/uploads");
  fs.mkdirSync(uploads, { recursive: true });
  const db = openDatabase(filename);
  const app = express();
  const publicOrigin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null;
  app.locals.publicOrigin = publicOrigin;
  app.disable("x-powered-by");
  app.locals.db = db;
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-Requested-With") !== "MeowHome")
        return res.status(403).json({ error: "Invalid request source." });
      const origin = req.get("Origin");
      if (origin && origin !== (publicOrigin || `${req.protocol}://${req.get("host")}`))
        return res.status(403).json({ error: "Invalid request origin." });
      if (!req.is("application/json"))
        return res.status(415).json({ error: "Please send JSON data." });
    }
    next();
  });
  app.use(
    "/api",
    express.json({ limit: "8mb" }),
    (req, res, next) => {
      if (req.body === undefined) req.body = {};
      if (
        req.body === null ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      )
        return res.status(400).json({ error: "Invalid JSON object." });
      next();
    },
    loadUser(db),
  );
  app.use("/api", require("./routes/accounts")(db, uploads));
  app.use("/api/cats", require("./routes/cats")(db, uploads));
  app.use("/api/applications", require("./routes/applications")(db));
  app.use("/api/stories", require("./routes/diaries")(db, uploads));
  app.use("/api", require("./routes/preferences")(db));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );
  app.get("/uploads/:filename", loadUser(db), (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const filename = req.params.filename;
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return res.sendStatus(404);
    const image = "/uploads/" + filename;
    const visible = db.prepare(`
      SELECT 1 FROM cats WHERE image = ?
      UNION ALL SELECT 1 FROM users WHERE avatar = ?
      UNION ALL SELECT 1 FROM diaries WHERE image = ? AND (public = 1 OR userId = ?)
      LIMIT 1
    `).get(image, image, image, req.user?.id || "");
    if (!visible) return res.sendStatus(404);
    res.sendFile(filename, { root: uploads, cacheControl: false });
  });
  app.use(express.static(path.join(source, "client")));
  app.use((error, req, res, next) => {
    let status = error.status || 500;
    if (
      error.code?.startsWith("SQLITE_CONSTRAINT") ||
      error.message?.includes("UNIQUE constraint failed")
    )
      status = 409;
    if (status === 500) console.error(error);
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "The server could not complete this request."
            : status === 413
              ? "The photograph is too large."
              : status === 409 && !error.status
                ? "This record conflicts with an existing record."
                : error.message,
      });
  });
  return app;
}
module.exports = { createApp };
