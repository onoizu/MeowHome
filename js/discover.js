/* discover.js：组合筛选、搜索防抖、排序、分页、URL 参数与浏览器前进后退。 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("filter-form"),
    search = document.getElementById("cat-search"),
    sort = document.getElementById("sort");
  const keys = ["breed", "age", "gender", "location", "status"];
  let page = 1,
    timer;
  const size = 6;
  // 手机端收起筛选；桌面始终显示左侧栏，CSS sticky 保持滚动位置。
  const panel = document.getElementById("filter-panel");
  const filterToggle = document.getElementById("filter-toggle");
  filterToggle.addEventListener("click", () => {
    const open = panel.classList.toggle("is-open");
    filterToggle.setAttribute("aria-expanded", open);
    filterToggle.textContent = open ? "Hide filters" : "Show filters";
  });
  function readURL() {
    const params = new URLSearchParams(location.search);
    keys.forEach((k) => {
      const el = form.elements[k];
      el.value = params.has(k)
        ? params.get(k)
        : k === "status"
          ? "available"
          : "";
      if (el.selectedIndex < 0) el.value = k === "status" ? "available" : "";
    });
    search.value = params.get("q") || "";
    sort.value = params.get("sort") || "newest";
    if (sort.selectedIndex < 0) sort.value = "newest";
    const requestedPage = Number(params.get("page"));
    page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    if (params.has("page") && params.get("page") !== String(page))
      updateURL(true);
  }
  function updateURL(replace = false) {
    const p = new URLSearchParams();
    keys.forEach((k) => {
      const v = form.elements[k].value;
      if (k === "status") {
        if (v !== "available") p.set(k, v);
      } else if (v) p.set(k, v);
    });
    if (search.value.trim()) p.set("q", search.value.trim());
    if (sort.value !== "newest") p.set("sort", sort.value);
    if (page > 1) p.set("page", page);
    const query = p.toString();
    history[replace ? "replaceState" : "pushState"](
      null,
      "",
      `discover.html${query ? "?" + query : ""}`,
    );
  }
  function render() {
    const filter = Object.fromEntries(new FormData(form)),
      query = search.value.trim().toLowerCase();
    let cats = MeowStore.cats()
      .filter((c) => ["available", "reserved", "adopted"].includes(c.status))
      .filter((c) => {
        if (filter.breed && c.breed !== filter.breed) return false;
        if (filter.gender && c.gender !== filter.gender) return false;
        if (filter.location && c.location !== filter.location) return false;
        if (filter.status && c.status !== filter.status) return false;
        if (filter.age === "kitten" && c.months >= 12) return false;
        if (filter.age === "adult" && (c.months < 12 || c.months >= 84))
          return false;
        if (filter.age === "senior" && c.months < 84) return false;
        return (
          !query ||
          [
            c.name,
            c.breed,
            c.personality,
            ...c.tags,
            ...[c.breed, c.personality, ...c.tags].map(
              (value) => MeowTranslations[value] || value,
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );
      });
    cats.sort((a, b) =>
      sort.value === "youngest"
        ? a.months - b.months
        : sort.value === "oldest"
          ? b.months - a.months
          : sort.value === "name"
            ? a.name.localeCompare(b.name)
            : b.created.localeCompare(a.created),
    );
    const pages = Math.max(1, Math.ceil(cats.length / size));
    if (page > pages) {
      page = pages;
      updateURL(true);
    }
    document.getElementById("result-count").textContent =
      `${cats.length} cats found`;
    document.getElementById("cat-results").innerHTML =
      cats
        .slice((page - 1) * size, page * size)
        .map((c) => MeowUI.catCard(c))
        .join("") ||
      MeowUI.empty(
        "No matching cats",
        "Try another combination or clear the filters.",
        "discover.html",
        "Clear filters",
      );
    document.getElementById("active-filters").innerHTML = keys
      .filter((k) => filter[k] && k !== "status")
      .map(
        (k) =>
          `<button class="filter-chip" data-clear="${k}" type="button">${MeowUI.escapeHTML(form.elements[k].selectedOptions[0].textContent)}<span aria-hidden="true">×</span><span class="sr-only">Remove filter</span></button>`,
      )
      .join("");
    // 即使筛选后只有一页，也显示页号；无结果时隐藏分页。
    const pagination = document.getElementById("pagination");
    pagination.hidden = !cats.length;
    pagination.innerHTML = cats.length
      ? `<button class="page-step" data-page="${page - 1}" type="button" ${page === 1 ? "disabled" : ""}>Previous</button>` +
        Array.from(
          { length: pages },
          (_, i) =>
            `<button class="page-number" data-page="${i + 1}" ${page === i + 1 ? 'aria-current="page"' : ""} aria-label="Page ${i + 1}" type="button">${i + 1}</button>`,
        ).join("") +
        `<button class="page-step" data-page="${page + 1}" type="button" ${page === pages ? "disabled" : ""}>Next</button><span class="pagination-summary">Page ${page} of ${pages}</span>`
      : "";
  }
  function change() {
    clearTimeout(timer);
    page = 1;
    updateURL();
    render();
  }
  form.addEventListener("change", change);
  sort.addEventListener("change", change);
  form.addEventListener("submit", (e) => e.preventDefault());
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(change, 250);
  });
  document.getElementById("clear-filters").addEventListener("click", () => {
    form.reset();
    search.value = "";
    sort.value = "newest";
    change();
  });
  document.getElementById("active-filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-clear]");
    if (b) {
      form.elements[b.dataset.clear].value = "";
      change();
    }
  });
  document.getElementById("pagination").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled || Number(b.dataset.page) === page) return;
    clearTimeout(timer);
    page = Number(b.dataset.page);
    updateURL();
    render();
    document
      .querySelector('.page-number[aria-current="page"]')
      ?.focus({ preventScroll: true });
    document.getElementById("result-count").scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
  window.addEventListener("popstate", () => {
    readURL();
    render();
  });
  readURL();
  render();
});
