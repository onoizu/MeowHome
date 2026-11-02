// preferences.js：当前用户的收藏和接猫清单。
const express = require("express");
const { requireUser } = require("../auth");
const { fail } = require("../validation");
function preferences(db) {
  const router = express.Router();
  router.use(requireUser);
  router.get("/favourites", (req, res) =>
    res.json(
      db
        .prepare("SELECT catId FROM favourites WHERE userId=?")
        .all(req.user.id)
        .map((r) => r.catId),
    ),
  );
  router.put("/favourites/:id", (req, res) => {
    if (!db.prepare("SELECT id FROM cats WHERE id=?").get(req.params.id))
      fail("Cat listing not found.", 404);
    db.prepare(
      "INSERT OR IGNORE INTO favourites(userId,catId) VALUES(?,?)",
    ).run(req.user.id, req.params.id);
    res.json({ ok: true });
  });
  router.delete("/favourites/:id", (req, res) => {
    db.prepare("DELETE FROM favourites WHERE userId=? AND catId=?").run(
      req.user.id,
      req.params.id,
    );
    res.json({ ok: true });
  });
  router.get("/checklist", (req, res) =>
    res.json(
      db
        .prepare("SELECT item FROM checklist WHERE userId=? ORDER BY item")
        .all(req.user.id)
        .map((r) => r.item),
    ),
  );
  router.put("/checklist/:item", (req, res) => {
    const item = Number(req.params.item);
    if (!Number.isInteger(item) || item < 0 || item > 6)
      fail("Invalid checklist item.");
    if (typeof req.body.checked !== "boolean")
      fail("Checked must be true or false.");
    if (req.body.checked)
      db.prepare(
        "INSERT OR IGNORE INTO checklist(userId,item) VALUES(?,?)",
      ).run(req.user.id, item);
    else
      db.prepare("DELETE FROM checklist WHERE userId=? AND item=?").run(
        req.user.id,
        item,
      );
    res.json({ ok: true });
  });
  return router;
}
module.exports = preferences;
