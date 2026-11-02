/* login.js：注册和密码登录，成功后由服务器设置 Session cookie。 */
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await MeowStore.ready)) return;
  let register = false;
  const form = document.getElementById("account-form");
  const button = document.getElementById("profile-submit");
  const error = document.getElementById("login-error");
  function next() {
    const target =
      new URLSearchParams(location.search).get("next") || "dashboard.html";
    const allowed =
      /^(?:index|discover|cat|match|rehome|guides|stories|dashboard)\.html(?:\?[^#]*)?$/;
    location.href = allowed.test(target) ? target : "dashboard.html";
  }
  function mode(value) {
    register = value;
    document.getElementById("register-prompt").hidden = value;
    document.getElementById("name-field").hidden = !value;
    document.getElementById("confirm-field").hidden = !value;
    form.elements.name.required = value;
    form.elements.confirm.required = value;
    form.elements.password.autocomplete = value
      ? "new-password"
      : "current-password";
    for (const id of ["register-tab", "sign-in-tab"]) {
      const active = (id === "register-tab") === value;
      document.getElementById(id).classList.toggle("active", active);
      document.getElementById(id).setAttribute("aria-selected", active);
    }
    button.textContent = value ? "Register" : "Sign in";
    error.textContent = "";
  }
  document
    .getElementById("register-tab")
    .addEventListener("click", () => mode(true));
  document
    .getElementById("sign-in-tab")
    .addEventListener("click", () => mode(false));
  document.getElementById("register-link").addEventListener("click", () => {
    mode(true);
    form.elements.name.focus();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.textContent = "";
    if (
      register &&
      form.elements.password.value !== form.elements.confirm.value
    ) {
      error.textContent = MeowI18n.t("Passwords do not match.");
      return;
    }
    button.disabled = true;
    try {
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      if (register)
        await MeowStore.register(
          form.elements.name.value.trim(),
          email,
          password,
        );
      else await MeowStore.signIn(email, password);
      next();
    } catch (err) {
      error.textContent = MeowI18n.t(err.message);
    } finally {
      button.disabled = false;
    }
  });
});
