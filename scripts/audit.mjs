import { readFile, readdir, access } from "node:fs/promises";
import { load } from "cheerio";
import assert from "node:assert/strict";
const files = (await readdir("dist", { recursive: true })).filter((f) =>
  f.endsWith(".html"),
);
const docs = new Map();
for (const file of files)
  docs.set(file, load(await readFile("dist/" + file, "utf8")));
const errors = [];
let links = 0;
for (const [file, $] of docs) {
  const check = (condition, message) => {
    if (!condition) errors.push(`${file}: ${message}`);
  };
  check($("html").attr("lang") === "en", "missing document language");
  check($("main").length === 1, "expected one main landmark");
  check($("h1").length === 1, "expected one h1");
  check(!!$("meta[name=description]").attr("content"), "missing description");
  check(!!$("link[rel=canonical]").attr("href"), "missing canonical");
  check(!$("[style]").length, "unexpected inline styles");
  check(!$("script:not([src]):not([type=\"application/ld+json\"])").length, "unexpected inline scripts");
  const ids = new Set();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    check(!ids.has(id), `duplicate id ${id}`);
    ids.add(id);
  });
  for (const element of $(
    "a[href],script[src],link[href],img[src]",
  ).toArray()) {
    const el = $(element),
      href = el.attr("href") || el.attr("src");
    links++;
    check(href !== "#" && href !== "", "placeholder link");
    if (el.attr("target") === "_blank")
      check(
        (el.attr("rel") || "").includes("noopener"),
        "new-tab link missing noopener",
      );
    if (/^(https?:|mailto:|tel:|sms:)/.test(href)) continue;
    const url = new URL(href, "https://audit.local/" + file);
    const target = decodeURIComponent(url.pathname.slice(1)) || "index.html";
    if (target.startsWith("api/")) continue;
    try {
      await access("dist/" + target);
    } catch {
      check(false, `missing target ${href}`);
      continue;
    }
    if (url.hash && docs.has(target)) {
      const fragment = decodeURIComponent(url.hash.slice(1));
      check(
        docs.get(target)(`[id="${fragment.replaceAll('"', "")}" ]`).length > 0,
        `missing anchor ${href}`,
      );
    }
  }
  $("img").each((_, image) => {
    check($(image).attr("alt") !== undefined, "image missing alt text");
  });
  for (const input of $(
    "input:not([type=hidden]):not([type=checkbox]),select,textarea",
  ).toArray()) {
    const id = $(input).attr("id");
    check(
      !!$(input).attr("aria-label") ||
        (id && $(`label[for="${id}"]`).length > 0) ||
        $(input).parents("label").length > 0,
      "unlabelled form field",
    );
  }
  $("[aria-describedby]").each((_, el) => {
    for (const id of ($(el).attr("aria-describedby") || "").split(/\s+/))
      check(ids.has(id), `missing field hint ${id}`);
  });
}
// Every Available Rentals post must carry a photo (and alt text) so no card shows the initials placeholder.
// Exception: a post flagged photoPending (the source post had no usable photo) publishes with the placeholder until one is added.
for (const m of JSON.parse(await readFile("src/data/housing.json")))
  for (const p of m.properties)
    if (p.spotlight && !p.spotlight.photoPending && !((p.spotlight.photo && p.spotlight.photoAlt) || (p.photoApproved && p.photo && p.photoAlt)))
      errors.push(`Available Rentals post without a photo: ${p.id}`);
const catalog = JSON.parse(await readFile("dist/assets/catalog.json"));
const known = new Set();
for (const item of catalog) {
  if (known.has(item.id)) errors.push("Duplicate resource id " + item.id);
  known.add(item.id);
  if (
    !/^https:\/\//.test(item.url) &&
    !item.url.startsWith("school-resources.html?")
  )
    errors.push("Unsafe catalog link " + item.id);
  if (
    item.category === "no-essay" &&
    /requires an essay|submit a 500-word|250 words or fewer/i.test(
      item.description,
    )
  )
    errors.push("Essay in no-essay category " + item.id);
}
// Internship data rules: dated statuses need a review date; stale or lapsed records are reported as warnings.
{
  const internships = JSON.parse(await readFile("src/data/internships.json", "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  const warnings = [];
  for (const i of internships) {
    if (i.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(i.deadline)) errors.push("Internship deadline must be YYYY-MM-DD: " + i.id);
    if ((i.status === "open" || i.status === "closed") && !i.verifiedAt) errors.push("Internship marked " + i.status + " without a review date: " + i.id);
    if (i.status === "open" && !i.deadline) errors.push("Open internship without a deadline: " + i.id);
    if (!i.deadlineLabel) errors.push("Internship missing deadline note: " + i.id);
    if (i.status === "open" && i.deadline && i.deadline < today) warnings.push("Open internship past its deadline (update the record): " + i.id);
    if (i.verifiedAt) {
      const age = (Date.parse(today) - Date.parse(i.verifiedAt)) / 86400000;
      if (age > 120) warnings.push("Internship review older than 120 days: " + i.id);
    }
  }
  if (warnings.length) console.warn("Internship warnings (" + warnings.length + "):\n" + warnings.join("\n"));
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Audit passed: ${files.length} pages, ${links} links/assets, ${catalog.length} unique saveable records; labels, landmarks, metadata, and anchors valid.`,
);
