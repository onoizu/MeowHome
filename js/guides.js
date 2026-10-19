/* guides.js：固定入门文章、原生 dialog 阅读和本地准备清单；不需要 CMS。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI;
  const articles = {
    prepare: {
      title: "Adoption preparation",
      category: "Getting ready",
      image: "hero",
      intro: "Equipment, home safety and household responsibilities.",
      body: [
        [
          "A shared commitment",
          "Talk with everyone in your household about responsibilities, routine, and the ongoing time and costs involved. Check that your living arrangements allow cats.",
        ],
        [
          "Prepare the space",
          "Choose a quiet room and arrange the basics before arrival: a carrier, litter tray, bowls, a comfortable resting place and appropriate enrichment. Check windows, doors and places where a cat could become trapped.",
        ],
        [
          "Get to know the individual",
          "Ask the rehomer about the cat’s history, routine, temperament and care requirements. Discuss introductions and any existing pets. A preference quiz is only a starting point.",
        ],
      ],
    },
    settle: {
      title: "Settling in",
      category: "Settling in",
      image: "pepper",
      intro: "Introductions, routine and a quiet room.",
      body: [
        [
          "Keep the beginning quiet",
          "Provide a calm space and keep the household routine predictable. Avoid bringing everyone in to meet the cat at once.",
        ],
        [
          "Let the cat approach",
          "Allow hiding and resting without forcing interaction. Ask the rehomer about familiar bedding, food and routines that may help with the transition.",
        ],
        [
          "Stay in touch",
          "Keep contact details for the rehomer and your veterinary professional. If you have concerns about health or behaviour, seek appropriate professional advice.",
        ],
      ],
    },
    routine: {
      title: "Daily care",
      category: "Everyday care",
      image: "cleo",
      intro: "Feeding, litter care, grooming and play.",
      body: [
        [
          "Care is a daily habit",
          "Plan for feeding, fresh water, litter care, play, grooming where needed, and a clean resting space. Discuss the right routine for the individual cat with the rehomer and vet.",
        ],
        [
          "Make room for enrichment",
          "Offer appropriate play and places to scratch, rest and observe. Learn what your cat enjoys and respect their need for quiet time.",
        ],
        [
          "Keep a simple record",
          "Record useful observations and appointments. Your adoption diary can capture everyday milestones; medical questions belong with a veterinary professional.",
        ],
      ],
    },
    commitment: {
      title: "Long-term care",
      category: "Responsible adoption",
      image: "milo",
      intro: "Budget, travel arrangements and veterinary care.",
      body: [
        [
          "Plan for change",
          "Consider who will care for your cat during travel, a move, or changes to your schedule. Discuss a realistic long-term plan with your household.",
        ],
        [
          "Budget thoughtfully",
          "Plan for routine supplies and veterinary care, including unexpected costs. A cat’s needs continue beyond the excitement of adoption day.",
        ],
        [
          "Keep learning",
          "Use reliable care resources and build a relationship with your veterinary professional. Review your plans as your companion’s needs change.",
        ],
      ],
    },
  };
  document.getElementById("guide-grid").innerHTML = Object.entries(articles)
    .filter(([key]) => key !== "prepare")
    .map(
      ([key, a]) =>
        `<article class="guide-card"><img src="assets/images/${a.image}.jpg" alt="A cat at home" loading="lazy"><div><span class="pill">${a.category}</span><h3>${a.title}</h3><p>${a.intro}</p><button type="button" class="text-link" data-article="${key}">Read the guide ${U.icon("arrow")}</button></div></article>`,
    )
    .join("");
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-article]");
    if (!button) return;
    const a = articles[button.dataset.article];
    if (!a) return;
    document.getElementById("article-title").textContent = a.title;
    document.getElementById("article-content").innerHTML =
      `<p>${a.intro}</p>` +
      a.body
        .map(([title, text]) => `<h3>${title}</h3><p>${text}</p>`)
        .join("") +
      '<p class="source-note">Educational overview. For detailed information, visit <a href="https://www.spca.org.hk/zh-hant/adoption/which-pet-is-for-you/which-pet-is-for-you-cats/" target="_blank" rel="noopener noreferrer">SPCA’s cat care information</a> and consult your veterinary professional.</p>';
    document.getElementById("article-dialog").showModal();
  });
  function checklist() {
    const checked = MeowStore.checklist();
    document.getElementById("checklist-items").innerHTML = MeowData.checklist
      .map(
        (text, i) =>
          `<label class="checklist-item"><input type="checkbox" data-check="${i}" ${checked.includes(i) ? "checked" : ""}><span>${text}</span></label>`,
      )
      .join("");
    document.getElementById("checklist-count").textContent =
      `${checked.length} of ${MeowData.checklist.length} ready`;
    document.getElementById("checklist-progress").value = checked.length;
  }
  document.getElementById("checklist-items").addEventListener("change", (e) => {
    if (e.target.matches("[data-check]")) {
      MeowStore.toggleChecklist(Number(e.target.dataset.check));
      checklist();
    }
  });
  checklist();
});
