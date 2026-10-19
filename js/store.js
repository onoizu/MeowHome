/* store.js：纯前端 localStorage 演示适配层。不是后端、数据库或安全认证。
 * 所有页面通过此文件读写数据，未来可在此处替换为 Fetch API。
 * 不保存密码；仅保存演示身份、公开示例和本地输入。 */
window.MeowStore = (() => {
  const KEY = "meowhome-demo-v1";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function initial() {
    return {
      cats: clone(MeowData.cats),
      applications: clone(MeowData.applications),
      stories: clone(MeowData.stories),
      users: clone(MeowData.users),
      session: null,
      favourites: {},
      checklists: {},
    };
  }
  let state;
  try {
    state = JSON.parse(localStorage.getItem(KEY)) || initial();
  } catch {
    state = initial();
  }
  if (!Array.isArray(state.cats) || !Array.isArray(state.users))
    state = initial();
  // 补入新增示例猫咪；保留已有资料、申请、收藏及登录状态。
  const existingIds = new Set(state.cats.map((cat) => cat.id));
  const addedCats = MeowData.cats.filter((cat) => !existingIds.has(cat.id));
  if (addedCats.length) {
    state.cats.push(...clone(addedCats));
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时仍可浏览本次补入的示例。
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      MeowI18n.alert(
        "Your browser could not save this change. Storage may be full or disabled.",
      );
      return false;
    }
  }
  function commit(change) {
    const before = clone(state);
    change();
    if (save()) return true;
    state = before;
    return false;
  }
  const id = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const user = () => state.users.find((u) => u.id === state.session) || null;
  return {
    cats: () => clone(state.cats),
    cat: (catId) => clone(state.cats.find((c) => c.id === catId) || null),
    user,
    users: () => clone(state.users),
    signIn(userId) {
      return commit(() => {
        state.session = userId;
      });
    },
    register(name, email) {
      let u = state.users.find(
        (x) => x.email.toLowerCase() === email.toLowerCase(),
      );
      if (u)
        return {
          error: "This local profile already exists. Use the sign-in tab.",
        };
      u = { id: id("user"), name, email, role: "member" };
      return commit(() => {
        state.users.push(u);
        state.session = u.id;
      })
        ? { user: u }
        : { error: "Unable to save profile." };
    },
    signOut() {
      return commit(() => {
        state.session = null;
      });
    },
    favourites() {
      return state.favourites[user()?.id] || [];
    },
    toggleFavourite(catId) {
      const u = user();
      if (!u) return false;
      return commit(() => {
        let f = state.favourites[u.id] || [];
        state.favourites[u.id] = f.includes(catId)
          ? f.filter((x) => x !== catId)
          : [...f, catId];
      });
    },
    applications: () => clone(state.applications),
    stories: () => clone(state.stories),
    apply(catId, details) {
      const u = user(),
        cat = state.cats.find((c) => c.id === catId);
      if (!u) return "Please sign in first.";
      if (!cat || cat.status !== "available")
        return "This cat is not currently accepting applications.";
      if (cat.ownerId === u.id) return "You cannot apply for your own cat.";
      if (
        state.applications.some(
          (a) =>
            a.catId === catId &&
            a.userId === u.id &&
            ["pending", "contacting", "accepted", "completed"].includes(
              a.status,
            ),
        )
      )
        return "You already have an active application for this cat.";
      return commit(() =>
        state.applications.push({
          ...details,
          id: id("app"),
          catId,
          userId: u.id,
          status: "pending",
          created: today(),
        }),
      )
        ? null
        : "Could not save your application.";
    },
    updateApplication(appId, status) {
      const a = state.applications.find((x) => x.id === appId),
        u = user();
      if (!a || !u) return false;
      const c = state.cats.find((x) => x.id === a.catId);
      if (!c) return false;
      if (status === "withdrawn") {
        if (a.userId !== u.id || !["pending", "contacting"].includes(a.status))
          return false;
      } else {
        if (c.ownerId !== u.id) return false;
        const valid =
          (status === "contacting" && a.status === "pending") ||
          (status === "rejected" &&
            ["pending", "contacting"].includes(a.status)) ||
          (status === "accepted" &&
            ["pending", "contacting"].includes(a.status) &&
            c.status === "available") ||
          (status === "completed" &&
            a.status === "accepted" &&
            c.status === "reserved");
        if (!valid) return false;
      }
      return commit(() => {
        a.status = status;
        if (status === "accepted") c.status = "reserved";
        if (status === "completed") {
          c.status = "adopted";
          c.adopterId = a.userId;
          state.applications.forEach((other) => {
            if (
              other.catId === c.id &&
              other.id !== a.id &&
              ["pending", "contacting"].includes(other.status)
            )
              other.status = "closed";
          });
        }
      });
    },
    saveCat(details, catId) {
      const u = user();
      if (!u) return false;
      const existing = state.cats.find((c) => c.id === catId);
      if (existing && existing.ownerId !== u.id) return false;
      if (
        existing &&
        existing.status !== "available" &&
        existing.status !== "pending"
      )
        return false;
      return commit(() => {
        if (existing) Object.assign(existing, details);
        else
          state.cats.unshift({
            ...details,
            id: id("cat"),
            ownerId: u.id,
            status: "pending",
            created: today(),
          });
      });
    },
    moderate(catId, status) {
      if (user()?.role !== "admin") return false;
      return commit(() => {
        const c = state.cats.find((x) => x.id === catId);
        if (c && c.status === "pending") c.status = status;
      });
    },
    checklist() {
      return state.checklists[user()?.id || "guest"] || [];
    },
    toggleChecklist(index) {
      return commit(() => {
        const key = user()?.id || "guest",
          checked = state.checklists[key] || [];
        state.checklists[key] = checked.includes(index)
          ? checked.filter((i) => i !== index)
          : [...checked, index];
      });
    },
    saveStory(details, storyId) {
      const u = user();
      if (!u) return false;
      const existing = state.stories.find((s) => s.id === storyId);
      if (existing && existing.userId !== u.id) return false;
      if (
        !existing &&
        !state.cats.some(
          (c) =>
            c.id === details.catId &&
            c.adopterId === u.id &&
            c.status === "adopted",
        )
      )
        return false;
      return commit(() => {
        if (existing) Object.assign(existing, details);
        else
          state.stories.unshift({
            ...details,
            id: id("story"),
            userId: u.id,
            author: u.name,
            created: today(),
          });
      });
    },
    deleteStory(storyId) {
      if (
        !user() ||
        !state.stories.some((s) => s.id === storyId && s.userId === user().id)
      )
        return false;
      return commit(() => {
        state.stories = state.stories.filter((s) => s.id !== storyId);
      });
    },
    updateProfile(name) {
      if (!user()) return false;
      return commit(() => {
        user().name = name;
      });
    },
    reset() {
      state = initial();
      return save();
    },
  };
})();
