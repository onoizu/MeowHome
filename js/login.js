/* login.js：无密码本地演示身份。未来真实认证需替换为服务端 Session。 */
document.addEventListener("DOMContentLoaded", () => {
  let register = false;
  const form = document.getElementById("local-profile-form");
  function next() {
    const target =
      new URLSearchParams(location.search).get("next") || "dashboard.html";
    const allowed =
      /^(?:index|discover|cat|match|rehome|guides|stories|dashboard)\.html(?:\?[^#]*)?$/;
    location.href = allowed.test(target) ? target : "dashboard.html";
  }
  function mode(value) {
    register = value;
    document.getElementById("name-field").hidden = !value;
    form.elements.name.required = value;
    document.getElementById("register-tab").classList.toggle("active", value);
    document.getElementById("sign-in-tab").classList.toggle("active", !value);
    document
      .getElementById("register-tab")
      .setAttribute("aria-selected", value);
    document
      .getElementById("sign-in-tab")
      .setAttribute("aria-selected", !value);
    document.getElementById("profile-submit").innerHTML =
      (value ? "Register" : "Continue with local profile") +
      MeowUI.icon("arrow");
    document.getElementById("login-error").textContent = "";
  }
  document
    .getElementById("register-tab")
    .addEventListener("click", () => mode(true));
  document
    .getElementById("sign-in-tab")
    .addEventListener("click", () => mode(false));
  document.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", () => {
      if (MeowStore.signIn(b.dataset.demo)) next();
    }),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim(),
      name = form.elements.name.value.trim();
    let error = "";
    if (register) {
      if (name.length < 2)
        error = "Please enter a name with at least two characters.";
      else error = MeowStore.register(name, email).error || "";
    } else {
      const user = MeowStore.users().find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (!user)
        error = "No local profile found. Register or use a demo account.";
      else if (!MeowStore.signIn(user.id))
        error = "Unable to open this profile.";
    }
    if (error) document.getElementById("login-error").textContent = error;
    else next();
  });
});
