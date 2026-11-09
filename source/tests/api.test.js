// API 集成测试：临时数据库、独立用户和真实 HTTP 请求，不改动日常使用的数据。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server/app");

test("MeowHome complete adoption flow", async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "meowhome-api-"));
  const options = {
    database: path.join(temp, "test.sqlite"),
    uploads: path.join(temp, "uploads"),
  };
  let app, server, base;
  async function start() {
    app = createApp(options);
    server = await new Promise((resolve, reject) => {
      const s = app.listen(0, "127.0.0.1", (error) =>
        error ? reject(error) : resolve(s),
      );
    });
    base = "http://127.0.0.1:" + server.address().port;
  }
  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    app.locals.db.close();
  }
  function client() {
    let cookie = "";
    return async (url, method = "GET", body) => {
      const res = await fetch(base + "/api" + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "MeowHome",
          Cookie: cookie,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (res.headers.has("set-cookie"))
        cookie = res.headers.get("set-cookie").split(";")[0];
      return {
        status: res.status,
        data: await res.json(),
        cookie: res.headers.get("set-cookie"),
      };
    };
  }
  const owner = client(),
    adopter = client(),
    other = client(),
    guest = client(),
    rateLimitClient = client();
  let ownerId, adopterId, catId, appId, otherApp, storyId, updatedDiaryImage;
  const password = "StudyCats2026!";
  const updatedPassword = "NewStudyCats2026!";
  const photograph =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==";
  const uploadedFile = (image) =>
    path.join(options.uploads, path.basename(image));
  const cat = {
    name: "Test Cat",
    breed: "Domestic Shorthair",
    months: 18,
    gender: "Female",
    location: "Kowloon",
    health: "Health details supplied by rehomer.",
    personality: "Gentle",
    energy: "calm",
    care: "easy",
    beginner: true,
    otherPets: false,
    description: "A friendly cat who enjoys quiet play and a calm home.",
    requirements: "An indoor home with secure windows and daily care.",
    image: photograph,
  };
  const details = {
    name: "Adopter",
    email: "adopter@example.test",
    experience: "First-time adopter",
    home: "A quiet apartment with secure windows.",
    reason: "I have prepared a room and can provide daily care.",
  };
  await start();
  t.after(async () => {
    await stop();
    fs.rmSync(temp, { recursive: true, force: true });
  });

  await t.test("empty database and real registration", async () => {
    assert.deepEqual((await guest("/cats")).data, []);
    assert.deepEqual((await guest("/stories")).data, []);
    assert.equal((await guest("/applications")).status, 401);
    assert.equal(
      (
        await guest("/auth/register", "POST", {
          name: "A",
          email: "bad",
          password: "x",
        })
      ).status,
      400,
    );
    const a = await owner("/auth/register", "POST", {
      name: "Rehomer",
      email: "owner@example.test",
      password,
    });
    assert.equal(a.status, 201);
    ownerId = a.data.id;
    assert.match(a.cookie, /HttpOnly/);
    assert.match(a.cookie, /SameSite=Lax/);
    adopterId = (
      await adopter("/auth/register", "POST", {
        name: "Adopter",
        email: "adopter@example.test",
        password,
      })
    ).data.id;
    await other("/auth/register", "POST", {
      name: "Other",
      email: "other@example.test",
      password,
    });
    assert.equal(
      (
        await guest("/auth/register", "POST", {
          name: "Duplicate",
          email: "OWNER@example.test",
          password,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await rateLimitClient("/auth/login", "POST", {
          email: "owner@example.test",
          password: "wrongpass",
        })
      ).status,
      401,
    );
    const failureKey = app.locals.db
      .prepare("SELECT key FROM login_failures")
      .get().key;
    app.locals.db
      .prepare("UPDATE login_failures SET count=20 WHERE key=?")
      .run(failureKey);
    assert.equal(
      (
        await rateLimitClient("/auth/login", "POST", {
          email: "owner@example.test",
          password,
        })
      ).status,
      429,
    );
    app.locals.db
      .prepare("UPDATE login_failures SET resetAt=? WHERE key=?")
      .run(Date.now() - 1, failureKey);
    assert.equal(
      (
        await rateLimitClient("/auth/login", "POST", {
          email: "owner@example.test",
          password,
        })
      ).status,
      200,
    );
    assert.equal(
      app.locals.db
        .prepare("SELECT key FROM login_failures WHERE key=?")
        .get(failureKey),
      undefined,
    );
    assert.equal((await owner("/auth/me")).data.id, ownerId);
    assert.equal(
      app.locals.db
        .prepare("SELECT passwordHash FROM users WHERE id=?")
        .get(ownerId)
        .passwordHash.includes(password),
      false,
    );
  });
  await t.test(
    "publish and edit with upload validation and ownership checks",
    async () => {
      assert.equal((await guest("/cats", "POST", cat)).status, 401);
      assert.equal(
        (await owner("/cats", "POST", { ...cat, months: -1 })).status,
        400,
      );
      assert.equal(
        (
          await owner("/cats", "POST", {
            ...cat,
            image: "data:image/jpeg;base64,PGh0bWw+",
          })
        ).status,
        400,
      );
      const result = await owner("/cats", "POST", cat);
      assert.equal(result.status, 201);
      catId = result.data.id;
      const stored = (await guest("/cats/" + catId)).data;
      assert.equal(stored.status, "available");
      assert.match(stored.image, /^\/uploads\//);
      const image = await fetch(base + stored.image);
      assert.equal(image.status, 200);
      assert.equal(
        (await adopter("/cats/" + catId, "PUT", { ...cat, name: "Stolen" }))
          .status,
        403,
      );
      assert.equal(
        (
          await owner("/cats/" + catId, "PUT", {
            ...cat,
            name: "New Name",
            image: photograph,
          })
        ).status,
        200,
      );
      const updatedCat = (await guest("/cats/" + catId)).data;
      assert.equal(updatedCat.name, "New Name");
      assert.notEqual(updatedCat.image, stored.image);
      assert.equal(fs.existsSync(uploadedFile(stored.image)), false);
      assert.equal(fs.existsSync(uploadedFile(updatedCat.image)), true);
      const anotherCat = await owner("/cats", "POST", {
        ...cat,
        name: "Another Cat",
      });
      assert.equal(anotherCat.status, 201);
      const firstPage = await guest("/cats?page=1&limit=1&sort=name");
      const secondPage = await guest("/cats?page=2&limit=1&sort=name");
      assert.deepEqual(
        {
          total: firstPage.data.total,
          page: firstPage.data.page,
          pageSize: firstPage.data.pageSize,
          pages: firstPage.data.pages,
          items: firstPage.data.items.map((row) => row.name),
        },
        {
          total: 2,
          page: 1,
          pageSize: 1,
          pages: 2,
          items: ["Another Cat"],
        },
      );
      assert.deepEqual(
        secondPage.data.items.map((row) => row.name),
        ["New Name"],
      );
      const filtered = await guest(
        "/cats?page=1&limit=6&q=another&breed=Domestic%20Shorthair&age=adult&gender=Female&location=Kowloon",
      );
      assert.equal(filtered.data.total, 1);
      assert.equal(filtered.data.items[0].id, anotherCat.data.id);
      assert.equal((await guest("/cats?page=0")).status, 400);
      assert.equal((await guest("/cats?limit=51")).status, 400);
      assert.equal((await owner("/cats/" + anotherCat.data.id, "DELETE", {})).status, 200);
      assert.equal(
        (
          await owner("/stories", "POST", {
            catId,
            title: "Too early",
            text: "This is not an adopted cat yet.",
            image: stored.image,
            public: true,
          })
        ).status,
        403,
      );
    },
  );
  await t.test("apply, edit, privacy and duplicate prevention", async () => {
    assert.equal(
      (await owner("/applications", "POST", { catId, ...details })).status,
      403,
    );
    assert.equal(
      (await adopter("/applications", "POST", { catId, ...details, home: [] }))
        .status,
      400,
    );
    const a = await adopter("/applications", "POST", { catId, ...details });
    assert.equal(a.status, 201);
    appId = a.data.id;
    assert.equal(
      (await adopter("/applications", "POST", { catId, ...details })).status,
      409,
    );
    assert.equal(
      (
        await adopter("/applications/" + appId, "PUT", {
          ...details,
          reason: "Updated plan: I can provide a stable home and daily care.",
        })
      ).status,
      200,
    );
    assert.deepEqual((await other("/applications")).data, []);
    assert.equal(
      (
        await other("/applications/" + appId + "/status", "PATCH", {
          status: "accepted",
        })
      ).status,
      403,
    );
    otherApp = (
      await other("/applications", "POST", {
        catId,
        ...details,
        name: "Other",
        email: "other@example.test",
      })
    ).data.id;
    assert.equal((await owner("/applications")).data.length, 2);
    assert.equal((await adopter("/applications")).data[0].rehomerEmail, null);
    assert.equal(
      (
        await owner("/applications/" + appId + "/status", "PATCH", {
          status: "contacting",
        })
      ).status,
      200,
    );
    assert.equal(
      (await adopter("/applications")).data.find((a) => a.id === appId)
        .rehomerEmail,
      "owner@example.test",
    );
  });
  await t.test("atomic acceptance, cancellation and handover", async () => {
    assert.equal(
      (
        await owner("/applications/" + appId + "/status", "PATCH", {
          status: "completed",
        })
      ).status,
      409,
    );
    const results = await Promise.all([
      owner("/applications/" + appId + "/status", "PATCH", {
        status: "accepted",
      }),
      owner("/applications/" + otherApp + "/status", "PATCH", {
        status: "accepted",
      }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    let accepted = app.locals.db
      .prepare("SELECT id FROM applications WHERE status='accepted'")
      .get().id;
    assert.equal((await guest("/cats/" + catId)).data.status, "reserved");
    assert.equal((await owner("/cats/" + catId, "DELETE", {})).status, 409);
    assert.equal(
      (
        await owner("/applications/" + accepted + "/status", "PATCH", {
          status: "rejected",
        })
      ).status,
      200,
    );
    assert.equal((await guest("/cats/" + catId)).data.status, "available");
    // Ensure the chosen adopter has an active request again if theirs was cancelled.
    if (accepted === appId)
      appId = (await adopter("/applications", "POST", { catId, ...details }))
        .data.id;
    else
      otherApp = (
        await other("/applications", "POST", {
          catId,
          ...details,
          name: "Other",
          email: "other@example.test",
        })
      ).data.id;
    assert.equal(
      (
        await owner("/applications/" + appId + "/status", "PATCH", {
          status: "accepted",
        })
      ).status,
      200,
    );
    assert.equal(
      (await adopter("/applications")).data.find((a) => a.id === appId)
        .rehomerEmail,
      "owner@example.test",
    );
    assert.equal(
      (
        await adopter("/applications/" + appId + "/status", "PATCH", {
          status: "completed",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await owner("/applications/" + appId + "/status", "PATCH", {
          status: "completed",
        })
      ).status,
      200,
    );
    const adopted = (await guest("/cats/" + catId)).data;
    assert.equal(adopted.status, "adopted");
    assert.equal(adopted.adopterId, adopterId);
    assert.equal(
      (await other("/applications")).data.find((a) => a.id === otherApp).status,
      "closed",
    );
    assert.equal(
      (
        await owner("/applications/" + appId + "/status", "PATCH", {
          status: "completed",
        })
      ).status,
      409,
    );
    assert.equal(
      (await adopter("/applications/" + appId, "DELETE", {})).status,
      409,
    );
    assert.equal(
      (await other("/applications", "POST", { catId, ...details })).status,
      409,
    );
  });
  await t.test("diary CRUD and private visibility", async () => {
    const image = photograph;
    const diary = {
      catId,
      title: "First week",
      text: "We are settling into a quiet routine together.",
      image,
      public: false,
    };
    const a = await adopter("/stories", "POST", diary);
    assert.equal(a.status, 201);
    storyId = a.data.id;
    const originalDiaryImage = (await adopter("/stories")).data[0].image;
    assert.equal(fs.existsSync(uploadedFile(originalDiaryImage)), true);
    assert.equal((await adopter("/stories")).data.length, 1);
    assert.deepEqual((await owner("/stories")).data, []);
    assert.deepEqual((await guest("/stories")).data, []);
    assert.equal(
      (await other("/stories/" + storyId, "DELETE", {})).status,
      403,
    );
    assert.equal(
      (await adopter("/stories/" + storyId, "PUT", {
        ...diary,
        image: photograph,
        public: true,
      }))
        .status,
      200,
    );
    updatedDiaryImage = (await adopter("/stories")).data[0].image;
    assert.notEqual(updatedDiaryImage, originalDiaryImage);
    assert.equal(fs.existsSync(uploadedFile(originalDiaryImage)), false);
    assert.equal(fs.existsSync(uploadedFile(updatedDiaryImage)), true);
    const catImage = (await guest("/cats/" + catId)).data.image;
    assert.equal(fs.existsSync(uploadedFile(catImage)), true);
    assert.equal((await guest("/stories")).data.length, 1);
  });
  await t.test(
    "profile CRUD, favourites, checklist and server security",
    async () => {
      assert.equal(
        (
          await adopter("/profile", "PATCH", {
            name: "Updated Adopter",
            email: "updated@example.test",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await guest("/profile/password", "PATCH", {
            currentPassword: password,
            newPassword: updatedPassword,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await adopter("/profile/password", "PATCH", {
            currentPassword: "wrong-password",
            newPassword: updatedPassword,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await adopter("/profile/password", "PATCH", {
            currentPassword: password,
            newPassword: "short",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await adopter("/profile/password", "PATCH", {
            currentPassword: password,
            newPassword: password,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await adopter("/profile/password", "PATCH", {
            currentPassword: password,
            newPassword: updatedPassword,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await client()("/auth/login", "POST", {
            email: "updated@example.test",
            password,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await client()("/auth/login", "POST", {
            email: "updated@example.test",
            password: updatedPassword,
          })
        ).status,
        200,
      );
      assert.equal(
        (await adopter("/favourites/" + catId, "PUT", {})).status,
        200,
      );
      assert.equal(
        (await adopter("/checklist/2", "PUT", { checked: true })).status,
        200,
      );
      assert.deepEqual((await adopter("/favourites")).data, [catId]);
      assert.deepEqual((await other("/favourites")).data, []);
      assert.equal(
        (await adopter("/checklist/-1", "PUT", { checked: true })).status,
        400,
      );
      const csrf = await fetch(base + "/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(csrf.status, 403);
      assert.equal(
        (await adopter("/profile", "DELETE", { password: updatedPassword }))
          .status,
        409,
      );
      const sql = await guest("/auth/login", "POST", {
        email: "x'or'1'='1@example.test",
        password,
      });
      assert.equal(sql.status, 401);
      const clean = client();
      await clean("/auth/register", "POST", {
        name: "Temporary",
        email: "delete@example.test",
        password,
      });
      assert.equal(
        (await clean("/profile", "DELETE", { password })).status,
        200,
      );
      assert.equal((await clean("/auth/me")).data, null);
    },
  );
  await t.test(
    "restart preserves records, images and sessions; log out revokes session",
    async () => {
      await stop();
      await start();
      assert.equal((await adopter("/auth/me")).data.name, "Updated Adopter");
      assert.equal((await guest("/cats/" + catId)).data.status, "adopted");
      assert.equal((await guest("/stories")).data[0].id, storyId);
      assert.deepEqual((await adopter("/checklist")).data, [2]);
      assert.equal(
        (await adopter("/stories/" + storyId, "DELETE", {})).status,
        200,
      );
      assert.equal(fs.existsSync(uploadedFile(updatedDiaryImage)), false);
      const catImage = (await guest("/cats/" + catId)).data.image;
      assert.equal(fs.existsSync(uploadedFile(catImage)), true);
      assert.deepEqual((await guest("/stories")).data, []);
      assert.equal((await adopter("/auth/logout", "POST", {})).status, 200);
      assert.equal((await adopter("/applications")).status, 401);
      assert.equal(
        (
          await adopter("/auth/login", "POST", {
            email: "updated@example.test",
            password: updatedPassword,
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "withdraw/delete application and delete unused listing",
    async () => {
      const newCat = (await owner("/cats", "POST", cat)).data.id;
      const newCatImage = (await guest("/cats/" + newCat)).data.image;
      const newApp = (
        await adopter("/applications", "POST", { ...details, catId: newCat })
      ).data.id;
      assert.equal((await owner("/cats/" + newCat, "DELETE", {})).status, 409);
      assert.equal(
        (
          await adopter("/applications/" + newApp + "/status", "PATCH", {
            status: "withdrawn",
          })
        ).status,
        200,
      );
      assert.equal(
        (await adopter("/applications/" + newApp, "DELETE", {})).status,
        200,
      );
      assert.equal((await owner("/cats/" + newCat, "DELETE", {})).status, 200);
      assert.equal((await guest("/cats/" + newCat)).status, 404);
      assert.equal(fs.existsSync(uploadedFile(newCatImage)), false);
      assert.deepEqual(
        app.locals.db.prepare("PRAGMA foreign_key_check").all(),
        [],
      );
    },
  );
  await t.test(
    "optional home and reason can be omitted or cleared",
    async () => {
      const catId = (await owner("/cats", "POST", cat)).data.id;
      const { home, reason, ...contact } = details;
      const created = await adopter("/applications", "POST", {
        catId,
        ...contact,
      });
      assert.equal(created.status, 201);
      const id = created.data.id;
      let record = (await adopter("/applications")).data.find(
        (a) => a.id === id,
      );
      assert.equal(record.home, "");
      assert.equal(record.reason, "");
      assert.equal(
        (
          await adopter("/applications/" + id, "PUT", {
            ...contact,
            home: "一人住",
            reason: "喜歡貓",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await adopter("/applications/" + id, "PUT", {
            ...contact,
            home: "  ",
            reason: "",
          })
        ).status,
        200,
      );
      record = (await owner("/applications")).data.find((a) => a.id === id);
      assert.equal(record.home, "");
      assert.equal(record.reason, "");
      assert.equal(
        (
          await adopter("/applications/" + id, "PUT", {
            ...contact,
            home: "x".repeat(1001),
          })
        ).status,
        400,
      );
    },
  );
});
