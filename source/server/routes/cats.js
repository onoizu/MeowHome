// cats.js：公开列表和详情；只有送养者可以修改或删除自己的可编辑发布。
const express = require("express");
const { randomUUID } = require("node:crypto");
const { requireUser } = require("../auth");
const { fail, catInput } = require("../validation");
const { saveImage } = require("../images");
function catRow(row) {
  if (!row) return null;
  return {
    ...row,
    beginner: !!row.beginner,
    otherPets: !!row.otherPets,
    tags: [
      row.personality,
      row.beginner ? "First-time friendly" : "Experience preferred",
    ],
  };
}
function cats(db, uploads) {
  const router = express.Router();
  router.get("/", (req, res) => {
    const rows = db
      .prepare(
        "SELECT c.*,u.name AS ownerName FROM cats c JOIN users u ON c.ownerId=u.id ORDER BY c.created DESC,c.id",
      )
      .all();
    res.json(rows.map(catRow));
  });
  router.get("/:id", (req, res) => {
    const cat = db
      .prepare(
        "SELECT c.*,u.name AS ownerName FROM cats c JOIN users u ON c.ownerId=u.id WHERE c.id=?",
      )
      .get(req.params.id);
    if (!cat) fail("Cat listing not found.", 404);
    res.json(catRow(cat));
  });
  router.post("/", requireUser, (req, res) => {
    const input = catInput(req.body);
    const image = saveImage(req.body.image, uploads);
    const id = randomUUID();
    const columns = Object.keys(input);
    db.prepare(
      `INSERT INTO cats(id,ownerId,${columns.join(",")},image) VALUES(${Array(
        columns.length + 3,
      )
        .fill("?")
        .join(",")})`,
    ).run(id, req.user.id, ...Object.values(input), image);
    res.status(201).json({ id });
  });
  router.put("/:id", requireUser, (req, res) => {
    const cat = db.prepare("SELECT * FROM cats WHERE id=?").get(req.params.id);
    if (!cat) fail("Cat listing not found.", 404);
    if (cat.ownerId !== req.user.id)
      fail("Only the rehomer can edit this listing.", 403);
    if (cat.status !== "available")
      fail("A reserved or adopted listing cannot be edited.", 409);
    const input = catInput(req.body);
    const image = saveImage(req.body.image, uploads, [cat.image]);
    const fields = Object.keys(input)
      .map((key) => key + "=?")
      .join(",");
    db.prepare(`UPDATE cats SET ${fields},image=? WHERE id=?`).run(
      ...Object.values(input),
      image,
      cat.id,
    );
    res.json({ ok: true });
  });
  router.delete("/:id", requireUser, (req, res) => {
    const cat = db.prepare("SELECT * FROM cats WHERE id=?").get(req.params.id);
    if (!cat) fail("Cat listing not found.", 404);
    if (cat.ownerId !== req.user.id)
      fail("Only the rehomer can delete this listing.", 403);
    if (cat.status !== "available")
      fail("Reserved and adopted listings must be kept.", 409);
    const active = db
      .prepare(
        "SELECT id FROM applications WHERE catId=? AND status IN ('pending','contacting','accepted','completed')",
      )
      .get(cat.id);
    if (active)
      fail("Resolve incoming applications before deleting this listing.", 409);
    db.prepare("DELETE FROM cats WHERE id=?").run(cat.id);
    res.json({ ok: true });
  });
  return router;
}
module.exports = cats;
