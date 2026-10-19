/* stories.js：公开日记列表与全文弹窗。私密日记只在作者个人中心展示。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI,
    esc = U.escapeHTML;
  const stories = MeowStore.stories()
    .filter((s) => s.public)
    .sort((a, b) => b.created.localeCompare(a.created));
  document.getElementById("stories-grid").innerHTML =
    stories
      .map(
        (s) =>
          `<article class="story-card"><img src="${U.safeImage(s.image)}" alt="${esc(s.title)}" loading="lazy"><div class="story-body"><span class="pill">${s.catId ? `Life with ${esc(MeowStore.cat(s.catId)?.name || "a companion")}` : "From the community"}</span><h3>${esc(s.title)}</h3><p>${esc(s.text.slice(0, 130))}${s.text.length > 130 ? "…" : ""}</p><span class="story-meta">${esc(s.author)} · ${esc(s.created)}</span><button class="text-link" type="button" data-story="${esc(s.id)}">Read this story ${U.icon("arrow")}</button></div></article>`,
      )
      .join("") || U.empty("No public diaries", "");
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-story]");
    if (!button) return;
    const s = MeowStore.stories().find(
      (s) => s.id === button.dataset.story && s.public,
    );
    if (!s) {
      U.toast("This diary is no longer public.");
      return;
    }
    document.getElementById("story-title").textContent = s.title;
    document.getElementById("story-content").innerHTML =
      `<img class="story-full-image" src="${U.safeImage(s.image)}" alt="${esc(s.title)}"><p class="story-meta">${esc(s.author)} · ${esc(s.created)}</p>${s.text
        .split("\n")
        .filter(Boolean)
        .map((p) => `<p>${esc(p)}</p>`)
        .join(
          "",
        )}${s.catId ? `<a class="text-link" href="cat.html?id=${encodeURIComponent(s.catId)}">Meet ${esc(MeowStore.cat(s.catId)?.name || "this companion")} ↗</a>` : ""}`;
    document.getElementById("story-dialog").showModal();
  });
});
