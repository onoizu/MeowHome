/* i18n.js：无需框架的英文 / 繁體中文切换。
 * 字典独立放在 translations.js；保留原始英文，切换时不刷新、不重建表单。
 * 只转换界面文字及提示属性，不修改输入值、选项值、ID、URL 或本地业务资料。
 * MutationObserver 让动态卡片、弹窗和提示也采用当前语言。 */
window.MeowI18n = (() => {
  const KEY = "meowhome-language";
  const dictionary = window.MeowTranslations;
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const reverse = new Map(
    Object.entries(dictionary).map(([en, zh]) => [zh, en]),
  );
  const ignored =
    "script,style,svg,textarea,[contenteditable],[data-no-translate]";
  const attributes = ["placeholder", "aria-label", "title", "alt", "label"];
  const normalize = (text) => text.replace(/\s+/g, " ").trim();
  let language = "en",
    observer,
    queued = false;
  try {
    if (localStorage.getItem(KEY) === "zh-Hant") language = "zh-Hant";
  } catch {}
  function t(text) {
    const value = normalize(String(text));
    if (language === "en") return reverse.get(value) || value;
    if (dictionary[value]) return dictionary[value];
    if (reverse.has(value)) return value;
    // 示例日记卡片使用截断摘要，沿用对应完整示例文案的译文。
    if (value.endsWith("…")) {
      const prefix = value.slice(0, -1).trimEnd();
      const key = Object.keys(dictionary).find(
        (key) => prefix.length > 35 && key.startsWith(prefix),
      );
      if (key)
        return (
          dictionary[key].slice(0, 80) +
          (dictionary[key].length > 80 ? "…" : "")
        );
    }
    const rules = [
      [/^(\d+) cats found$/, (_, n) => `共 ${n} 隻貓咪符合條件`],
      [
        /^(\d+) companions? (looking for a home|found)(.*)$/,
        (_, n, status, suffix) =>
          `共 ${n} 隻${status === "looking for a home" ? "待領養貓咪" : "貓咪符合條件"}${suffix ? " · 慢慢了解牠們的個性。" : ""}`,
      ],
      [/^Hello, I'm (.+)\.$/, (_, name) => `你好，我是 ${name}。`],
      [/^Hello, (.+)\.$/, (_, name) => `你好，${name}。`],
      [/^I'd love to meet (.+)$/, (_, name) => `我想認識 ${name}`],
      [/^A first hello to (.+)\.$/, (_, name) => `向 ${name} 說聲你好。`],
      [/^Meet (.+?)( ↗)?$/, (_, name, arrow) => `認識 ${name}${arrow || ""}`],
      [
        /^(Unsave|Save) (.+)$/,
        (_, action, name) =>
          `${action === "Save" ? "收藏" : "取消收藏"} ${name}`,
      ],
      [/^Shared by (.+)$/, (_, name) => `由 ${name} 發布`],
      [/^Life with (.+)$/, (_, name) => `與 ${name} 的生活`],
      [/^Update (.+)'s story\.$/, (_, name) => `更新 ${name} 的故事。`],
      [
        /^Question (\d+) of (\d+)$/,
        (_, n, total) => `第 ${n} 題，共 ${total} 題`,
      ],
      [/^(\d+) of (\d+) ready$/, (_, n, total) => `已完成 ${n} / ${total} 項`],
      [/^Incoming applications \((\d+)\)$/, (_, n) => `收到的申請（${n}）`],
      [/^(\d+) applications?$/, (_, n) => `${n} 份申請`],
      [
        /^(Applied|Listed) (\d{4}-\d{2}-\d{2})$/,
        (_, type, date) =>
          `${type === "Applied" ? "申請於" : "發布於"} ${date}`,
      ],
      [/^(\d+) months?$/, (_, n) => `${n} 個月`],
      [/^(\d+) years?$/, (_, n) => `${n} 歲`],
      [/^Page (\d+)$/, (_, n) => `第 ${n} 頁`],
      [/^Page (\d+) of (\d+)$/, (_, n, total) => `第 ${n} 頁，共 ${total} 頁`],
    ];
    for (const [pattern, replace] of rules)
      if (pattern.test(value)) return value.replace(pattern, replace);
    // 组合资料仍保留原始英文值，只把可见标签分段翻译。
    for (const separator of [" | ", " · ", " → "])
      if (value.includes(separator))
        return value.split(separator).map(t).join(separator);
    if (value.includes(", ")) {
      const parts = value.split(", ");
      if (parts.some((p) => dictionary[p])) return parts.map(t).join("，");
    }
    return value;
  }
  function sourceFor(node, current, map) {
    const saved = map.get(node);
    if (saved && current === saved.output) return saved.source;
    return current;
  }
  function translateText(node) {
    if (
      !node.parentElement ||
      node.parentElement.closest(ignored) ||
      !normalize(node.nodeValue)
    )
      return;
    const source = sourceFor(node, node.nodeValue, originals);
    const core = normalize(source),
      translated = language === "en" ? reverse.get(core) || core : t(core);
    const output =
      translated === core
        ? source
        : source.replace(/\S(?:[\s\S]*\S)?/, translated);
    originals.set(node, { source, output });
    if (node.nodeValue !== output) node.nodeValue = output;
  }
  function apply() {
    queued = false;
    observer?.disconnect();
    // 没有显式 value 的 option 先固定英文数据值，翻译标签不会破坏筛选或表单。
    document.querySelectorAll("option:not([value])").forEach((option) => {
      option.value = normalize(option.textContent);
    });
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_TEXT,
    );
    let node;
    while ((node = walker.nextNode())) translateText(node);
    document
      .querySelectorAll("[placeholder],[aria-label],[title],[alt],[label]")
      .forEach((el) => {
        if (el.closest(ignored)) return;
        let saved = attributeOriginals.get(el) || {};
        for (const attr of attributes) {
          if (!el.hasAttribute(attr)) continue;
          const current = el.getAttribute(attr),
            prior = saved[attr];
          const source =
            prior && current === prior.output ? prior.source : current;
          const output =
            language === "en" ? reverse.get(source) || source : t(source);
          saved[attr] = { source, output };
          if (current !== output) el.setAttribute(attr, output);
        }
        attributeOriginals.set(el, saved);
      });
    document
      .querySelectorAll("[data-language]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          button.dataset.language === language,
        ),
      );
    observer?.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });
  }
  function schedule() {
    if (!queued) {
      queued = true;
      queueMicrotask(apply);
    }
  }
  function setLanguage(value) {
    if (!["en", "zh-Hant"].includes(value)) return;
    language = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    apply();
    document.dispatchEvent(
      new CustomEvent("language-changed", { detail: { language } }),
    );
  }
  function init() {
    observer = new MutationObserver(schedule);
    apply();
    document
      .querySelectorAll("[data-language]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          setLanguage(button.dataset.language),
        ),
      );
    window.addEventListener("storage", (e) => {
      if (e.key === KEY)
        setLanguage(e.newValue === "zh-Hant" ? "zh-Hant" : "en");
    });
  }
  document.addEventListener("DOMContentLoaded", init);
  return {
    t,
    apply,
    setLanguage,
    getLanguage: () => language,
    confirm: (message) => window.confirm(t(message)),
    alert: (message) => window.alert(t(message)),
  };
})();
