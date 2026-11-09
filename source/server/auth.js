// auth.js：密码哈希、数据库 Session 和登录检查。浏览器只保存 HttpOnly cookie。
const crypto = require("node:crypto");
const { fail } = require("./validation");
const cookieName = "meowhome_session";
const duration = 7 * 24 * 60 * 60 * 1000;
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const result = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), result);
}
function sessionHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function readToken(req) {
  const part = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookieName + "="));
  return part ? part.slice(cookieName.length + 1) : "";
}
function createSession(db, req, res, userId) {
  const old = readToken(req);
  if (old)
    db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(
      sessionHash(old),
    );
  db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions(tokenHash,userId,expires) VALUES(?,?,?)",
  ).run(sessionHash(token), userId, Date.now() + duration);
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: duration,
    path: "/",
  });
}
function loadUser(db) {
  return (req, res, next) => {
    const token = readToken(req);
    req.user = token
      ? db
          .prepare(
            `SELECT u.id,u.name,u.email,u.avatar FROM sessions s JOIN users u ON u.id=s.userId WHERE s.tokenHash=? AND s.expires>?`,
          )
          .get(sessionHash(token), Date.now())
      : null;
    next();
  };
}
function requireUser(req, res, next) {
  if (!req.user)
    return next(
      Object.assign(new Error("Please sign in first."), { status: 401 }),
    );
  next();
}
function password(value) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128)
    fail("Password must contain 8-128 characters.");
  return value;
}
module.exports = {
  hashPassword,
  checkPassword,
  createSession,
  loadUser,
  requireUser,
  password,
  readToken,
  sessionHash,
  cookieName,
};
