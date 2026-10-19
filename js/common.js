/* common.js：公共 SVG 图标、导航、提示、弹窗、猫咪卡片与小工具。
 * 所有输入在插入 HTML 前均使用 escapeHTML；本地演示不提供真正的权限隔离。 */
window.MeowUI = (() => {
  const paths = {
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield:
      '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
    home: '<path d="m3 10 9-8 9 8v11H3Z"/><path d="M9 21v-8h6v8"/>',
    paw: '<ellipse cx="12" cy="16" rx="6" ry="5"/><ellipse cx="4.5" cy="10" rx="2" ry="2.7"/><ellipse cx="9" cy="5" rx="2" ry="2.7"/><ellipse cx="15" cy="5" rx="2" ry="2.7"/><ellipse cx="19.5" cy="10" rx="2" ry="2.7"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
    book: '<path d="M12 5c-4-3-10-2-10-2v16s6-1 10 2c4-3 10-2 10-2V3s-6-1-10 2Zm0 0v16"/>',
    list: '<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
    logout: '<path d="M9 4H3v16h6m5-4 4-4-4-4m-6 4h13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
  };
  function icon(name) {
    return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.paw}</svg>`;
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function safeImage(value) {
    return /^(assets\/images\/[a-z0-9-]+\.jpg|data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+)$/.test(
      value || "",
    )
      ? value
      : "assets/images/hero.jpg";
  }
  function age(cat) {
    if (cat.months < 12) return `${cat.months} months`;
    const n = Math.floor(cat.months / 12);
    return `${n} ${n === 1 ? "year" : "years"}`;
  }
  function status(value) {
    const names = {
      available: "Looking for a home",
      reserved: "Adoption in progress",
      adopted: "Happily adopted",
      pending: "Pending review",
      contacting: "In conversation",
      accepted: "Accepted",
      rejected: "Not selected",
      closed: "Closed",
      withdrawn: "Withdrawn",
      completed: "Adoption complete",
      hidden: "Hidden",
    };
    return names[value] || value;
  }
  function badge(value) {
    return `<span class="pill ${["reserved", "pending", "contacting", "accepted"].includes(value) ? "warm" : ["closed", "withdrawn", "hidden", "rejected"].includes(value) ? "gray" : ""}">${escapeHTML(status(value))}</span>`;
  }
  function catCard(cat, reason = "") {
    const saved = MeowStore.favourites().includes(cat.id);
    return `<article class="cat-card"><div class="cat-image-wrap"><a href="cat.html?id=${encodeURIComponent(cat.id)}" aria-label="Meet ${escapeHTML(cat.name)}"><img class="cat-image" src="${safeImage(cat.image)}" alt="${escapeHTML(cat.name)}, ${escapeHTML(cat.breed)}" loading="lazy"></a><button class="icon-button ${saved ? "is-saved" : ""}" type="button" data-save="${escapeHTML(cat.id)}" aria-label="${saved ? "Unsave" : "Save"} ${escapeHTML(cat.name)}" aria-pressed="${saved}">${icon("heart")}</button></div><div class="cat-card-body"><div class="cat-card-title"><h3><a href="cat.html?id=${encodeURIComponent(cat.id)}">${escapeHTML(cat.name)}</a></h3><span>${escapeHTML(cat.gender)}</span></div><p>${escapeHTML(cat.breed)} · ${age(cat)}</p><div class="tags">${cat.tags
      .slice(0, 2)
      .map((t) => `<span class="tag">${escapeHTML(t)}</span>`)
      .join(
        "",
      )}</div>${reason ? `<p class="match-note">${escapeHTML(reason)}</p>` : ""}<div class="cat-card-foot"><span>${icon("pin")}${escapeHTML(cat.location)}</span><a href="cat.html?id=${encodeURIComponent(cat.id)}">Meet ${escapeHTML(cat.name)} ↗</a></div></div></article>`;
  }
  let toastTimer;
  function toast(message) {
    const box = document.getElementById("toast");
    box.textContent = message;
    box.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("visible"), 3500);
  }
  function requireUser() {
    if (MeowStore.user()) return true;
    location.href = `login.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}`;
    return false;
  }
  function empty(title, text, link = "discover.html", label = "Explore cats") {
    return `<div class="empty-state">${icon("paw")}<h3>${escapeHTML(title)}</h3>${text ? `<p>${escapeHTML(text)}</p>` : ""}<a class="btn btn-outline btn-small" href="${link}">${label}${icon("arrow")}</a></div>`;
  }
  function init() {
    // 共用品种目录：显式英文 value 不随界面翻译变化。
    document.querySelectorAll("select[data-breeds]").forEach((select) => {
      MeowData.breedGroups.forEach((group) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.breeds.forEach((breed) => {
          const option = document.createElement("option");
          option.value = breed;
          option.textContent = breed;
          optgroup.append(option);
        });
        select.append(optgroup);
      });
    });
    document
      .querySelectorAll("[data-icon]")
      .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".desktop-nav a").forEach((a) => {
      if (
        a.getAttribute("href") === page ||
        (page === "cat.html" && a.getAttribute("href") === "discover.html")
      ) {
        a.setAttribute("aria-current", "page");
        a.closest(".nav-dropdown")?.classList.add("is-current");
      }
    });
    const u = MeowStore.user(),
      account = document.getElementById("account-link");
    const profileNav = document.getElementById("profile-nav");
    if (profileNav) profileNav.hidden = !u;
    if (account) {
      account.href = "login.html";
      account.textContent = "Sign in";
      account.hidden = !!u;
    }
    // 点击下拉、外部点击、Escape 与方向键；桌面与手机共用同一份导航。
    const menu = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    const triggers = [...document.querySelectorAll(".nav-trigger")];
    function closeDropdowns(except = null) {
      triggers.forEach((trigger) => {
        if (trigger === except) return;
        trigger.setAttribute("aria-expanded", "false");
        document.getElementById(trigger.getAttribute("aria-controls")).hidden =
          true;
      });
    }
    function openDropdown(trigger) {
      closeDropdowns(trigger);
      trigger.setAttribute("aria-expanded", "true");
      document.getElementById(trigger.getAttribute("aria-controls")).hidden =
        false;
    }
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        if (trigger.getAttribute("aria-expanded") === "true") closeDropdowns();
        else openDropdown(trigger);
      });
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          openDropdown(trigger);
          document
            .getElementById(trigger.getAttribute("aria-controls"))
            .querySelector("a")
            .focus();
        }
      });
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-dropdown")) closeDropdowns();
      if (
        nav.classList.contains("is-open") &&
        !event.target.closest(".site-header")
      ) {
        nav.classList.remove("is-open");
        menu?.setAttribute("aria-expanded", "false");
        menu?.setAttribute("aria-label", "Open navigation");
        if (menu) menu.textContent = "Menu";
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const current = triggers.find(
        (t) => t.getAttribute("aria-expanded") === "true",
      );
      closeDropdowns();
      if (current) current.focus();
      else if (nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        menu?.setAttribute("aria-expanded", "false");
        menu?.setAttribute("aria-label", "Open navigation");
        if (menu) menu.textContent = "Menu";
        menu?.focus();
      }
    });
    nav.addEventListener("focusout", (event) => {
      if (!nav.contains(event.relatedTarget)) closeDropdowns();
    });
    menu?.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", open);
      menu.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation",
      );
      menu.textContent = open ? "Close" : "Menu";
      if (!open) closeDropdowns();
    });
    document.addEventListener("click", (event) => {
      const save = event.target.closest("[data-save]");
      if (save) {
        if (!requireUser()) return;
        const catId = save.dataset.save;
        if (MeowStore.toggleFavourite(catId)) {
          const active = MeowStore.favourites().includes(catId);
          document.querySelectorAll("[data-save]").forEach((b) => {
            if (b.dataset.save === catId) {
              b.classList.toggle("is-saved", active);
              b.setAttribute("aria-pressed", active);
              b.setAttribute(
                "aria-label",
                `${active ? "Unsave" : "Save"} ${MeowStore.cat(catId)?.name || "cat"}`,
              );
            }
          });
          toast(
            active
              ? "Added to your saved cats."
              : "Removed from your saved cats.",
          );
          document.dispatchEvent(new CustomEvent("favourites-changed"));
        }
      }
      const close = event.target.closest("[data-close]");
      if (close) close.closest("dialog").close();
    });
    document.querySelectorAll("dialog").forEach((d) =>
      d.addEventListener("click", (e) => {
        if (e.target === d) {
          const r = d.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            d.close();
        }
      }),
    );
  }
  async function readImage(file) {
    if (!file) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw Error("Please choose a JPG, PNG or WebP image.");
    if (file.size > 5 * 1024 * 1024)
      throw Error("Please choose an image smaller than 5 MB.");
    const url = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(Error("This image could not be read."));
      r.readAsDataURL(file);
    });
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(Error("This image could not be opened."));
      image.src = url;
    });
    const canvas = document.createElement("canvas"),
      scale = Math.min(1, 900 / image.width);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  }
  return {
    icon,
    escapeHTML,
    safeImage,
    age,
    status,
    badge,
    catCard,
    toast,
    requireUser,
    empty,
    init,
    readImage,
  };
})();
document.addEventListener("DOMContentLoaded", MeowUI.init);
