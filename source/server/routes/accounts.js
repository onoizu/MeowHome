// accounts.js：注册、登录、退出、个人资料和有条件删除账号。
const express = require("express");
const { randomUUID } = require("node:crypto");
const V = require("../validation");
const A = require("../auth");
function accounts(db) {
  const router = express.Router();
  const failures = new Map();
  router.get("/auth/me", (req, res) => res.json(req.user || null));
  router.post("/auth/register", (req, res) => {
    const name = V.text(req.body.name, "Name", 2, 60);
    const email = V.email(req.body.email);
    const password = A.password(req.body.password);
    if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
      V.fail("This email is already registered.", 409);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users(id,name,email,passwordHash) VALUES(?,?,?,?)",
    ).run(id, name, email, A.hashPassword(password));
    A.createSession(db, req, res, id);
    res.status(201).json({ id, name, email });
  });
  router.post("/auth/login", (req, res) => {
    const email = V.email(req.body.email);
    const password = A.password(req.body.password);
    const now = Date.now();
    for (const [key, entry] of failures)
      if (entry.until < now) failures.delete(key);
    const attempt = failures.get(req.ip) || {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    if (attempt.count >= 20)
      V.fail("Too many sign-in attempts. Please try again later.", 429);
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if (!user || !A.checkPassword(password, user.passwordHash)) {
      attempt.count++;
      failures.set(req.ip, attempt);
      V.fail("Email or password is incorrect.", 401);
    }
    failures.delete(req.ip);
    A.createSession(db, req, res, user.id);
    res.json({ id: user.id, name: user.name, email: user.email });
  });
  router.post("/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(
      A.sessionHash(A.readToken(req)),
    );
    res.clearCookie(A.cookieName, { path: "/" });
    res.json({ ok: true });
  });
  router.patch("/profile", A.requireUser, (req, res) => {
    const name = V.text(req.body.name, "Name", 2, 60);
    const email = V.email(req.body.email);
    const other = db
      .prepare("SELECT id FROM users WHERE email=? AND id<>?")
      .get(email, req.user.id);
    if (other) V.fail("This email is already registered.", 409);
    db.prepare("UPDATE users SET name=?,email=? WHERE id=?").run(
      name,
      email,
      req.user.id,
    );
    res.json({ id: req.user.id, name, email });
  });
  router.delete("/profile", A.requireUser, (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
    if (!A.checkPassword(A.password(req.body.password), user.passwordHash))
      V.fail("Password is incorrect.", 403);
    const count = db
      .prepare(
        `SELECT
      (SELECT count(*) FROM cats WHERE ownerId=? OR adopterId=?) +
      (SELECT count(*) FROM applications WHERE userId=?) +
      (SELECT count(*) FROM diaries WHERE userId=?) AS total`,
      )
      .get(user.id, user.id, user.id, user.id).total;
    if (count)
      V.fail(
        "Remove your listings, applications and diaries before deleting this account. Completed adoption records must be kept.",
        409,
      );
    db.prepare("DELETE FROM users WHERE id=?").run(user.id);
    res.clearCookie(A.cookieName, { path: "/" });
    res.json({ ok: true });
  });
  return router;
}
module.exports = accounts;
