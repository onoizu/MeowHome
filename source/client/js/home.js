/* home.js：首页分区动效、年龄筛选、领养步骤和数据库照片。
 * IntersectionObserver 做一次性渐入；requestAnimationFrame 合并滚动更新，无动画库。 */
document.addEventListener("DOMContentLoaded", async () => {
  const U = MeowUI;
  const esc = U.escapeHTML;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const movingPhotos = [...document.querySelectorAll("[data-parallax]")];
  let frame = null;

  // 内容默认可见，只有支持观察器的设备才启用进入视口的渐入效果。
  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
        )
      : null;
  function observeReveals(parent = document) {
    parent.querySelectorAll("[data-reveal]").forEach((element) => {
      if (motionPreference.matches || !revealObserver)
        element.classList.add("is-visible");
      else revealObserver.observe(element);
    });
  }
  function updateScroll() {
    frame = null;
    const height = innerHeight;
    if (motionPreference.matches) return;
    movingPhotos.forEach((photo) => {
      const bounds = photo.parentElement.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > height) return;
      const distance =
        photo.dataset.parallax === "hero"
          ? Math.max(0, Math.min(65, -bounds.top * 0.13))
          : Math.max(
              -25,
              Math.min(
                25,
                (height / 2 - bounds.top - bounds.height / 2) * 0.055,
              ),
            );
      photo.style.setProperty("--image-shift", distance.toFixed(1) + "px");
    });
  }
  function requestScrollUpdate() {
    if (frame === null) frame = requestAnimationFrame(updateScroll);
  }
  function setMotionPreference() {
    document.documentElement.classList.toggle(
      "home-motion",
      !motionPreference.matches && !!revealObserver,
    );
    if (motionPreference.matches)
      movingPhotos.forEach((photo) =>
        photo.style.removeProperty("--image-shift"),
      );
    observeReveals();
    requestScrollUpdate();
  }
  setMotionPreference();
  motionPreference.addEventListener("change", setMotionPreference);
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  window.addEventListener("load", requestScrollUpdate);

  // 点击展开某一步时，关闭其他步骤，并淡入对应照片。
  const steps = [...document.querySelectorAll(".home-process-step")];
  steps.forEach((step) =>
    step.addEventListener("toggle", () => {
      if (!step.open) return;
      steps.forEach((other) => {
        if (other !== step) other.open = false;
      });
      const index = Number(step.dataset.step);
      document.querySelectorAll("[data-step-image]").forEach((photo) => {
        photo.classList.toggle(
          "is-active",
          Number(photo.dataset.stepImage) === index,
        );
      });
      document.getElementById("home-step-indicator").textContent =
        `0${index + 1} / 03`;
      document.getElementById("home-step-progress").style.width =
        ((index + 1) / steps.length) * 100 + "%";
    }),
  );

  if (!(await MeowStore.ready)) return;
  const grid = document.getElementById("featured-cats");
  const cats = MeowStore.cats().filter((cat) => cat.status === "available");
  const filterButtons = [...document.querySelectorAll("[data-home-age]")];
  let age = "all";
  function renderCats() {
    const filtered = cats.filter(
      (cat) =>
        age === "all" ||
        (age === "kitten" && cat.months < 12) ||
        (age === "adult" && cat.months >= 12 && cat.months < 84) ||
        (age === "senior" && cat.months >= 84),
    );
    filterButtons.forEach((button) =>
      button.setAttribute("aria-pressed", button.dataset.homeAge === age),
    );
    grid.innerHTML =
      filtered
        .slice(0, 6)
        .map(
          (cat) => `
      <article class="home-cat" data-reveal="up">
        <a class="home-cat-link" href="cat.html?id=${encodeURIComponent(cat.id)}" aria-label="Meet ${esc(cat.name)}">
          <img src="${U.safeImage(cat.image)}" alt="${esc(cat.name)}, ${esc(cat.breed)}" loading="lazy">
          <div class="home-cat-info"><h3 data-no-translate>${esc(cat.name)}</h3><p>${esc(cat.gender)} · ${U.age(cat)}</p><p>${esc(cat.breed)}</p><p>${esc(cat.location)}</p><span class="home-cat-action">View profile</span></div>
        </a>
      </article>`,
        )
        .join("") ||
      U.empty("No cats available", "", "discover.html", "View all cats");
    observeReveals(grid);
    requestScrollUpdate();
  }
  filterButtons.forEach((button) =>
    button.addEventListener("click", () => {
      age = button.dataset.homeAge;
      renderCats();
    }),
  );
  renderCats();

  // 保留照片悬停资料；触屏先点按展开，第二次点按进入详情。
  grid.addEventListener("click", (event) => {
    const link = event.target.closest(".home-cat-link");
    if (!link) return;
    const touch =
      event.pointerType === "touch" ||
      (matchMedia("(hover: none)").matches && event.detail > 0);
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

  // 只展示真实保存且公开的日记；没有日记时保留写作入口，不添加虚构故事。
  const diaries = MeowStore.stories()
    .filter((story) => story.public)
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 3);
  if (diaries.length) {
    const container = document.getElementById("home-diaries-content");
    container.innerHTML = `<div class="home-diary-grid">${diaries
      .map(
        (story) => `
      <article class="home-diary-card" data-reveal="up">
        <a href="stories.html"><img src="${U.safeImage(story.image)}" alt="${esc(story.title)}" loading="lazy"></a>
        <h3 data-no-translate><a href="stories.html">${esc(story.title)}</a></h3>
        <p data-no-translate>${esc(story.author)} · ${esc(story.created.slice(0, 10))}</p>
      </article>`,
      )
      .join("")}</div>`;
    observeReveals(container);
  }
});
