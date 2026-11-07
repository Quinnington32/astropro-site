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
const iconPaths = {
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  bookmark:
    '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z"/>',
  scholarships:
    '<path d="m2 9 10-5 10 5-10 5L2 9Zm4 2v6c3 3 9 3 12 0v-6m4-2v8"/>',
  internships:
    '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12c5 4 13 4 18 0m-9 1v4"/>',
  housing: '<path d="m3 11 9-8 9 8m-16-2v12h14V9m-10 12v-7h6v7"/>',
  discounts:
    '<path d="M3 4h8l10 10-7 7L3 10V4Z"/><circle cx="7.5" cy="8" r="1"/>',
  guides:
    '<path d="M12 5c-4-2-7-2-10 0v15c4-2 7-2 10 0 3-2 6-2 10 0V5c-3-2-6-2-10 0Zm0 0v15"/>',
  campus: '<path d="m2 9 10-6 10 6H2Zm3 0v11m7-11v11m7-11v11M2 21h20"/>',
  mentorship:
    '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m1-17a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 6"/>',
  wellbeing:
    '<path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z"/>',
  money:
    '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5h-5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4h-5M12 6v13"/>',
  tutoring:
    '<path d="m4 16 10-10 4 4L8 20l-5 1 1-5Zm9-9 4 4m-1-7 2-2 4 4-2 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filters:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name] || iconPaths.guides}</svg>`;
const nav = `<a href="index.html#resources">Explore</a><a href="scholarships.html">Scholarships</a><a href="internships.html">Careers</a><a href="housing.html">Housing</a><a href="career-guides.html">Guides</a><a class="nav-search" href="search.html" aria-label="Search all resources">${icon("search")}</a><a class="nav-saved" href="saved.html">${icon("bookmark")} Saved <span data-saved-count></span></a>`;
export function page({
  title,
  description,
  body,
  file = "index.html",
  noindex = false,
}) {
  const url = canonicalRoot + (file === "index.html" ? "" : file);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}${file === "index.html" ? "" : " — AstroPro Student Resource Center"}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}"><meta name="theme-color" content="#172447"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${canonicalRoot}assets/social-card.png"><meta name="twitter:card" content="summary_large_image">${noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="assets/apple-touch-icon.png"><link rel="stylesheet" href="assets/site.css"><script type="module" src="assets/site.js"></script></head><body data-page="${escape(file.replace(".html", ""))}"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-row"><a class="wordmark" href="index.html" aria-label="AstroPro Student Resource Center home"><img src="brand/astropro-student-logo-nav.webp" width="2172" height="724" alt="AstroPro Student Resource Center"></a><nav class="desktop-nav" aria-label="Main navigation">${nav}</nav><details class="mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">${nav}<a href="school-resources.html">Campus support</a></nav></details></div></header><main id="main" tabindex="-1">${body}</main><footer class="site-footer"><div class="wrap"><div class="footer-top"><div><a class="footer-brand" href="index.html"><img src="brand/astropro-student-logo-nav.webp" width="2172" height="724" alt="AstroPro Student Resource Center"></a><p>A little direction for your next big thing.</p><a class="brand-endorsement" href="https://goastropro.com/">Explore AstroPro ↗</a></div><nav class="footer-links" aria-label="Footer navigation"><div><p>Explore</p><a href="scholarships.html">Scholarships</a><a href="financial-aid.html">Financial aid</a><a href="internships.html">Careers</a><a href="housing.html">Housing</a><a href="discounts.html">Student discounts</a></div><div><p>Find support</p><a href="school-resources.html">Campus resources</a><a href="career-guides.html">Career guides</a><a href="mentorship.html">Mentorship</a><a href="wellbeing.html">Wellbeing</a></div><div><p>Stay in touch</p><a href="index.html#organizations">Suggest a listing</a><a href="property-partners.html">Property partners</a><a href="about.html">About the resource center</a><a href="mailto:admin@astropromarketing.com">Contact us</a></div></nav></div><div class="footer-bottom"><p>© ${new Date().getUTCFullYear()} AstroPro Student Resource Center. Free to explore.</p><nav aria-label="Privacy and preferences"><a href="privacy.html">Privacy</a><a href="data-requests.html">Your data</a><a href="unsubscribe.html">Email preferences</a></nav></div></div></footer><div class="toast" role="status" aria-live="polite" id="toast"></div></body></html>`;
}
export const hero = (
  title,
  description,
  extra = "",
  kicker = "Student Resource Center",
) =>
  `<section class="page-hero"><div class="wrap"><a class="back-link" href="index.html#resources">← Explore resources</a><p class="eyebrow">${escape(kicker)}</p><h1>${escape(title)}</h1><p class="lede">${escape(description)}</p>${extra}</div></section>`;
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
  const description = String(item.description || "");
  const excerpt =
    description.length > 135
      ? description.slice(0, 132).replace(/\s+\S*$/, "") + "…"
      : description;
  return `<article class="resource-card listing-card" data-resource="${escape(item.id)}" data-category="${escape(item.category || "")}" data-status="${s}" data-deadline="${item.deadline || ""}" data-opens="${item.opens || ""}" data-search="${escape([item.name, item.description, item.category, item.categoryLabel, item.state].filter(Boolean).join(" ").toLowerCase())}"><div class="card-heading"><p class="tag">${escape(type === "discounts" ? item.category : label(item.category))}</p>${saveButton(item)}</div><h2>${escape(item.name)}</h2><p class="award">${escape(item.amount)}</p><p class="description">${escape(excerpt)}</p>${type === "discounts" ? "" : `<div class="listing-meta"><span class="status ${s}">${statusText}</span><p>${escape(item.deadlineLabel)}</p></div>`}<details class="listing-details"><summary>Details & eligibility</summary><div><p>${escape(description)}</p><p class="review-date">${item.verifiedAt ? `Source reviewed ${dateLabel(item.verifiedAt)}. Confirm current terms with the provider.` : "Confirm current terms with the provider before applying."}</p></div></details><div class="card-bottom">${external(item.url, type === "internships" ? "View program" : type === "discounts" ? "View offer" : "View scholarship")}</div></article>`;
}
export function directory({ title, description, items, type }) {
  const cats = [...new Set(items.map((x) => x.category))];
  const controls = `<div class="directory-controls"><div class="search-field"><label for="directorySearch">Search</label><div class="input-wrap">${icon("search")}<input id="directorySearch" type="search" placeholder="${type === "internships" ? "Company, field, or keyword" : type === "scholarships" ? "Name, eligibility, or keyword" : "Brand or category"}" autocomplete="off"></div></div><div><label for="categoryFilter">Category</label><select id="categoryFilter"><option value="all">All categories</option>${cats.map((c) => `<option value="${escape(c)}">${escape(type === "discounts" ? c : label(c))}</option>`).join("")}</select></div><details class="more-filters"><summary>${icon("filters")} More filters</summary><div class="filter-popover">${type !== "discounts" ? '<div><label for="statusFilter">Application window</label><select id="statusFilter"><option value="all">All cycles</option><option value="not-closed">Exclude closed cycles</option><option value="closed">Closed cycles</option><option value="upcoming">Upcoming cycles</option></select></div>' : ""}<div><label for="directorySort">Sort by</label><select id="directorySort"><option value="featured">Featured order</option><option value="name">Name A–Z</option>${type !== "discounts" ? '<option value="deadline">Known deadline first</option>' : ""}</select></div></div></details></div>`;
  return (
    hero(
      title,
      description,
      `<div class="stats-inline"><span class="count-pill">${items.length} ${type === "internships" ? "programs" : type === "discounts" ? "offers to explore" : "scholarships"}</span><span>Free to browse · apply with the provider</span></div>`,
      type === "internships"
        ? "Jobs & internships"
        : type === "discounts"
          ? "Student discounts"
          : "Scholarships",
    ) +
    `<section class="directory wrap" data-directory="${type}">${controls}<div class="results-heading"><p id="resultCount" class="result-count" role="status" aria-live="polite">${items.length} results</p><button type="button" class="text-button" data-reset-filters>Reset filters</button></div><div class="listing-grid" id="listingGrid">${items.map((x) => resourceCard(x, type)).join("")}</div><div class="load-more"><button id="moreResources" class="btn btn-ghost" type="button" hidden>Show more resources</button></div><div class="empty-state" id="noResults" hidden><h2>No matches yet</h2><p>Try another keyword or reset your filters.</p><button class="btn btn-primary" type="button" data-reset-filters>Reset filters</button></div><p class="source-note">${type === "internships" ? "Program listings may have no open roles today. Check current openings with the employer." : type === "discounts" ? "Offers and renewal prices change. Check current terms with the provider." : "Listings include closed and recurring cycles. Confirm deadlines and eligibility with the sponsor."}</p></section><section class="wrap"><div class="callout compact-callout"><div><h2>Something we should add?</h2><p>Help us keep this a useful place to start.</p></div><a class="btn btn-ghost" href="index.html#organizations">Suggest a listing ${icon("arrow")}</a></div></section>`
  );
}
export function field(
  name,
  labelText,
  type = "text",
  {
    required = true,
    placeholder = "",
    hint = "",
    options,
    rows = 4,
    max = 200,
    accept = "",
    checkboxLabel = "",
  } = {},
) {
  const id = name + "-" + labelText.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const describedBy = hint ? ` aria-describedby="${id}-hint"` : "";
  if (type === "checkbox")
    return `<div class="field field-checkbox"><label for="${id}" class="checkbox-label"><input id="${id}" name="${name}" type="checkbox" value="yes"${describedBy}> <span>${escape(checkboxLabel || labelText)}</span></label>${hint ? `<p class="field-hint" id="${id}-hint">${escape(hint)}</p>` : ""}</div>`;
  return `<div class="field"><label for="${id}">${escape(labelText)}${required ? "" : " <span>(optional)</span>"}</label>${options ? `<select id="${id}" name="${name}"${describedBy} ${required ? "required" : ""}>${options.map((x) => (typeof x === "string" ? `<option>${escape(x)}</option>` : `<option value="${escape(x.value)}">${escape(x.label)}</option>`)).join("")}</select>` : type === "textarea" ? `<textarea id="${id}" name="${name}" rows="${rows}" maxlength="${max}" placeholder="${escape(placeholder)}"${describedBy} ${required ? "required" : ""}></textarea>` : type === "file" ? `<input id="${id}" name="${name}" type="file" accept="${escape(accept)}"${describedBy} ${required ? "required" : ""}>` : `<input id="${id}" name="${name}" type="${type}" maxlength="${max}" placeholder="${escape(placeholder)}"${describedBy} ${type === "email" ? 'autocomplete="email"' : name === "name" ? 'autocomplete="name"' : ""} ${required ? "required" : ""}>`}${hint ? `<p class="field-hint" id="${id}-hint">${escape(hint)}</p>` : ""}</div>`;
}
export function form({ type, fields, button, disclosure = "" }) {
  fields = fields.replace(
    /\b(id|for|aria-describedby)="([^"]+)"/g,
    (_, attr, value) => `${attr}="${type}-${value}"`,
  );
  return `<form class="intake-form" data-intake="${type}" method="post" action="api/submissions"><input type="hidden" name="type" value="${type}"><div class="form-fields">${fields}<div class="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div><label class="consent"><input type="checkbox" name="consent" required value="yes"><span>${type === "unsubscribe" ? "Record this email preference for the Student Resource Center." : "I agree to have AstroPro store this request and contact me about it."} <a href="privacy.html">Privacy details</a>.</span></label><p class="fineprint">${disclosure || "No marketing signup. Please keep sensitive personal information out of this form."}</p><button class="btn btn-primary" type="submit">${escape(button)}</button></div><div class="form-status" role="status" aria-live="polite" tabindex="-1"></div><noscript><p class="notice">Enable JavaScript to send this form securely, or email <a href="mailto:admin@astropromarketing.com">admin@astropromarketing.com</a>.</p></noscript></form>`;
}
