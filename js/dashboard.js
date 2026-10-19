/* dashboard.js：个人中心标签页、申请审核、交接确认、日记编辑、演示内容审核。
 * 仅调用 store.js 本地适配层，不连接服务器，不提供真实安全隔离。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI,
    esc = U.escapeHTML;
  if (!U.requireUser()) return;
  const user = MeowStore.user(),
    content = document.getElementById("dashboard-content");
  const allowed = [
    "applications",
    "listings",
    "saved",
    "diaries",
    "profile",
    ...(user.role === "admin" ? ["moderation"] : []),
  ];
  const defaultTab = user.role === "admin" ? "moderation" : "applications";
  let tab = new URLSearchParams(location.search).get("tab") || defaultTab;
  if (!allowed.includes(tab)) tab = defaultTab;
  let editStoryId = null,
    diaryImage = "",
    reading = false;
  document.getElementById("profile-mini").innerHTML =
    `<div class="avatar">${esc(user.name.charAt(0))}</div><div><strong>${esc(user.name)}</strong><small>${user.role === "admin" ? "Demo moderator" : "Adopter & rehomer"}</small></div>`;
  document.getElementById("moderation-tab").hidden = user.role !== "admin";
  const owned = () => MeowStore.cats().filter((c) => c.ownerId === user.id);
  const adopted = () =>
    MeowStore.cats().filter(
      (c) => c.adopterId === user.id && c.status === "adopted",
    );
  const myApps = () =>
    MeowStore.applications().filter((a) => a.userId === user.id);
  function toolbar(title, href = "", label = "") {
    return `<div class="dashboard-toolbar"><h2>${title}</h2>${href ? `<a class="btn btn-outline btn-small" href="${href}">${label} ${U.icon("plus")}</a>` : ""}</div>`;
  }
  function actionButton(id, status, label, extra = "") {
    return `<button class="btn btn-outline btn-small ${extra}" type="button" data-app-action="${status}" data-app="${esc(id)}">${label}</button>`;
  }
  function render() {
    document.querySelectorAll("[data-tab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tab);
      if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.getElementById("application-count").textContent = myApps().length;
    document.getElementById("listing-count").textContent = owned().length;
    document.getElementById("saved-count").textContent =
      MeowStore.favourites().length;
    if (tab === "applications") renderApplications();
    if (tab === "listings") renderListings();
    if (tab === "saved") renderSaved();
    if (tab === "diaries") renderDiaries();
    if (tab === "profile") renderProfile();
    if (tab === "moderation") renderModeration();
  }
  function renderApplications() {
    content.innerHTML =
      toolbar("My applications", "discover.html", "Meet a cat") +
      '<div class="record-list">' +
      (myApps()
        .map((a) => {
          const c = MeowStore.cat(a.catId);
          if (!c) return "";
          return `<article class="record-card"><img src="${U.safeImage(c.image)}" alt="${esc(c.name)}"><div><div class="record-head"><div><h3><a href="cat.html?id=${encodeURIComponent(c.id)}">${esc(c.name)}</a></h3><p>${esc(c.breed)} · ${U.age(c)}</p></div>${U.badge(a.status)}</div><p>Applied ${esc(a.created)}</p><p>${a.status === "accepted" ? "Your application has been accepted. Agree the handover details with the rehomer." : a.status === "completed" ? "Adoption completed. You can now add a diary." : a.status === "contacting" ? "The rehomer is reviewing your details and would like to continue the conversation." : a.status === "pending" ? "The rehomer will review the information you shared." : a.status === "closed" ? "Another adoption has been completed for this cat." : a.status === "rejected" ? "The rehomer did not select this application. You can explore other companions." : "You withdrew this application."}</p><div class="button-row"><a class="text-link" href="cat.html?id=${encodeURIComponent(c.id)}">View profile ↗</a>${["pending", "contacting"].includes(a.status) ? actionButton(a.id, "withdrawn", "Withdraw") : ""}${a.status === "completed" ? '<button class="btn btn-outline btn-small" type="button" data-new-diary>Write a diary</button>' : ""}</div></div></article>`;
        })
        .join("") || U.empty("No applications", "")) +
      "</div>";
  }
  function renderListings() {
    const apps = MeowStore.applications();
    content.innerHTML =
      toolbar("My listings", "rehome.html", "New listing") +
      '<div class="record-list">' +
      (owned()
        .map((c) => {
          const incoming = apps.filter((a) => a.catId === c.id);
          return `<article class="record-card"><img src="${U.safeImage(c.image)}" alt="${esc(c.name)}"><div><div class="record-head"><div><h3>${esc(c.name)}</h3><p>${esc(c.breed)} · ${U.age(c)}</p></div>${U.badge(c.status)}</div><p>${incoming.length} application${incoming.length === 1 ? "" : "s"} · Listed ${esc(c.created)}</p><div class="button-row"><a class="text-link" href="cat.html?id=${encodeURIComponent(c.id)}">View profile ↗</a>${["available", "pending"].includes(c.status) ? `<a class="btn btn-outline btn-small" href="rehome.html?edit=${encodeURIComponent(c.id)}">Edit listing</a>` : ""}</div></div><details class="record-extra" ${incoming.some((a) => ["pending", "contacting", "accepted"].includes(a.status)) ? "open" : ""}><summary>Incoming applications (${incoming.length})</summary>${incoming.length ? incoming.map((a) => `<div class="application-entry"><div class="record-head"><h4>${esc(a.name)}</h4>${U.badge(a.status)}</div><p><strong>Contact:</strong> ${esc(a.email)}</p><p><strong>Experience:</strong> ${esc(a.experience)}</p><p><strong>Home:</strong> ${esc(a.home)}</p><p><strong>Why this match:</strong> ${esc(a.reason)}</p><div class="button-row">${a.status === "pending" && c.status === "available" ? actionButton(a.id, "contacting", "Start conversation") : ""}${["pending", "contacting"].includes(a.status) && c.status === "available" ? actionButton(a.id, "accepted", "Accept application") : ""}${["pending", "contacting"].includes(a.status) ? actionButton(a.id, "rejected", "Decline", "btn-danger") : ""}${a.status === "accepted" && c.status === "reserved" ? actionButton(a.id, "completed", "Confirm handover") : ""}</div></div>`).join("") : '<p class="source-note">No applications yet.</p>'}</details></article>`;
        })
        .join("") ||
        U.empty("No listings", "", "rehome.html", "Create a listing")) +
      "</div>";
  }
  function renderSaved() {
    const ids = MeowStore.favourites(),
      cats = MeowStore.cats().filter(
        (c) =>
          ids.includes(c.id) &&
          ["available", "reserved", "adopted"].includes(c.status),
      );
    content.innerHTML =
      toolbar("Saved companions") +
      `<div class="cat-grid">${cats.map((c) => U.catCard(c)).join("") || U.empty("No saved cats", "Tap the heart on a cat profile to find them here later.")}</div>`;
  }
  function renderDiaries() {
    const stories = MeowStore.stories().filter((s) => s.userId === user.id);
    content.innerHTML =
      toolbar("My adoption diaries") +
      `<div class="button-row"><button class="btn btn-small" type="button" data-new-diary ${adopted().length ? "" : "disabled"}>${U.icon("plus")}Add diary</button><a class="text-link" href="stories.html">Read adoption diaries ↗</a></div><p class="source-note">${adopted().length ? "Public entries appear on the adoption diaries page. Private entries are visible only in your profile." : "Diary writing is available after the rehomer confirms the handover."}</p><div class="story-grid">${stories.map((s) => `<article class="story-card"><img src="${U.safeImage(s.image)}" alt="${esc(s.title)}"><div class="story-body"><span class="pill ${s.public ? "" : "warm"}">${s.public ? "Public diary" : "Private diary"}</span><h3>${esc(s.title)}</h3><p>${esc(s.text.slice(0, 150))}${s.text.length > 150 ? "…" : ""}</p><span class="story-meta">${esc(s.created)}</span><div class="button-row"><button class="btn btn-outline btn-small" type="button" data-edit-story="${esc(s.id)}">Edit entry</button><button class="btn btn-danger btn-small" type="button" data-delete-story="${esc(s.id)}">Delete</button></div></div></article>`).join("") || U.empty("No diary entries", "", "stories.html", "Read adoption diaries")}</div>`;
  }
  function renderProfile() {
    content.innerHTML =
      toolbar("My profile") +
      `<div class="panel dashboard-profile"><div class="avatar">${esc(user.name[0])}</div><div class="account-stats"><div><strong>${myApps().length}</strong><span>Applications</span></div><div><strong>${owned().length}</strong><span>Listings</span></div><div><strong>${adopted().length}</strong><span>Adopted companions</span></div></div><form id="profile-edit-form"><div class="field"><label for="edit-name">Display name</label><input id="edit-name" name="name" value="${esc(user.name)}" required minlength="2" maxlength="60"></div><div class="field"><label for="edit-email">Local profile email</label><input id="edit-email" value="${esc(user.email)}" type="email" readonly><small>Demo profile identifier; no real email is sent.</small></div><button class="btn btn-small" type="submit">Save profile</button></form><div class="form-navigation"><button class="btn btn-outline btn-small" type="button" data-logout>Sign out</button><button class="reset-link" id="reset-demo" type="button">Reset all local demo data</button></div></div>`;
  }
  function renderModeration() {
    if (user.role !== "admin") return;
    const pending = MeowStore.cats().filter((c) => c.status === "pending");
    content.innerHTML =
      toolbar("Listing review") +
      '<div class="admin-intro">Demo moderator view. Approve a pending listing to make it visible in the discovery feed, or hide it to keep it off the public pages.</div><div class="record-list">' +
      (pending
        .map(
          (c) =>
            `<article class="record-card"><img src="${U.safeImage(c.image)}" alt="${esc(c.name)}"><div><div class="record-head"><h3>${esc(c.name)}</h3>${U.badge(c.status)}</div><p>${esc(c.breed)} · ${esc(c.location)}</p><p>${esc(c.description)}</p><div class="button-row"><a class="text-link" href="cat.html?id=${encodeURIComponent(c.id)}">Review profile ↗</a><button class="btn btn-small" data-moderate="available" data-cat="${esc(c.id)}" type="button">Approve listing</button><button class="btn btn-danger btn-small" data-moderate="hidden" data-cat="${esc(c.id)}" type="button">Hide listing</button></div></div></article>`,
        )
        .join("") ||
        U.empty(
          "No pending listings",
          "",
          "rehome.html",
          "Explore the publish form",
        )) +
      "</div>";
  }
  function setTab(value, push = true) {
    if (!allowed.includes(value)) return;
    tab = value;
    if (push) history.pushState(null, "", `dashboard.html?tab=${tab}`);
    render();
  }
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  window.addEventListener("popstate", () =>
    setTab(
      new URLSearchParams(location.search).get("tab") || defaultTab,
      false,
    ),
  );
  function logout() {
    if (MeowStore.signOut()) location.href = "index.html";
  }
  document.getElementById("sign-out").addEventListener("click", logout);
  document.addEventListener("favourites-changed", () => {
    if (tab === "saved") renderSaved();
    document.getElementById("saved-count").textContent =
      MeowStore.favourites().length;
  });
  content.addEventListener("click", (e) => {
    const action = e.target.closest("[data-app-action]");
    if (action) {
      const target = action.dataset.appAction;
      if (
        target === "completed" &&
        !MeowI18n.confirm(
          "Confirm the cat has actually been handed over? Other pending applications will be closed.",
        )
      )
        return;
      if (
        target === "accepted" &&
        !MeowI18n.confirm(
          "Accept this application and pause new applications for this cat?",
        )
      )
        return;
      if (
        target === "withdrawn" &&
        !MeowI18n.confirm("Withdraw this application?")
      )
        return;
      if (MeowStore.updateApplication(action.dataset.app, target)) {
        U.toast(
          target === "completed"
            ? "Handover confirmed."
            : "Application updated.",
        );
        render();
      } else U.toast("This action is not available for the current status.");
    }
    const moderation = e.target.closest("[data-moderate]");
    if (
      moderation &&
      MeowStore.moderate(moderation.dataset.cat, moderation.dataset.moderate)
    ) {
      render();
      U.toast("Listing review saved.");
    }
    if (e.target.closest("[data-new-diary]")) openDiary();
    const edit = e.target.closest("[data-edit-story]");
    if (edit) openDiary(edit.dataset.editStory);
    const remove = e.target.closest("[data-delete-story]");
    if (remove && MeowI18n.confirm("Delete this diary entry?")) {
      if (MeowStore.deleteStory(remove.dataset.deleteStory)) {
        render();
        U.toast("Diary deleted.");
      }
    }
    if (e.target.closest("[data-logout]")) logout();
    if (
      e.target.closest("#reset-demo") &&
      MeowI18n.confirm(
        "Reset all local profiles, photos, listings and applications to the original examples?",
      )
    ) {
      if (MeowStore.reset()) location.href = "login.html";
    }
  });
  content.addEventListener("submit", (e) => {
    if (e.target.id !== "profile-edit-form") return;
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    if (name.length < 2) {
      U.toast("Please enter at least two characters.");
      return;
    }
    if (MeowStore.updateProfile(name)) location.reload();
  });
  function openDiary(storyId = null) {
    const cats = adopted();
    if (!cats.length) {
      U.toast("You can write a diary after a completed adoption.");
      return;
    }
    const story = storyId
      ? MeowStore.stories().find(
          (s) => s.id === storyId && s.userId === user.id,
        )
      : null;
    if (storyId && !story) return;
    editStoryId = storyId;
    diaryImage = story?.image || "";
    const form = document.getElementById("diary-form");
    form.reset();
    form.elements.catId.innerHTML = cats
      .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
      .join("");
    if (story) {
      form.elements.catId.value = story.catId;
      form.elements.title.value = story.title;
      form.elements.text.value = story.text;
    }
    document.getElementById("diary-public").checked = story
      ? story.public
      : true;
    document.getElementById("diary-image-preview").hidden = !diaryImage;
    if (diaryImage)
      document.getElementById("diary-image-preview").src =
        U.safeImage(diaryImage);
    document.getElementById("diary-error").textContent = "";
    document.getElementById("diary-form-title").textContent = story
      ? "Edit diary entry"
      : "New diary entry";
    document.getElementById("diary-dialog").showModal();
  }
  document
    .getElementById("diary-image")
    .addEventListener("change", async (e) => {
      if (!e.target.files[0]) return;
      reading = true;
      document.getElementById("save-diary").disabled = true;
      try {
        diaryImage = await U.readImage(e.target.files[0]);
        const preview = document.getElementById("diary-image-preview");
        preview.src = diaryImage;
        preview.hidden = false;
        document.getElementById("diary-error").textContent = "";
      } catch (error) {
        document.getElementById("diary-error").textContent = error.message;
        e.target.value = "";
      } finally {
        reading = false;
        document.getElementById("save-diary").disabled = false;
      }
    });
  document.getElementById("diary-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (reading) return;
    const values = Object.fromEntries(new FormData(e.target));
    if (values.title.trim().length < 1 || values.text.trim().length < 15) {
      document.getElementById("diary-error").textContent =
        "Please add a title and at least 15 characters for your update.";
      return;
    }
    const cat = MeowStore.cat(values.catId);
    const details = {
      catId: values.catId,
      title: values.title.trim(),
      text: values.text.trim(),
      image: diaryImage || cat.image,
      public: document.getElementById("diary-public").checked,
    };
    if (MeowStore.saveStory(details, editStoryId)) {
      document.getElementById("diary-dialog").close();
      setTab("diaries");
      U.toast("Diary saved.");
    } else
      document.getElementById("diary-error").textContent =
        "Your diary could not be saved. Try a smaller photograph.";
  });
  render();
  const params = new URLSearchParams(location.search);
  if (params.has("sent")) U.toast("Your application has been sent.");
  if (params.has("published")) U.toast("Your listing has been saved.");
});
