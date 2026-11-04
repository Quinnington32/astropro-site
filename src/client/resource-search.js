const normalize = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export const navigationResources = [
  [
    "financial-aid",
    "Financial aid",
    "FAFSA, grants, loans, and official help paying for college.",
  ],
  [
    "career-guides",
    "Career guides",
    "Resume and cover letter templates, interview preparation, and career direction.",
  ],
  [
    "apply-to-college",
    "College applications",
    "Apply to college with Common App, ApplyTexas, and other official application systems.",
  ],
  [
    "tutoring",
    "Tutoring & study help",
    "Campus tutoring, writing support, and free learning resources.",
  ],
  [
    "wellbeing",
    "Wellbeing & basic needs",
    "Mental health, counseling, crisis support, food, and housing assistance.",
  ],
  [
    "money-basics",
    "Student money basics",
    "Budgeting, financial aid refunds, banking, and student tax basics.",
  ],
  [
    "mentorship",
    "Mentorship",
    "Find a mentor, explore mentoring programs, or register your interest.",
  ],
  [
    "school-resources",
    "Campus support",
    "Find your school’s financial aid, career, library, tutoring, and housing offices.",
  ],
  [
    "housing",
    "Off-campus housing",
    "Browse campus markets by college, city, or state.",
  ],
].map(([page, name, description]) => ({
  id: `guide-${page}`,
  name,
  description,
  type: "guides",
  page: `${page}.html`,
  url: `${page}.html`,
  internal: true,
}));

export function searchResources(items, query) {
  const phrase = normalize(query);
  if (!phrase) return [];
  const terms = phrase.split(/\s+/);
  return items
    .map((item, index) => {
      const name = normalize(item.name);
      const text = normalize(
        [
          item.name,
          item.description,
          item.category,
          item.categoryLabel,
          item.state,
          item.type,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!terms.every((term) => text.includes(term))) return null;
      const score =
        (name === phrase ? 100 : name.startsWith(phrase) ? 50 : 0) +
        terms.filter((term) => name.includes(term)).length * 5;
      return { item, score, index };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}
