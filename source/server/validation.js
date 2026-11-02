// validation.js：所有 API 输入在服务器重新检查，不依赖浏览器的 required 属性。
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function text(value, label, min = 1, max = 100) {
  if (typeof value !== "string") fail(`${label} is required.`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    fail(`${label} must contain ${min}-${max} characters.`);
  return result;
}
function email(value) {
  const result = text(value, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    fail("Please enter a valid email address.");
  return result;
}
function choice(value, allowed, label) {
  if (!allowed.includes(value)) fail(`Please choose a valid ${label}.`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be true or false.`);
  return value ? 1 : 0;
}
function catInput(body) {
  if (!Number.isInteger(body.months) || body.months < 1 || body.months > 360)
    fail("Age must be between 1 and 360 months.");
  return {
    name: text(body.name, "Cat name", 1, 60),
    breed: choice(
      body.breed,
      [
        "Domestic Shorthair",
        "Domestic Longhair",
        "Mixed / Unknown",
        "British Shorthair",
        "British Shorthair (Golden Shaded)",
        "British Shorthair (Silver Shaded)",
        "American Shorthair",
        "Siamese",
        "Bengal",
        "Russian Blue",
        "Exotic Shorthair",
        "Ragdoll",
        "Persian",
        "Maine Coon",
        "Norwegian Forest Cat",
        "Siberian",
        "Sphynx",
      ],
      "breed",
    ),
    months: body.months,
    gender: choice(body.gender, ["Male", "Female"], "gender"),
    location: choice(
      body.location,
      ["Kowloon", "Hong Kong Island", "New Territories"],
      "location",
    ),
    health: text(body.health, "Health notes", 1, 500),
    personality: choice(
      body.personality,
      ["Gentle", "Playful", "Independent"],
      "personality",
    ),
    energy: choice(body.energy, ["calm", "active"], "energy level"),
    care: choice(body.care, ["easy", "regular"], "care requirement"),
    beginner: boolean(body.beginner, "Beginner suitability"),
    otherPets: boolean(body.otherPets, "Other-pet suitability"),
    description: text(body.description, "Description", 30, 1500),
    requirements: text(body.requirements, "Adoption requirements", 15, 800),
  };
}
function applicationInput(body) {
  return {
    name: text(body.name, "Contact name", 2, 60),
    email: email(body.email),
    experience: choice(
      body.experience,
      [
        "First-time adopter",
        "Previously cared for a cat",
        "Currently have cats",
      ],
      "experience",
    ),
    home: text(body.home ?? "", "Home description", 0, 1000),
    reason: text(body.reason ?? "", "Adoption plans", 0, 1500),
  };
}
module.exports = {
  fail,
  text,
  email,
  choice,
  boolean,
  catInput,
  applicationInput,
};
