// applications.js：领养流程。申请、接受、交接和取消都在事务中检查最新状态。
const express = require("express");
const { randomUUID } = require("node:crypto");
const { requireUser } = require("../auth");
const { transaction } = require("../database");
const V = require("../validation");
function applications(db) {
  const router = express.Router();
  router.use(requireUser);
  function owned(req) {
    const row = db
      .prepare(
        "SELECT a.*,c.ownerId,c.status AS catStatus FROM applications a JOIN cats c ON a.catId=c.id WHERE a.id=?",
      )
      .get(req.params.id);
    if (!row) V.fail("Application not found.", 404);
    if (row.userId !== req.user.id && row.ownerId !== req.user.id)
      V.fail("This application is private.", 403);
    return row;
  }
  router.get("/", (req, res) => {
    const rows = db
      .prepare(
        `SELECT a.*,CASE WHEN a.status IN ('contacting','accepted','completed') THEN u.email ELSE NULL END AS rehomerEmail
      FROM applications a JOIN cats c ON a.catId=c.id JOIN users u ON c.ownerId=u.id
      WHERE a.userId=? OR c.ownerId=? ORDER BY a.created DESC,a.id`,
      )
      .all(req.user.id, req.user.id);
    res.json(rows);
  });
  router.post("/", (req, res) => {
    const input = V.applicationInput(req.body);
    const catId = V.text(req.body.catId, "Cat ID", 1, 80);
    const id = randomUUID();
    transaction(db, () => {
      const cat = db.prepare("SELECT * FROM cats WHERE id=?").get(catId);
      if (!cat) V.fail("Cat listing not found.", 404);
      if (cat.ownerId === req.user.id)
        V.fail("You cannot apply for your own cat.", 403);
      if (cat.status !== "available")
        V.fail("This cat is not currently accepting applications.", 409);
      const duplicate = db
        .prepare(
          "SELECT id FROM applications WHERE catId=? AND userId=? AND status IN ('pending','contacting','accepted','completed')",
        )
        .get(cat.id, req.user.id);
      if (duplicate)
        V.fail("You already have an active application for this cat.", 409);
      db.prepare(
        "INSERT INTO applications(id,catId,userId,name,email,experience,home,reason) VALUES(?,?,?,?,?,?,?,?)",
      ).run(id, cat.id, req.user.id, ...Object.values(input));
    });
    res.status(201).json({ id });
  });
  router.put("/:id", (req, res) => {
    const a = owned(req);
    if (a.userId !== req.user.id)
      V.fail("Only the applicant can edit these details.", 403);
    if (
      !["pending", "contacting"].includes(a.status) ||
      a.catStatus !== "available"
    )
      V.fail("This application can no longer be edited.", 409);
    const d = V.applicationInput(req.body);
    db.prepare(
      "UPDATE applications SET name=?,email=?,experience=?,home=?,reason=? WHERE id=?",
    ).run(...Object.values(d), a.id);
    res.json({ ok: true });
  });
  router.patch("/:id/status", (req, res) => {
    const status = V.choice(
      req.body.status,
      ["contacting", "accepted", "rejected", "withdrawn", "completed"],
      "application status",
    );
    transaction(db, () => {
      const a = owned(req);
      if (status === "withdrawn") {
        if (a.userId !== req.user.id)
          V.fail("Only the applicant can withdraw.", 403);
        if (!["pending", "contacting", "accepted"].includes(a.status))
          V.fail("This application can no longer be withdrawn.", 409);
      } else {
        if (a.ownerId !== req.user.id)
          V.fail("Only the rehomer can review applications.", 403);
        const valid =
          (status === "contacting" &&
            a.status === "pending" &&
            a.catStatus === "available") ||
          (status === "accepted" &&
            ["pending", "contacting"].includes(a.status) &&
            a.catStatus === "available") ||
          (status === "rejected" &&
            ["pending", "contacting", "accepted"].includes(a.status)) ||
          (status === "completed" &&
            a.status === "accepted" &&
            a.catStatus === "reserved");
        if (!valid)
          V.fail("This action is not available for the current status.", 409);
      }
      db.prepare("UPDATE applications SET status=? WHERE id=?").run(
        status,
        a.id,
      );
      if (status === "accepted")
        db.prepare("UPDATE cats SET status='reserved' WHERE id=?").run(a.catId);
      // 交接前双方都可取消已接受申请，猫咪重新开放，不丢失其他申请。
      if (a.status === "accepted" && ["withdrawn", "rejected"].includes(status))
        db.prepare("UPDATE cats SET status='available' WHERE id=?").run(
          a.catId,
        );
      if (status === "completed") {
        db.prepare(
          "UPDATE cats SET status='adopted',adopterId=? WHERE id=?",
        ).run(a.userId, a.catId);
        db.prepare(
          "UPDATE applications SET status='closed' WHERE catId=? AND id<>? AND status IN ('pending','contacting')",
        ).run(a.catId, a.id);
      }
    });
    res.json({ ok: true });
  });
  router.delete("/:id", (req, res) => {
    const a = owned(req);
    if (a.userId !== req.user.id)
      V.fail("Only the applicant can delete this record.", 403);
    if (!["withdrawn", "rejected", "closed"].includes(a.status))
      V.fail("Only inactive applications can be deleted.", 409);
    db.prepare("DELETE FROM applications WHERE id=?").run(a.id);
    res.json({ ok: true });
  });
  return router;
}
module.exports = applications;
