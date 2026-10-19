/* rehome.js：三步发布/编辑表单、逐步验证、图片压缩预览与本地保存。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI,
    form = document.getElementById("rehome-form");
  let step = 0,
    image = "",
    reading = false;
  const editId = new URLSearchParams(location.search).get("edit"),
    existing = editId ? MeowStore.cat(editId) : null;
  document.getElementById("rehome-login-note").hidden = !!MeowStore.user();
  if (
    editId &&
    (!existing ||
      existing.ownerId !== MeowStore.user()?.id ||
      !["available", "pending"].includes(existing.status))
  ) {
    form.innerHTML = U.empty(
      "This listing cannot be edited.",
      "Open your dashboard to manage your own available listings.",
      "dashboard.html?tab=listings",
      "My listings",
    );
    return;
  }
  if (existing) {
    for (const [key, value] of Object.entries(existing)) {
      if (form.elements[key]) form.elements[key].value = String(value);
    }
    image = existing.image;
    document.getElementById("cat-upload-preview").src = U.safeImage(image);
    document.getElementById("cat-upload-preview").hidden = false;
    document.querySelector(".page-head h1").textContent = "Edit listing";
    document.getElementById("publish-listing").textContent = "Save listing";
  }
  function details() {
    const values = Object.fromEntries(new FormData(form));
    return {
      name: values.name.trim(),
      breed: values.breed,
      months: Number(values.months),
      gender: values.gender,
      location: values.location,
      health: values.health.trim(),
      personality: values.personality,
      energy: values.energy,
      care: values.care,
      beginner: values.beginner === "true",
      otherPets: values.otherPets === "true",
      description: values.description.trim(),
      requirements: values.requirements.trim(),
      tags: [
        values.personality,
        values.beginner === "true"
          ? "First-time friendly"
          : "Experience preferred",
      ],
      image,
    };
  }
  function render() {
    document
      .querySelectorAll("[data-form-step]")
      .forEach((el, i) => (el.hidden = i !== step));
    document
      .querySelectorAll("[data-step-indicator]")
      .forEach((el, i) => el.classList.toggle("active", i <= step));
    document.getElementById("rehome-back").hidden = step === 0;
    document.getElementById("rehome-next").hidden = step === 2;
    document.getElementById("publish-listing").hidden = step !== 2;
    document.getElementById("rehome-error").textContent = "";
    if (step === 2) {
      const d = details(),
        esc = U.escapeHTML;
      document.getElementById("listing-review").innerHTML =
        `<img class="upload-preview" src="${U.safeImage(image)}" alt="Your listing photograph"><dl class="review-list"><dt>Name</dt><dd>${esc(d.name)}</dd><dt>Breed</dt><dd>${esc(d.breed)}</dd><dt>Age / Gender</dt><dd>${d.months} months · ${esc(d.gender)}</dd><dt>Location</dt><dd>${esc(d.location)}</dd><dt>Personality</dt><dd>${esc(d.personality)}</dd><dt>Health notes</dt><dd>${esc(d.health)}</dd><dt>Description</dt><dd>${esc(d.description)}</dd><dt>Adoption requirements</dt><dd>${esc(d.requirements)}</dd></dl>`;
    }
  }
  function validateStep() {
    const current = document.querySelector(`[data-form-step="${step}"]`);
    for (const field of current.querySelectorAll(
      "input:not([type=file]),select,textarea",
    )) {
      if (!field.reportValidity()) return false;
      if (
        (field.tagName === "TEXTAREA" || field.type === "text") &&
        field.required &&
        !field.value.trim()
      ) {
        field.setCustomValidity("Please enter a value.");
        field.reportValidity();
        field.addEventListener("input", () => field.setCustomValidity(""), {
          once: true,
        });
        return false;
      }
    }
    if (step === 0 && reading) {
      document.getElementById("image-error").textContent =
        "Please wait for the photograph to finish loading.";
      return false;
    }
    if (step === 0 && !image) {
      document.getElementById("image-error").textContent =
        "Please add a photograph before continuing.";
      return false;
    }
    return true;
  }
  document.getElementById("cat-image").addEventListener("change", async (e) => {
    const error = document.getElementById("image-error");
    error.textContent = "";
    if (!e.target.files[0]) return;
    reading = true;
    try {
      image = await U.readImage(e.target.files[0]);
      const preview = document.getElementById("cat-upload-preview");
      preview.src = image;
      preview.hidden = false;
    } catch (err) {
      error.textContent = err.message;
      e.target.value = "";
    } finally {
      reading = false;
    }
  });
  document.getElementById("rehome-next").addEventListener("click", () => {
    if (validateStep()) {
      step++;
      render();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  document.getElementById("rehome-back").addEventListener("click", () => {
    step = Math.max(0, step - 1);
    render();
  });
  // 不让浏览器在提交时聚焦已隐藏的步骤，由每步验证来处理。
  form.noValidate = true;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (step !== 2) {
      if (validateStep()) {
        step++;
        render();
      }
      return;
    }
    if (!document.getElementById("listing-consent").reportValidity()) return;
    if (!U.requireUser()) return;
    if (reading) return;
    const ok = MeowStore.saveCat(details(), existing?.id);
    if (ok) location.href = "dashboard.html?tab=listings&published=1";
    else
      document.getElementById("rehome-error").textContent =
        "The listing could not be saved. Please try a smaller photograph.";
  });
  render();
});
