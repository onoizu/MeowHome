/* cat.js：读取详情 URL、展示资料与公开日记、校验并提交本地申请。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI,
    esc = U.escapeHTML,
    cat = MeowStore.cat(new URLSearchParams(location.search).get("id"));
  const user = MeowStore.user(),
    visible =
      cat &&
      (["available", "reserved", "adopted"].includes(cat.status) ||
        cat.ownerId === user?.id ||
        user?.role === "admin");
  if (!visible) {
    document.getElementById("cat-detail").innerHTML = U.empty(
      "Cat listing not found",
      "The listing may be unavailable.",
    );
    return;
  }
  document.title = `Meet ${cat.name} | MeowHome`;
  document.getElementById("cat-breadcrumb").textContent = cat.name;
  const owner =
    MeowStore.users().find((u) => u.id === cat.ownerId)?.name ||
    "MeowHome foster community";
  document.getElementById("cat-detail").innerHTML =
    `<div class="detail-layout"><div><img class="detail-photo" src="${U.safeImage(cat.image)}" alt="${esc(cat.name)}, ${esc(cat.breed)}"><p class="detail-photo-caption">Fictional profile for the MeowHome student project.</p></div><section class="detail-copy">${U.badge(cat.status)}<h1 data-no-translate>${esc(cat.name)}</h1><div class="tags">${cat.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><dl class="facts"><div><dt>Age</dt><dd>${U.age(cat)}</dd></div><div><dt>Gender</dt><dd>${esc(cat.gender)}</dd></div><div><dt>Location</dt><dd>${esc(cat.location)}</dd></div><div><dt>Breed</dt><dd>${esc(cat.breed)}</dd></div><div><dt>Personality</dt><dd>${esc(cat.personality)}</dd></div><div><dt>Health notes</dt><dd>${esc(cat.health)}</dd></div></dl><div class="detail-story"><h2>Cat details</h2><p>${esc(cat.description)}</p></div><div class="detail-actions"><button class="btn" id="apply-button" type="button" ${cat.status !== "available" ? "disabled" : ""}>${cat.status === "available" ? "Apply to adopt" : esc(U.status(cat.status))}${U.icon("arrow")}</button><button class="icon-button ${MeowStore.favourites().includes(cat.id) ? "is-saved" : ""}" data-save="${esc(cat.id)}" aria-label="Save ${esc(cat.name)}" aria-pressed="${MeowStore.favourites().includes(cat.id)}" type="button">${U.icon("heart")}</button></div><div class="rehomer-box"><div class="avatar">${esc(owner[0])}</div><div><strong>Shared by ${esc(owner)}</strong><br><span class="muted">Applications are private to you and the rehomer.</span></div></div></section></div><div class="detail-lower"><section class="requirements"><h3>Adoption requirements</h3><p class="muted">${esc(cat.requirements)}</p></section><section class="adoption-steps"><h3>Adoption process</h3><ol><li>Submit an adoption application.</li><li>Talk through care needs and arrange a meeting.</li><li>Prepare your home and agree the handover.</li></ol><a class="text-link" href="guides.html">Care guides ↗</a></section></div>`;
  document.getElementById("related-cats").innerHTML = MeowStore.cats()
    .filter((c) => c.id !== cat.id && c.status === "available")
    .slice(0, 4)
    .map((c) => U.catCard(c))
    .join("");
  const diaries = MeowStore.stories().filter(
    (s) => s.catId === cat.id && s.public,
  );
  if (diaries.length) {
    document.getElementById("cat-diary-section").hidden = false;
    document.getElementById("cat-diaries").innerHTML = diaries
      .map(
        (s) =>
          `<article class="story-card"><img src="${U.safeImage(s.image)}" alt="${esc(s.title)}" loading="lazy"><div class="story-body"><span class="pill">Life with ${esc(cat.name)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><span class="story-meta">${esc(s.author)} · ${esc(s.created)}</span></div></article>`,
      )
      .join("");
  }
  const form = document.getElementById("application-form");
  document.getElementById("apply-button").addEventListener("click", () => {
    if (!U.requireUser()) return;
    if (MeowStore.user().id === cat.ownerId) {
      U.toast(
        "This is your listing. Manage incoming applications in your dashboard.",
      );
      return;
    }
    if (
      MeowStore.applications().some(
        (a) =>
          a.catId === cat.id &&
          a.userId === MeowStore.user().id &&
          ["pending", "contacting", "accepted", "completed"].includes(a.status),
      )
    ) {
      U.toast("You already have an active application. Check your dashboard.");
      return;
    }
    document.getElementById("apply-title").textContent = "Adoption application";
    form.elements.name.value = MeowStore.user().name;
    form.elements.email.value = MeowStore.user().email;
    document.getElementById("application-dialog").showModal();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const details = Object.fromEntries(new FormData(form));
    Object.keys(details).forEach((k) => (details[k] = details[k].trim()));
    if (details.home.length < 10 || details.reason.length < 15) {
      document.getElementById("application-error").textContent =
        "Describe your home in at least 10 characters and your adoption plans in at least 15 characters.";
      return;
    }
    const error = MeowStore.apply(cat.id, details);
    if (error) {
      document.getElementById("application-error").textContent = error;
      return;
    }
    location.href = "dashboard.html?tab=applications&sent=1";
  });
});
