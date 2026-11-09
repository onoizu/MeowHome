// diaries.js：公开日记和作者自己的私密日记；只有完成领养的人可以写对应猫咪的日记。
const express = require("express");
const { randomUUID } = require("node:crypto");
const { requireUser } = require("../auth");
const V = require("../validation");
const { saveImage, deleteUnusedImage } = require("../images");
function diaries(db, uploads) {
  const router = express.Router();
  router.get("/", (req, res) => {
    const rows = db
      .prepare(
        "SELECT d.*,u.name AS author FROM diaries d JOIN users u ON d.userId=u.id WHERE d.public=1 OR d.userId=? ORDER BY d.created DESC,d.id",
      )
      .all(req.user?.id || "");
    res.json(rows.map((row) => ({ ...row, public: !!row.public })));
  });
  function input(req, existing) {
    const catId = V.text(req.body.catId, "Cat ID", 1, 80);
    const cat = db.prepare("SELECT * FROM cats WHERE id=?").get(catId);
    if (!cat || cat.adopterId !== req.user.id || cat.status !== "adopted")
      V.fail("You can write a diary after a completed adoption.", 403);
    if (existing && existing.catId !== cat.id)
      V.fail("The cat linked to this diary cannot be changed.");
    const title = V.text(req.body.title, "Title", 1, 90);
    const text = V.text(req.body.text, "Diary update", 15, 5000);
    const visibility = V.boolean(req.body.public, "Diary visibility");
    const image = saveImage(req.body.image, uploads, [
      cat.image,
      ...(existing ? [existing.image] : []),
    ]);
    return { catId: cat.id, title, text, image, public: visibility };
  }
  router.post("/", requireUser, (req, res) => {
    const d = input(req);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO diaries(id,userId,catId,title,text,image,public) VALUES(?,?,?,?,?,?,?)",
    ).run(id, req.user.id, ...Object.values(d));
    res.status(201).json({ id });
  });
  router.put("/:id", requireUser, async (req, res) => {
    const existing = db
      .prepare("SELECT * FROM diaries WHERE id=?")
      .get(req.params.id);
    if (!existing) V.fail("Diary not found.", 404);
    if (existing.userId !== req.user.id)
      V.fail("Only the author can edit this diary.", 403);
    const d = input(req, existing);
    db.prepare(
      "UPDATE diaries SET catId=?,title=?,text=?,image=?,public=? WHERE id=?",
    ).run(...Object.values(d), existing.id);
    if (d.image !== existing.image)
      await deleteUnusedImage(db, existing.image, uploads);
    res.json({ ok: true });
  });
  router.delete("/:id", requireUser, async (req, res) => {
    const story = db
      .prepare("SELECT userId,image FROM diaries WHERE id=?")
      .get(req.params.id);
    if (!story) V.fail("Diary not found.", 404);
    if (story.userId !== req.user.id)
      V.fail("Only the author can delete this diary.", 403);
    db.prepare("DELETE FROM diaries WHERE id=?").run(req.params.id);
    await deleteUnusedImage(db, story.image, uploads);
    res.json({ ok: true });
  });
  return router;
}
module.exports = diaries;
