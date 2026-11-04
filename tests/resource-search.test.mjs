import test from "node:test";
import assert from "node:assert/strict";
import {
  searchResources,
  navigationResources,
} from "../src/client/resource-search.js";

const items = [
  {
    name: "Engineering award",
    description: "For students with an interest in NASA",
    type: "scholarships",
    category: "merit",
  },
  { name: "NASA", description: "Student internships", type: "internships" },
  {
    name: "NASA early career",
    description: "Engineering programs",
    type: "internships",
  },
  {
    name: "Café Apartments",
    description: "Housing near Austin, Texas",
    type: "housing",
  },
];
test("global search ranks exact provider names above mentions and keeps source records intact", () => {
  const before = JSON.stringify(items);
  assert.deepEqual(
    searchResources(items, "NASA").map((x) => x.name),
    ["NASA", "NASA early career", "Engineering award"],
  );
  assert.equal(JSON.stringify(items), before);
});
test("search finds multiple words across names, descriptions and resource types", () => {
  assert.deepEqual(
    searchResources(items, "Texas housing").map((x) => x.name),
    ["Café Apartments"],
  );
  assert.deepEqual(
    searchResources(items, "engineering internships").map((x) => x.name),
    ["NASA early career"],
  );
  assert.deepEqual(searchResources(items, "Texas NASA"), []);
});
test("accents, case and punctuation do not hide matches; empty and absent queries stay empty", () => {
  assert.equal(searchResources(items, "CAFE")[0].name, "Café Apartments");
  assert.equal(
    searchResources(items, "  NASA—early  ")[0].name,
    "NASA early career",
  );
  assert.deepEqual(searchResources(items, "  "), []);
  assert.deepEqual(searchResources(items, "unlisted provider"), []);
});
test("students can find FAFSA, resumes and campus services alongside directory records", () => {
  assert.equal(
    searchResources(navigationResources, "FAFSA")[0].page,
    "financial-aid.html",
  );
  assert.equal(
    searchResources(navigationResources, "resume")[0].page,
    "career-guides.html",
  );
  assert.equal(
    searchResources(navigationResources, "food")[0].page,
    "wellbeing.html",
  );
  assert.ok(
    navigationResources.every(
      (item) => item.internal && !item.url.includes(":"),
    ),
  );
});
