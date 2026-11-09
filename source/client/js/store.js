/* store.js：Fetch API 数据适配层。页面读取内存中的最新服务器结果，修改通过 API 写入 SQLite。
 * ready 等待首次加载；这里不保存账号、申请或日记到 localStorage。 */
window.MeowStore = (() => {
  let state = {
    user: null,
    cats: [],
    applications: [],
    stories: [],
    favourites: [],
    checklist: [],
  };
  let lastError = "";
  async function request(path, method = "GET", body) {
    let response;
    try {
      response = await fetch("/api" + path, {
        method,
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "MeowHome",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw Error(
        "Cannot connect to the server. Open MeowHome through its local server address.",
      );
    }
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw Error(data?.error || "The server could not complete this request.");
    return data;
  }
  async function refresh() {
    const user = await request("/auth/me");
    const isDiscoverPage = location.pathname.endsWith("/discover.html");
    const [cats, stories, applications, favourites, checklist] =
      await Promise.all([
        isDiscoverPage ? state.cats : request("/cats"),
        request("/stories"),
        user ? request("/applications") : [],
        user ? request("/favourites") : [],
        user ? request("/checklist") : [],
      ]);
    state = { user, cats, stories, applications, favourites, checklist };
  }
  async function change(path, method, body) {
    lastError = "";
    try {
      await request(path, method, body);
      await refresh();
      return true;
    } catch (error) {
      lastError = error.message;
      return false;
    }
  }
  const ready = refresh()
    .then(() => true)
    .catch((error) => {
      lastError = error.message;
      return false;
    });
  return {
    ready,
    refresh,
    error: () => lastError,
    user: () => state.user,
    cats: () => state.cats,
    cat: (id) => state.cats.find((cat) => cat.id === id) || null,
    applications: () => state.applications,
    stories: () => state.stories,
    favourites: () => state.favourites,
    checklist: () => state.checklist,
    async searchCats(filters) {
      const query = new URLSearchParams(filters);
      const result = await request("/cats?" + query.toString());
      state = { ...state, cats: result.items };
      return result;
    },
    async register(name, email, password) {
      await request("/auth/register", "POST", { name, email, password });
    },
    async signIn(email, password) {
      await request("/auth/login", "POST", { email, password });
    },
    signOut: () => change("/auth/logout", "POST", {}),
    updateProfile: (name, email, avatar) =>
      change("/profile", "PATCH", { name, email, avatar }),
    changePassword: (currentPassword, newPassword) =>
      change("/profile/password", "PATCH", { currentPassword, newPassword }),
    deleteAccount: (password) => change("/profile", "DELETE", { password }),
    toggleFavourite(id) {
      return change(
        "/favourites/" + encodeURIComponent(id),
        state.favourites.includes(id) ? "DELETE" : "PUT",
        {},
      );
    },
    setChecklist: (item, checked) =>
      change("/checklist/" + item, "PUT", { checked }),
    async apply(catId, details) {
      const ok = await change("/applications", "POST", { catId, ...details });
      return ok ? null : lastError;
    },
    editApplication: (id, details) =>
      change("/applications/" + encodeURIComponent(id), "PUT", details),
    updateApplication: (id, status) =>
      change("/applications/" + encodeURIComponent(id) + "/status", "PATCH", {
        status,
      }),
    deleteApplication: (id) =>
      change("/applications/" + encodeURIComponent(id), "DELETE", {}),
    saveCat: (details, id) =>
      change(
        "/cats" + (id ? "/" + encodeURIComponent(id) : ""),
        id ? "PUT" : "POST",
        details,
      ),
    deleteCat: (id) => change("/cats/" + encodeURIComponent(id), "DELETE", {}),
    saveStory: (details, id) =>
      change(
        "/stories" + (id ? "/" + encodeURIComponent(id) : ""),
        id ? "PUT" : "POST",
        details,
      ),
    deleteStory: (id) =>
      change("/stories/" + encodeURIComponent(id), "DELETE", {}),
  };
})();
