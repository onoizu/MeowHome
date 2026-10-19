/* home.js：首页纯照片网格。电脑悬停 / 键盘聚焦显示资料；触屏首次点按显示、再次点按进入详情。 */
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("featured-cats"),
    U = MeowUI,
    esc = U.escapeHTML;
  const cats = MeowStore.cats()
    .filter((cat) => cat.status === "available")
    .slice(0, 6);
  grid.innerHTML =
    cats
      .map(
        (cat) =>
          `<article class="home-cat"><a class="home-cat-link" href="cat.html?id=${encodeURIComponent(cat.id)}" aria-label="Meet ${esc(cat.name)}"><img src="${U.safeImage(cat.image)}" alt="${esc(cat.name)}, ${esc(cat.breed)}" loading="lazy"><div class="home-cat-info"><h3 data-no-translate>${esc(cat.name)}</h3><p>${esc(cat.gender)} · ${U.age(cat)}</p><p>${esc(cat.breed)}</p><p>${esc(cat.location)}</p><span class="home-cat-action">View profile</span></div></a></article>`,
      )
      .join("") || U.empty("No cats available", "");
  grid.addEventListener("click", (event) => {
    const link = event.target.closest(".home-cat-link");
    if (!link) return;
    const touch =
      event.pointerType === "touch" ||
      (window.matchMedia("(hover: none)").matches && event.detail > 0);
    if (!touch) return;
    const item = link.closest(".home-cat");
    if (!item.classList.contains("is-revealed")) {
      event.preventDefault();
      grid
        .querySelectorAll(".is-revealed")
        .forEach((cat) => cat.classList.remove("is-revealed"));
      item.classList.add("is-revealed");
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".home-cat"))
      grid
        .querySelectorAll(".is-revealed")
        .forEach((cat) => cat.classList.remove("is-revealed"));
  });
  grid.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
      grid
        .querySelectorAll(".is-revealed")
        .forEach((cat) => cat.classList.remove("is-revealed"));
  });
});
