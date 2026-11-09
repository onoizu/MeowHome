/* dashboard.js：我的申请、发布、收藏、日记和个人资料。修改通过 store.js 调用 API。 */
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await MeowStore.ready)) return;
  const U = MeowUI,
    esc = U.escapeHTML;
  if (!U.requireUser()) return;
  const user = MeowStore.user(),
    content = document.getElementById("dashboard-content");
  const allowed = ["applications", "listings", "saved", "diaries", "profile"];
  const defaultTab = "applications";
  let tab = new URLSearchParams(location.search).get("tab") || defaultTab;
  if (!allowed.includes(tab)) tab = defaultTab;
  let editStoryId = null,
    diaryImage = "",
    reading = false;
  document.getElementById("profile-mini").innerHTML =
    `<div class="avatar"><img src="assets/images/default-avatar.svg" alt="Default profile picture"></div><strong data-no-translate>${esc(user.name)}</strong>`;
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
  }
  function applicationMessage(status) {
    const messages = {
      accepted:
        "Your application has been accepted. Agree the handover details with the rehomer.",
      completed: "Adoption completed. You can now add a diary.",
      contacting:
        "The rehomer is reviewing your details and would like to continue the conversation.",
      pending: "The rehomer will review the information you shared.",
      closed: "Another adoption has been completed for this cat.",
      rejected:
        "The rehomer did not select this application. You can explore other companions.",
      withdrawn: "You withdrew this application.",
    };
    return messages[status] || "";
  }
  function renderApplications() {
    const records = myApps()
      .map((a) => {
        const cat = MeowStore.cat(a.catId);
        if (!cat) return "";
        const editable =
          ["pending", "contacting"].includes(a.status) &&
          cat.status === "available";
        const withdrawable = ["pending", "contacting", "accepted"].includes(
          a.status,
        );
        const deletable = ["withdrawn", "rejected", "closed"].includes(
          a.status,
        );
        return `
        <article class="record-card">
          <img src="${U.safeImage(cat.image)}" alt="${esc(cat.name)}">
          <div>
            <div class="record-head">
              <div><h3 data-no-translate><a href="cat.html?id=${encodeURIComponent(cat.id)}">${esc(cat.name)}</a></h3><p>${esc(cat.breed)} · ${U.age(cat)}</p></div>
              ${U.badge(a.status)}
            </div>
            <p>Applied ${esc(a.created.slice(0, 10))}</p>
            <p data-no-translate>${esc(a.reason)}</p>
            ${a.rehomerEmail ? `<p><span>Rehomer contact:</span> <span data-no-translate>${esc(a.rehomerEmail)}</span></p>` : ""}
            <p>${applicationMessage(a.status)}</p>
            <div class="button-row">
              <a class="text-link" href="cat.html?id=${encodeURIComponent(cat.id)}">View profile ↗</a>
              ${withdrawable ? actionButton(a.id, "withdrawn", "Withdraw") : ""}
              ${editable ? `<button class="btn btn-outline btn-small" type="button" data-edit-app="${esc(a.id)}">Edit application</button>` : ""}
              ${deletable ? `<button class="btn btn-danger btn-small" type="button" data-delete-app="${esc(a.id)}">Delete record</button>` : ""}
              ${a.status === "completed" ? '<button class="btn btn-outline btn-small" type="button" data-new-diary>Write a diary</button>' : ""}
            </div>
          </div>
        </article>`;
      })
      .join("");
    content.innerHTML =
      toolbar("My applications", "discover.html", "Meet a cat") +
      `<div class="record-list">${records || U.empty("No applications", "")}</div>`;
  }
  function incomingApplication(a, cat) {
    const reviewable =
      ["pending", "contacting"].includes(a.status) &&
      cat.status === "available";
    return `
      <div class="application-entry">
        <div class="record-head"><h4 data-no-translate>${esc(a.name)}</h4>${U.badge(a.status)}</div>
        <p><strong>Contact:</strong> <span data-no-translate>${esc(a.email)}</span></p>
        <p><strong>Experience:</strong> ${esc(a.experience)}</p>
        <p><strong>Home:</strong> <span data-no-translate>${esc(a.home)}</span></p>
        <p><strong>Why this match:</strong> <span data-no-translate>${esc(a.reason)}</span></p>
        <div class="button-row">
          ${a.status === "pending" && cat.status === "available" ? actionButton(a.id, "contacting", "Start conversation") : ""}
          ${reviewable ? actionButton(a.id, "accepted", "Accept application") : ""}
          ${["pending", "contacting", "accepted"].includes(a.status) ? actionButton(a.id, "rejected", a.status === "accepted" ? "Cancel acceptance" : "Decline", "btn-danger") : ""}
          ${a.status === "accepted" && cat.status === "reserved" ? actionButton(a.id, "completed", "Confirm handover") : ""}
        </div>
      </div>`;
  }
  function renderListings() {
    const apps = MeowStore.applications();
    const records = owned()
      .map((cat) => {
        const incoming = apps.filter((a) => a.catId === cat.id);
        const editable = cat.status === "available";
        const hasActive = incoming.some((a) =>
          ["pending", "contacting", "accepted"].includes(a.status),
        );
        return `
        <article class="record-card">
          <img src="${U.safeImage(cat.image)}" alt="${esc(cat.name)}">
          <div>
            <div class="record-head">
              <div><h3 data-no-translate>${esc(cat.name)}</h3><p>${esc(cat.breed)} · ${U.age(cat)}</p></div>
              ${U.badge(cat.status)}
            </div>
            <p>${incoming.length} application${incoming.length === 1 ? "" : "s"} · Listed ${esc(cat.created.slice(0, 10))}</p>
            <div class="button-row">
              <a class="text-link" href="cat.html?id=${encodeURIComponent(cat.id)}">View profile ↗</a>
              ${editable ? `<a class="btn btn-outline btn-small" href="rehome.html?edit=${encodeURIComponent(cat.id)}">Edit listing</a><button class="btn btn-danger btn-small" type="button" data-delete-cat="${esc(cat.id)}">Delete listing</button>` : ""}
            </div>
          </div>
          <details class="record-extra" ${hasActive ? "open" : ""}>
            <summary>Incoming applications (${incoming.length})</summary>
            ${incoming.map((a) => incomingApplication(a, cat)).join("") || '<p class="source-note">No applications yet.</p>'}
          </details>
        </article>`;
      })
      .join("");
    content.innerHTML =
      toolbar("My listings", "rehome.html", "New listing") +
      `<div class="record-list">${records || U.empty("No listings", "", "rehome.html", "Create a listing")}</div>`;
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
      `<div class="cat-grid">${cats.map((c) => U.catCard(c, "", true)).join("") || U.empty("No saved cats", "Tap the heart on a cat profile to find them here later.")}</div>`;
  }
  function renderDiaries() {
    const stories = MeowStore.stories().filter((s) => s.userId === user.id);
    content.innerHTML =
      toolbar("My adoption diaries") +
      `<div class="button-row"><button class="btn btn-small" type="button" data-new-diary ${adopted().length ? "" : "disabled"}>${U.icon("plus")}Add diary</button><a class="text-link" href="stories.html">Read adoption diaries ↗</a></div><p class="source-note">${adopted().length ? "Public entries appear on the adoption diaries page. Private entries are visible only in your profile." : "Diary writing is available after the rehomer confirms the handover."}</p><div class="story-grid">${stories.map((s) => `<article class="story-card"><img src="${U.safeImage(s.image)}" alt="${esc(s.title)}"><div class="story-body"><span class="pill ${s.public ? "" : "warm"}">${s.public ? "Public diary" : "Private diary"}</span><h3>${esc(s.title)}</h3><p>${esc(s.text.slice(0, 150))}${s.text.length > 150 ? "…" : ""}</p><span class="story-meta">${esc(s.created.slice(0, 10))}</span><div class="button-row"><button class="btn btn-outline btn-small" type="button" data-edit-story="${esc(s.id)}">Edit entry</button><button class="btn btn-danger btn-small" type="button" data-delete-story="${esc(s.id)}">Delete</button></div></div></article>`).join("") || U.empty("No diary entries", "", "stories.html", "Read adoption diaries")}</div>`;
  }
  function renderProfile() {
    content.innerHTML =
      toolbar("My profile") +
      `<div class="panel dashboard-profile"><form id="profile-edit-form">
        <div class="field"><label for="edit-name">Display name</label><input id="edit-name" name="name" value="${esc(user.name)}" required minlength="2" maxlength="60"></div>
        <div class="field"><label for="edit-email">Email address</label><input id="edit-email" name="email" value="${esc(user.email)}" required type="email" maxlength="254"></div>
        <button class="btn btn-small" type="submit">Save profile</button>
      </form>
      <form id="change-password-form">
        <h3>Change password</h3>
        <div class="field"><label for="current-password">Current password</label><input id="current-password" name="currentPassword" type="password" required minlength="8" maxlength="128" autocomplete="current-password"></div>
        <div class="field"><label for="new-password">New password</label><input id="new-password" name="newPassword" type="password" required minlength="8" maxlength="128" autocomplete="new-password"></div>
        <button class="btn btn-small" type="submit">Update password</button>
      </form><div class="form-navigation"><button class="btn btn-outline btn-small" type="button" data-logout>Sign out</button></div>
      <details><summary>Delete account</summary><p>Remove your listings, applications and diaries first. Accounts linked to completed adoptions must be kept.</p>
        <form id="delete-account-form"><div class="field"><label for="delete-password">Confirm password</label><input id="delete-password" name="password" type="password" required autocomplete="current-password"></div>
        <button class="btn btn-danger btn-small" type="submit">Delete account</button></form>
      </details></div>`;
  }
  function showAccountDeletionBlockers() {
    const cats = MeowStore.cats().filter(
      (cat) => cat.ownerId === user.id || cat.adopterId === user.id,
    );
    const applications = myApps();
    const diaries = MeowStore.stories().filter(
      (story) => story.userId === user.id,
    );
    const sections = [
      {
        title: "Cat records",
        tab: "listings",
        records: cats.map((cat) => {
          const role = cat.ownerId === user.id ? "Rehomer" : "Adopter";
          return `${esc(cat.name)} · ${role} · ${esc(U.status(cat.status))}`;
        }),
      },
      {
        title: "Applications",
        tab: "applications",
        records: applications.map((application) => {
          const cat = MeowStore.cat(application.catId);
          return `${esc(cat?.name || "Cat listing")} · ${esc(U.status(application.status))}`;
        }),
      },
      {
        title: "Diaries",
        tab: "diaries",
        records: diaries.map(
          (story) => `${esc(story.title)} · ${esc(story.created.slice(0, 10))}`,
        ),
      },
    ];
    const hasRecords = cats.length + applications.length + diaries.length > 0;
    document.getElementById("account-deletion-blockers")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "account-deletion-blockers";
    dialog.className = "dialog";
    dialog.setAttribute("aria-labelledby", "account-deletion-title");
    dialog.innerHTML = `<div class="dialog-inner">
      <h2 id="account-deletion-title">Your account still has records</h2>
      <p>These records must be resolved before the account can be deleted. Completed adoption history must be kept.</p>
      ${
        hasRecords
          ? sections
              .filter((section) => section.records.length)
              .map(
                (section) =>
                  `<section><h3>${section.title} (${section.records.length})</h3><ul>${section.records.map((record) => `<li>${record}</li>`).join("")}</ul><a class="text-link" href="dashboard.html?tab=${section.tab}">Manage ${section.title.toLowerCase()} ↗</a></section>`,
              )
              .join("")
          : '<p role="status">No blocking records are currently loaded. Your account data may have changed; refresh the page and try again.</p><a class="text-link" href="dashboard.html?tab=profile">Refresh profile ↗</a>'
      }
      <div class="button-row"><button class="btn btn-outline btn-small" type="button" data-close>Close</button></div>
    </div>`;
    document.body.append(dialog);
    dialog.showModal();
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
  async function logout() {
    if (await MeowStore.signOut()) location.href = "index.html";
    else U.toast(MeowStore.error());
  }
  document.getElementById("sign-out").addEventListener("click", logout);
  document.addEventListener("favourites-changed", () => {
    if (tab === "saved") renderSaved();
    document.getElementById("saved-count").textContent =
      MeowStore.favourites().length;
  });
  content.addEventListener("click", async (e) => {
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
      action.disabled = true;
      if (await MeowStore.updateApplication(action.dataset.app, target)) {
        U.toast(
          target === "completed"
            ? "Handover confirmed."
            : "Application updated.",
        );
        render();
      } else {
        U.toast(MeowStore.error());
        action.disabled = false;
      }
    }
    if (e.target.closest("[data-new-diary]")) openDiary();
    const edit = e.target.closest("[data-edit-story]");
    if (edit) openDiary(edit.dataset.editStory);
    const remove = e.target.closest("[data-delete-story]");
    if (remove && MeowI18n.confirm("Delete this diary entry?")) {
      if (await MeowStore.deleteStory(remove.dataset.deleteStory)) {
        render();
        U.toast("Diary deleted.");
      } else U.toast(MeowStore.error());
    }
    if (e.target.closest("[data-logout]")) logout();
    const catButton = e.target.closest("[data-delete-cat]");
    if (catButton && MeowI18n.confirm("Delete this listing?")) {
      if (await MeowStore.deleteCat(catButton.dataset.deleteCat)) {
        render();
        U.toast("Listing deleted.");
      } else U.toast(MeowStore.error());
    }
    const appButton = e.target.closest("[data-delete-app]");
    if (appButton && MeowI18n.confirm("Delete this application record?")) {
      if (await MeowStore.deleteApplication(appButton.dataset.deleteApp)) {
        render();
        U.toast("Application deleted.");
      } else U.toast(MeowStore.error());
    }
    const editApp = e.target.closest("[data-edit-app]");
    if (editApp) openApplication(editApp.dataset.editApp);
  });
  content.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("[type=submit]");
    if (e.target.id === "profile-edit-form") {
      button.disabled = true;
      const ok = await MeowStore.updateProfile(
        e.target.elements.name.value.trim(),
        e.target.elements.email.value.trim(),
      );
      if (ok) location.reload();
      else {
        U.toast(MeowStore.error());
        button.disabled = false;
      }
    }
    if (e.target.id === "change-password-form") {
      button.disabled = true;
      const ok = await MeowStore.changePassword(
        e.target.elements.currentPassword.value,
        e.target.elements.newPassword.value,
      );
      if (ok) {
        e.target.reset();
        U.toast("Password changed.");
      } else {
        U.toast(MeowStore.error());
        button.disabled = false;
      }
    }
    if (
      e.target.id === "delete-account-form" &&
      MeowI18n.confirm("Delete your account permanently?")
    ) {
      button.disabled = true;
      if (await MeowStore.deleteAccount(e.target.elements.password.value))
        location.href = "index.html";
      else {
        if (MeowStore.error().startsWith("Remove your listings, applications and diaries before deleting this account.")) {
          showAccountDeletionBlockers();
        } else {
          U.toast(MeowStore.error());
        }
        button.disabled = false;
      }
    }
  });
  function openApplication(id) {
    const app = myApps().find((a) => a.id === id);
    if (!app) return;
    document.getElementById("edit-application-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "edit-application-dialog";
    dialog.className = "dialog";
    dialog.innerHTML = `<div class="dialog-inner"><h2>Edit application</h2><form id="edit-application-form">
      <div class="field"><label for="update-app-name">Contact name</label><input id="update-app-name" name="name" required minlength="2" maxlength="60" value="${esc(app.name)}"></div>
      <div class="field"><label for="update-app-email">Email address</label><input id="update-app-email" name="email" type="email" required value="${esc(app.email)}"></div>
      <div class="field"><label for="update-app-experience">Experience</label><select id="update-app-experience" name="experience">${["First-time adopter", "Previously cared for a cat", "Currently have cats"].map((x) => `<option ${x === app.experience ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label for="update-app-home">Home description</label><textarea id="update-app-home" name="home" maxlength="1000">${esc(app.home)}</textarea></div>
      <div class="field"><label for="update-app-reason">Adoption plans</label><textarea id="update-app-reason" name="reason" maxlength="1500">${esc(app.reason)}</textarea></div>
      <p class="form-error" role="alert"></p><div class="button-row"><button class="btn btn-small" type="submit">Save application</button><button class="btn btn-outline btn-small" type="button" data-close>Cancel</button></div></form></div>`;
    document.body.append(dialog);
    dialog.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const button = e.target.querySelector("[type=submit]");
      button.disabled = true;
      const ok = await MeowStore.editApplication(
        id,
        Object.fromEntries(new FormData(e.target)),
      );
      button.disabled = false;
      if (ok) {
        dialog.close();
        render();
        U.toast("Application saved.");
      } else
        dialog.querySelector(".form-error").textContent = MeowI18n.t(
          MeowStore.error(),
        );
    });
    dialog.showModal();
  }
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
  document
    .getElementById("diary-form")
    .addEventListener("submit", async (e) => {
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
      const button = document.getElementById("save-diary");
      button.disabled = true;
      const ok = await MeowStore.saveStory(details, editStoryId);
      button.disabled = false;
      if (ok) {
        document.getElementById("diary-dialog").close();
        setTab("diaries");
        U.toast("Diary saved.");
      } else
        document.getElementById("diary-error").textContent = MeowStore.error();
    });
  render();
  const params = new URLSearchParams(location.search);
  if (params.has("sent")) U.toast("Your application has been sent.");
  if (params.has("published")) U.toast("Your listing has been saved.");
});
