/* match.js：五步单选问卷与可解释的规则匹配；无 AI 或外部服务。 */
document.addEventListener("DOMContentLoaded", () => {
  const U = MeowUI,
    questions = MeowData.questions;
  let step = 0;
  const answers = {};
  const intro = document.getElementById("quiz-intro"),
    card = document.getElementById("quiz-card"),
    results = document.getElementById("quiz-results");
  function render() {
    const q = questions[step];
    document.getElementById("quiz-step-label").textContent =
      `Question ${step + 1} of ${questions.length}`;
    document.getElementById("quiz-progress").value = step + 1;
    document.getElementById("question-title").textContent = q.title;
    document.getElementById("quiz-options").innerHTML =
      '<legend class="sr-only">Choose one answer</legend>' +
      q.options
        .map(
          ([value, title, detail]) =>
            `<label class="quiz-option"><input type="radio" name="answer" value="${value}" required ${answers[q.key] === value ? "checked" : ""}><span><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ""}</span></label>`,
        )
        .join("");
    document.getElementById("quiz-back").textContent = "Back";
    document.getElementById("quiz-next").innerHTML =
      (step === questions.length - 1 ? "View results" : "Continue") +
      U.icon("arrow");
  }
  document.getElementById("start-quiz").addEventListener("click", () => {
    intro.hidden = true;
    card.hidden = false;
    render();
  });
  document.getElementById("quiz-back").addEventListener("click", () => {
    const checked = document.querySelector("[name=answer]:checked");
    if (checked) answers[questions[step].key] = checked.value;
    if (step === 0) {
      card.hidden = true;
      intro.hidden = false;
    } else {
      step--;
      render();
    }
  });
  document.getElementById("quiz-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const choice = new FormData(e.target).get("answer");
    if (!choice) return;
    answers[questions[step].key] = choice;
    if (step < questions.length - 1) {
      step++;
      render();
    } else showResults();
  });
  function showResults() {
    const scored = MeowStore.cats()
      .filter((c) => c.status === "available")
      .filter((c) => answers.pets !== "yes" || c.otherPets)
      .map((c) => {
        let score = 0;
        const reasons = [];
        if (answers.energy === "any") {
          score += 1;
        } else if (c.energy === answers.energy) {
          score += 3;
          reasons.push(
            c.energy === "calm"
              ? "A calmer everyday companion"
              : "A playful personality",
          );
        }
        if (answers.experience === "new" && c.beginner) {
          score += 3;
          reasons.push("A starting point for a first-time adopter");
        }
        if (answers.experience === "experienced") score++;
        if (answers.care === "regular" || c.care === "easy") {
          score += 2;
          reasons.push(
            c.care === "easy"
              ? "A simpler coat-care routine"
              : "Regular grooming fits your plans",
          );
        }
        if (answers.pets === "yes" && c.otherPets) {
          score += 3;
          reasons.push("May suit a home with other pets");
        }
        const ageMatch =
          answers.age === "any" ||
          (answers.age === "kitten" && c.months < 12) ||
          (answers.age === "adult" && c.months >= 12 && c.months < 84) ||
          (answers.age === "senior" && c.months >= 84);
        if (ageMatch) {
          score += 2;
          if (answers.age !== "any")
            reasons.push("The life stage you are looking for");
        }
        return { cat: c, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    card.hidden = true;
    results.hidden = false;
    document.getElementById("matched-cats").innerHTML =
      scored
        .map((x) => U.catCard(x.cat, x.reasons.slice(0, 2).join(" · ")))
        .join("") ||
      U.empty(
        "No matching cats",
        "Try broadening your preferences or explore all available cats.",
      );
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.getElementById("retake-quiz").addEventListener("click", () => {
    step = 0;
    results.hidden = true;
    card.hidden = false;
    render();
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
