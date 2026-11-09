// cats.js：公开列表和详情；只有送养者可以修改或删除自己的可编辑发布。
const express = require("express");
const { randomUUID } = require("node:crypto");
const { requireUser } = require("../auth");
const { fail, catInput } = require("../validation");
const { saveImage, deleteUnusedImage } = require("../images");
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
function listOptions(query) {
  const readInteger = (value, fallback, label) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value))
      fail(`${label} must be a positive integer.`);
    const number = Number(value);
    if (!Number.isSafeInteger(number))
      fail(`${label} must be a positive integer.`);
    return number;
  };
  const readText = (value, label, max) => {
    if (value === undefined) return "";
    if (typeof value !== "string" || value.length > max)
      fail(`${label} is invalid.`);
    return value;
  };
  const page = readInteger(query.page, 1, "Page");
  const limit = readInteger(query.limit, 6, "Page size");
  const age = readText(query.age, "Age filter", 20);
  const sort = readText(query.sort, "Sort order", 20) || "newest";
  if (!Number.isSafeInteger(page) || page < 1)
    fail("Page must be a positive integer.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    fail("Page size must be between 1 and 50.");
  if (!["", "Male", "Female"].includes(readText(query.gender, "Gender", 20)))
    fail("Please choose a valid gender.");
  if (
    !["", "Kowloon", "Hong Kong Island", "New Territories"].includes(
      readText(query.location, "Location", 40),
    )
  )
    fail("Please choose a valid location.");
  const breed = readText(query.breed, "Breed", 80);
  if (!["", "kitten", "adult", "senior"].includes(age))
    fail("Please choose a valid age filter.");
  if (!["newest", "youngest", "oldest", "name"].includes(sort))
    fail("Please choose a valid sort order.");
  const q = readText(query.q, "Search query", 100).trim();
  return {
    page,
    limit,
    age,
    sort,
    q,
    breed,
    gender: query.gender || "",
    location: query.location || "",
  };
}
function cats(db, uploads) {
  const router = express.Router();
  router.get("/", (req, res) => {
    if (Object.keys(req.query).length === 0) {
      const rows = db
        .prepare(
          "SELECT c.*,u.name AS ownerName FROM cats c JOIN users u ON c.ownerId=u.id ORDER BY c.created DESC,c.id",
        )
        .all();
      return res.json(rows.map(catRow));
    }
    const options = listOptions(req.query);
    const conditions = ["c.status='available'"];
    const values = [];
    if (options.breed) {
      conditions.push("c.breed=?");
      values.push(options.breed);
    }
    if (options.gender) {
      conditions.push("c.gender=?");
      values.push(options.gender);
    }
    if (options.location) {
      conditions.push("c.location=?");
      values.push(options.location);
    }
    if (options.age === "kitten") conditions.push("c.months < 12");
    if (options.age === "adult")
      conditions.push("c.months >= 12 AND c.months < 84");
    if (options.age === "senior") conditions.push("c.months >= 84");
    if (options.q) {
      const escaped = options.q.replace(/[\\%_]/g, "\\$&").toLowerCase();
      conditions.push(
        `LOWER(c.name || ' ' || c.breed || ' ' || c.personality || ' ' ||
          CASE WHEN c.beginner=1 THEN 'First-time friendly' ELSE 'Experience preferred' END)
          LIKE ? ESCAPE '\\'`,
      );
      values.push(`%${escaped}%`);
    }
    const where = conditions.join(" AND ");
    const total = db
      .prepare(`SELECT count(*) AS total FROM cats c WHERE ${where}`)
      .get(...values).total;
    const pages = Math.max(1, Math.ceil(total / options.limit));
    const page = Math.min(options.page, pages);
    const orderBy = {
      newest: "c.created DESC,c.id",
      youngest: "c.months ASC,c.created DESC,c.id",
      oldest: "c.months DESC,c.created DESC,c.id",
      name: "c.name COLLATE NOCASE ASC,c.id",
    }[options.sort];
    const rows = db
      .prepare(
        `SELECT c.*,u.name AS ownerName FROM cats c
         JOIN users u ON c.ownerId=u.id WHERE ${where}
         ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      )
      .all(...values, options.limit, (page - 1) * options.limit);
    res.json({
      items: rows.map(catRow),
      total,
      page,
      pageSize: options.limit,
      pages,
    });
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
  router.put("/:id", requireUser, async (req, res) => {
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
    if (image !== cat.image)
      await deleteUnusedImage(db, cat.image, uploads);
    res.json({ ok: true });
  });
  router.delete("/:id", requireUser, async (req, res) => {
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
    await deleteUnusedImage(db, cat.image, uploads);
    res.json({ ok: true });
  });
  return router;
}
module.exports = cats;
