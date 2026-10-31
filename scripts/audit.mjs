import { readFile, readdir, access } from "node:fs/promises";
import { load } from "cheerio";
import assert from "node:assert/strict";
const files = (await readdir("dist")).filter((f) => f.endsWith(".html"));
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
  check(!$("script:not([src])").length, "unexpected inline scripts");
  const ids = new Set();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    check(!ids.has(id), `duplicate id ${id}`);
    ids.add(id);
  });
  for (const element of $("a[href],script[src],link[href]").toArray()) {
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
}
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
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Audit passed: ${files.length} pages, ${links} links/assets, ${catalog.length} unique saveable records; labels, landmarks, metadata, and anchors valid.`,
);
