/* data.js：静态品种选项、准备清单和匹配问卷。业务数据由 API 返回。 */
window.MeowData = {
  // 筛选页与发布页共用品种目录；渐层作为英短的毛色细分。
  breedGroups: [
    {
      label: "Domestic and mixed cats",
      breeds: ["Domestic Shorthair", "Domestic Longhair", "Mixed / Unknown"],
    },
    {
      label: "Short-haired breeds",
      breeds: [
        "British Shorthair",
        "British Shorthair (Golden Shaded)",
        "British Shorthair (Silver Shaded)",
        "American Shorthair",
        "Siamese",
        "Bengal",
        "Russian Blue",
        "Exotic Shorthair",
      ],
    },
    {
      label: "Long-haired breeds",
      breeds: [
        "Ragdoll",
        "Persian",
        "Maine Coon",
        "Norwegian Forest Cat",
        "Siberian",
      ],
    },
    { label: "Hairless breeds", breeds: ["Sphynx"] },
  ],
  checklist: [
    "Agree on care responsibilities at home",
    "Check that your home permits cats",
    "Prepare secure windows and doors",
    "Set up a quiet settling-in room",
    "Prepare a carrier, litter tray and bowls",
    "Plan food, play and ongoing care",
    "Arrange a first veterinary appointment",
  ],
  questions: [
    {
      key: "energy",
      title: "Preferred energy level?",
      options: [
        ["calm", "Calm"],
        ["active", "Active"],
        ["any", "No preference"],
      ],
    },
    {
      key: "experience",
      title: "Cat-care experience?",
      options: [
        ["new", "First-time adopter"],
        ["experienced", "Experienced adopter"],
      ],
    },
    {
      key: "care",
      title: "Grooming preference?",
      options: [
        ["easy", "Simple routine"],
        ["regular", "Regular grooming"],
      ],
    },
    {
      key: "pets",
      title: "Other pets at home?",
      options: [
        ["yes", "Yes"],
        ["no", "No"],
      ],
    },
    {
      key: "age",
      title: "Preferred age?",
      options: [
        ["kitten", "Kitten · under 1 year"],
        ["adult", "Adult · 1–6 years"],
        ["senior", "Senior · 7+ years"],
        ["any", "Any age"],
      ],
    },
  ],
};
