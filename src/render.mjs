export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const canonicalRoot = "https://students.goastropro.com/";
export const label = (value) =>
  ({
    "no-essay": "No essay",
    "need-based": "Need-based",
    leadership: "Leadership & service",
    creative: "Creative & video",
    major: "Major-specific",
    essay: "Essay / written response",
    merit: "Academic merit",
  })[value] || value;
export const dateLabel = (value) =>
  value
    ? new Date(value + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
export function statusFor(item, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(now);
  if (item.deadline && item.deadline < today) return "closed";
  if (item.opens && item.opens > today) return "upcoming";
  if (item.status === "upcoming") return "check-sponsor";
  return item.status || "check-sponsor";
}
const nav =
  '<a href="scholarships.html">Scholarships</a><a href="internships.html">Jobs & internships</a><a href="housing.html">Housing</a><a href="index.html#resources">All resources</a><a href="saved.html">Saved <span data-saved-count></span></a>';
export function page({
  title,
  description,
  body,
  file = "index.html",
  noindex = false,
}) {
  const url = canonicalRoot + (file === "index.html" ? "" : file);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}${file === "index.html" ? "" : " — AstroPro Student Resource Center"}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}"><meta name="theme-color" content="#122145"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${canonicalRoot}assets/social-card.png"><meta name="twitter:card" content="summary_large_image">${noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/site.css"><script type="module" src="assets/site.js"></script></head><body data-page="${escape(file.replace(".html", ""))}"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-row"><a class="wordmark" href="index.html" aria-label="AstroPro Student Resource Center home"><span class="brand-mark" aria-hidden="true">A<span>✦</span></span><span>AstroPro<small>Student Resource Center</small></span></a><nav class="desktop-nav" aria-label="Main navigation">${nav}</nav><details class="mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">${nav}<a href="school-resources.html">Find campus support</a></nav></details></div></header><main id="main" tabindex="-1">${body}</main><footer class="site-footer"><div class="wrap"><div class="footer-top"><a class="footer-brand" href="index.html">AstroPro <span>Student Resource Center</span></a><p>Practical resources. Your next step.</p></div><nav aria-label="Footer navigation"><a href="school-resources.html">Campus resources</a><a href="index.html#organizations">Submit a resource</a><a href="about.html">About & editorial standards</a><a href="privacy.html">Privacy</a><a href="data-requests.html">Your data</a><a href="unsubscribe.html">Email preferences</a><a href="mailto:admin@astropromarketing.com">Contact</a></nav><p class="fineprint">Free to browse. Applications, offers, and availability are controlled by the linked organizations. © ${new Date().getUTCFullYear()} AstroPro.</p></div></footer><div class="toast" role="status" aria-live="polite" id="toast"></div></body></html>`;
}
export const hero = (
  title,
  description,
  extra = "",
  kicker = "Student Resource Center",
) =>
  `<section class="page-hero"><div class="wrap"><p class="eyebrow">${escape(kicker)}</p><h1>${escape(title)}</h1><p class="lede">${escape(description)}</p>${extra}</div></section>`;
export const external = (url, text, cls = "link") =>
  `<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(text)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;
export const saveButton = (item) =>
  `<button class="save-button" type="button" data-save="${escape(item.id)}" aria-pressed="false" aria-label="Save ${escape(item.name)}"><span aria-hidden="true">＋</span> Save</button>`;
export function resourceCard(item, type) {
  const s = statusFor(item);
  const statusText =
    {
      closed: "Cycle closed",
      upcoming: "Upcoming",
      "check-sponsor": "Check current cycle",
      open: "Open when reviewed",
    }[s] || "Check current offer";
  return `<article class="resource-card listing-card" data-resource="${escape(item.id)}" data-category="${escape(item.category || "")}" data-status="${s}" data-deadline="${item.deadline || ""}" data-opens="${item.opens || ""}" data-search="${escape([item.name, item.description, item.category, item.categoryLabel, item.state].filter(Boolean).join(" ").toLowerCase())}"><div class="card-heading"><p class="tag">${escape(type === "discounts" ? item.category : label(item.category))}</p>${saveButton(item)}</div><h2>${escape(item.name)}</h2><p class="award">${escape(item.amount)}</p><p class="description">${escape(item.description)}</p>${type === "discounts" ? "" : `<div class="listing-meta"><span class="status ${s}">${statusText}</span><p>${escape(item.deadlineLabel)}</p></div>`}<div class="card-bottom">${external(item.url, type === "internships" ? "View employer site" : type === "discounts" ? "Check current offer" : "View sponsor details")}${item.verifiedAt ? `<p class="review-date">Source reviewed ${dateLabel(item.verifiedAt)} · confirm current terms</p>` : '<p class="review-date">Current terms need confirmation with the provider</p>'}</div></article>`;
}
export function directory({ title, description, items, type }) {
  const cats = [...new Set(items.map((x) => x.category))];
  const controls = `<div class="directory-controls"><div class="search-field"><label for="directorySearch">Search ${type === "internships" ? "companies, fields, or keywords" : type === "discounts" ? "brands, categories, or keywords" : "names, eligibility, or keywords"}</label><input id="directorySearch" type="search" placeholder="${type === "internships" ? "Try engineering, media, or NASA" : type === "scholarships" ? "Try nursing, Texas, or high school" : "Try software or student pricing"}" autocomplete="off"></div><div><label for="categoryFilter">Category</label><select id="categoryFilter"><option value="all">All categories</option>${cats.map((c) => `<option value="${escape(c)}">${escape(type === "discounts" ? c : label(c))}</option>`).join("")}</select></div>${type !== "discounts" ? '<div><label for="statusFilter">Application window</label><select id="statusFilter"><option value="all">All cycles</option><option value="not-closed">Exclude closed cycles</option><option value="closed">Closed cycles</option><option value="upcoming">Upcoming cycles</option></select></div>' : ""}<div><label for="directorySort">Sort</label><select id="directorySort"><option value="featured">Editorial order</option><option value="name">Name A–Z</option>${type !== "discounts" ? '<option value="deadline">Known deadline first</option>' : ""}</select></div><button type="button" class="btn btn-ghost" data-reset-filters>Reset filters</button></div>`;
  return (
    hero(
      title,
      description,
      `<div class="stats-inline"><strong>${items.length}</strong> ${type === "internships" ? "programs" : type === "discounts" ? "resources" : "scholarships"} listed <span>Free to browse · apply on official sites</span></div>`,
    ) +
    `<section class="directory wrap" data-directory="${type}"><p class="notice">${type === "internships" ? "This is a program directory, not a live job feed. A program may have no open roles today." : type === "discounts" ? "Discounts, eligibility, prices, and renewal terms change. Check the provider’s current offer before signing up." : "Listings include upcoming, closed, and recurring programs. A deadline or award amount is a starting point; check the sponsor’s full current rules."}</p>${controls}<p id="resultCount" class="result-count" role="status" aria-live="polite">${items.length} results</p><div class="listing-grid" id="listingGrid">${items.map((x) => resourceCard(x, type)).join("")}</div><div class="empty-state" id="noResults" hidden><h2>No matches yet</h2><p>Try a broader keyword or reset the filters.</p><button class="btn btn-primary" type="button" data-reset-filters>Reset filters</button></div></section><section class="wrap"><div class="callout"><h2>Know a resource we should add?</h2><p>Send the official link and details for editorial review.</p><a class="btn btn-primary" href="index.html#organizations">Submit a resource</a></div></section>`
  );
}
export function field(
  name,
  labelText,
  type = "text",
  { required = true, placeholder = "", options, rows = 4, max = 200 } = {},
) {
  const id = name + "-" + labelText.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `<div class="field"><label for="${id}">${escape(labelText)}${required ? "" : " <span>(optional)</span>"}</label>${options ? `<select id="${id}" name="${name}" ${required ? "required" : ""}>${options.map((x) => (typeof x === "string" ? `<option>${escape(x)}</option>` : `<option value="${escape(x.value)}">${escape(x.label)}</option>`)).join("")}</select>` : type === "textarea" ? `<textarea id="${id}" name="${name}" rows="${rows}" maxlength="${max}" placeholder="${escape(placeholder)}" ${required ? "required" : ""}></textarea>` : `<input id="${id}" name="${name}" type="${type}" maxlength="${max}" placeholder="${escape(placeholder)}" ${type === "email" ? 'autocomplete="email"' : name === "name" ? 'autocomplete="name"' : ""} ${required ? "required" : ""}>`}</div>`;
}
export function form({ type, fields, button, disclosure = "" }) {
  fields = fields.replace(
    /\b(id|for)="([^"]+)"/g,
    (_, attr, value) => `${attr}="${type}-${value}"`,
  );
  return `<form class="intake-form" data-intake="${type}" method="post" action="api/submissions"><input type="hidden" name="type" value="${type}"><div class="form-fields">${fields}<div class="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div><label class="consent"><input type="checkbox" name="consent" required value="yes"><span>${type === "unsubscribe" ? "Record this email preference for the Student Resource Center." : "I agree to have AstroPro store this request and contact me about it."} <a href="privacy.html">Privacy details</a>.</span></label><p class="fineprint">${disclosure || "This form does not subscribe you to marketing emails. Please do not include financial account numbers, health information, passwords, or government IDs."}</p><button class="btn btn-primary" type="submit">${escape(button)}</button></div><div class="form-status" role="status" aria-live="polite" tabindex="-1"></div><noscript><p class="notice">Enable JavaScript to send this form securely, or email <a href="mailto:admin@astropromarketing.com">admin@astropromarketing.com</a>.</p></noscript></form>`;
}
