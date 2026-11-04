import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { load } from "cheerio";
import {
  page,
  hero,
  external,
  escape as e,
  resourceCard,
  directory,
  field,
  form,
  saveButton,
  dateLabel,
  canonicalRoot,
  icon,
} from "../src/render.mjs";
const json = async (name) =>
  JSON.parse(await readFile(`src/data/${name}.json`, "utf8"));
const sourceCommit = process.env.GITHUB_SHA || null;
if (sourceCommit && !/^[0-9a-f]{40}$/.test(sourceCommit))
  throw Error("GITHUB_SHA must identify the exact source commit.");
const [scholarships, internships, discounts, markets] = await Promise.all(
  ["scholarships", "internships", "discounts", "housing"].map(json),
);
const guides = [
  "apply-to-college",
  "career-guides",
  "financial-aid",
  "money-basics",
  "tutoring",
  "wellbeing",
];
const sourceCommit = process.env.GITHUB_SHA || null;
if (sourceCommit && !/^[0-9a-f]{40}$/.test(sourceCommit))
  throw new Error("GITHUB_SHA must identify the exact source commit.");
const pages = [];
const emit = (file, title, description, body, options = {}) =>
  pages.push({ file, title, description, body, ...options });
const resourceTypes = [
  [
    "scholarships",
    "Funding",
    "Scholarships",
    "Search scholarships by name, eligibility, and category.",
  ],
  [
    "internships",
    "Careers",
    "Jobs & internships",
    "Explore student programs and check current openings with employers.",
  ],
  [
    "housing",
    "Living",
    "Off-campus housing",
    "Find your campus market and compare property sources.",
  ],
  [
    "discounts",
    "Savings",
    "Student discounts",
    "Check student pricing and eligibility directly with the provider.",
  ],
  [
    "career-guides",
    "Next steps",
    "Career guides",
    "Resume downloads, interview preparation, and career exploration.",
  ],
  [
    "financial-aid",
    "College costs",
    "Financial aid",
    "Official FAFSA tools and a practical starting checklist.",
  ],
  [
    "mentorship",
    "People",
    "Mentorship",
    "Find existing mentoring options or register your interest.",
  ],
  [
    "tutoring",
    "Learning",
    "Tutoring & study help",
    "Campus support and free learning resources first.",
  ],
  [
    "wellbeing",
    "Support",
    "Mental health & basic needs",
    "Find counseling, crisis support, food, and housing assistance.",
  ],
  [
    "money-basics",
    "Everyday life",
    "Student finances",
    "Understand aid refunds, budgeting, banking, and tax basics.",
  ],
];
const listingForm = form({
  type: "listing",
  button: "Send listing for review",
  fields:
    field("organization", "Organization or school") +
    field("email", "Contact email", "email") +
    field("listingType", "Type of listing", "text", {
      options: [
        "Scholarship",
        "Job or internship",
        "Student discount",
        "Housing property",
        "School partnership",
        "Other resource",
      ],
    }) +
    field("title", "Listing name", "text", {
      placeholder: "e.g. First Generation Scholarship",
      hint: "The name students will see in the directory.",
    }) +
    field("description", "Description", "textarea", {
      max: 4000,
      placeholder: "Who is it for? Include eligibility, dates, and any cost.",
    }) +
    field("url", "Website link", "url", {
      max: 1000,
      placeholder: "https://",
      hint: "The provider’s official application or information page.",
    }),
});
const homeCategories = [
  [
    "scholarships",
    "scholarships.html",
    "Scholarships",
    "Find your scholarship.",
    `${scholarships.length} scholarships`,
    "mint",
  ],
  [
    "internships",
    "internships.html",
    "Jobs & internships",
    "Turn your interests into experience.",
    `${internships.length} career programs`,
    "lavender",
  ],
  [
    "housing",
    "housing.html",
    "Off-campus housing",
    "Find a place to make your own.",
    `${markets.length} campus markets`,
    "peach",
  ],
  [
    "discounts",
    "discounts.html",
    "Student discounts",
    "A student budget can go further.",
    `${discounts.length} resources`,
    "butter",
  ],
  [
    "guides",
    "apply-to-college.html",
    "College guides",
    "The next step, made a little clearer.",
    "Applications, resumes & more",
    "blue",
  ],
  [
    "campus",
    "school-resources.html",
    "Campus support",
    "Start with the help around you.",
    "Find your school’s resources",
    "rose",
  ],
];
const supportLinks = [
  ["mentorship", "mentorship.html", "Find a mentor"],
  ["tutoring", "tutoring.html", "Study help"],
  ["wellbeing", "wellbeing.html", "Wellbeing"],
  ["money", "money-basics.html", "Money basics"],
  ["scholarships", "financial-aid.html", "Financial aid"],
  ["guides", "career-guides.html", "Career guides"],
];
const home = `
<section class="home-hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="hero-badge"><span aria-hidden="true">✦</span> A little direction. A lot of possibility.</p>
      <h1>Less searching.<br><span>More possibilities.</span></h1>
      <p class="lede">Scholarships, careers, housing, and a little help along the way. Your next step starts here.</p>
      <form class="home-search" action="search.html" method="get" role="search">
        <label class="sr-only" for="homeSearch">Search all student resources</label>
        ${icon("search")}<input id="homeSearch" name="q" type="search" placeholder="Scholarships, housing, career help…" maxlength="120" required><button class="btn btn-primary" type="submit">Search ${icon("arrow")}</button>
      </form>
      <div class="popular-links"><span>Start with</span><a href="scholarships.html">Scholarships ↗</a><a href="housing.html">Housing ↗</a><a href="school-resources.html">Campus help ↗</a></div>
      <p class="hero-note">${icon("check")} Free to explore. No account needed.</p>
    </div>
    <aside class="hero-board" aria-label="Explore your next step">
      <div class="orbit orbit-one" aria-hidden="true"></div><div class="orbit orbit-two" aria-hidden="true"></div><span class="board-star" aria-hidden="true">✦</span><span class="board-dot" aria-hidden="true"></span>
      <div class="board-label">YOUR NEXT CHAPTER</div>
      <a class="board-card board-funding" href="scholarships.html"><span class="board-icon tone-mint">${icon("scholarships")}</span><span><small>A little less tuition stress</small><strong>Find your funding.</strong><span class="board-meta">${scholarships.length} scholarships to explore</span></span><span class="board-arrow" aria-hidden="true">↗</span></a>
      <a class="board-card board-career" href="internships.html"><span class="board-icon tone-lavender">${icon("internships")}</span><span><small>Make your next move</small><strong>Build your future.</strong><span class="board-meta">${internships.length} career programs</span></span><span class="board-arrow" aria-hidden="true">↗</span></a>
      <a class="board-card board-housing" href="housing.html"><span class="board-icon tone-peach">${icon("housing")}</span><span><small>A place to call yours</small><strong>Feel at home.</strong><span class="board-meta">${markets.length} campus markets</span></span><span class="board-arrow" aria-hidden="true">↗</span></a>
      <span class="board-caption">Good things are ahead. <span aria-hidden="true">⤴</span></span>
    </aside>
  </div>
</section>
<section id="resources" class="home-resources">
  <div class="wrap">
    <div class="section-head section-head-row"><div><p class="eyebrow">Pick your next step</p><h2>A good place to start.</h2></div><p>You’ve got options. Let’s find yours.</p></div>
    <div class="category-grid">${homeCategories.map(([symbol, href, title, description, count, tone]) => `<a class="category-card" href="${href}"><div class="category-top"><span class="category-icon tone-${tone}">${icon(symbol)}</span><span class="category-arrow" aria-hidden="true">↗</span></div><h3>${title}</h3><p>${description}</p><span class="category-foot">${count} ${icon("arrow")}</span></a>`).join("")}</div>
  </div>
</section>
<section id="mission" class="home-support">
  <div class="wrap support-panel">
    <div><p class="eyebrow">A little help goes a long way</p><h2>You don’t have to figure it all out alone.</h2><p>Find support for the college stuff—and the life stuff.</p><a class="btn btn-light" href="school-resources.html">Find help at my school ${icon("arrow")}</a></div>
    <div class="support-links">${supportLinks.map(([symbol, href, title]) => `<a href="${href}">${icon(symbol)}<span>${title}</span><span aria-hidden="true">↗</span></a>`).join("")}</div>
  </div>
</section>
<section class="wrap submission-section">
  <details class="submission-drawer" id="organizations">
    <summary><span class="submission-heading"><span class="category-icon tone-mint">${icon("plus")}</span><span><strong>Have something useful to share?</strong><small>For organizations, schools, and student communities.</small></span></span><span class="submission-action">Suggest a listing ${icon("plus")}</span></summary>
    <div class="submission-content form-layout"><div id="schools"><p class="eyebrow">Make the directory better</p><h2>Suggest a listing.</h2><p>Send us a scholarship, program, discount, property, or campus service to review.</p><ul class="submission-checks"><li>${icon("check")} Use the provider’s official website.</li><li>${icon("check")} Include eligibility, dates, and any costs.</li><li>${icon("check")} Our team reviews each suggestion.</li></ul><p class="fineprint">Suggestions are considered for editorial inclusion. A submission does not guarantee a listing or purchase placement. Schools can also suggest a partnership.</p><a class="link" href="about.html">Our editorial standards ↗</a></div><div class="form-panel">${listingForm}</div></div>
  </details>
</section>`;
emit(
  "index.html",
  "AstroPro Student Resource Center",
  "Find scholarships, student career programs, off-campus housing, discounts, and practical college support. Free to browse, with no account required.",
  home,
);
emit(
  "scholarships.html",
  "Scholarship directory",
  "Search scholarships by eligibility, category, and keyword. Check current application windows with the official sponsor.",
  directory({
    title: "Find your scholarship.",
    description:
      "Explore funding by interest, eligibility, and application window.",
    items: scholarships,
    type: "scholarships",
  }),
);
emit(
  "internships.html",
  "Jobs & internships",
  "Browse student internship and early-career programs, search by field, and check current openings on employer websites.",
  directory({
    title: "Find your next opportunity.",
    description:
      "Explore internships and early-career programs. Check current openings with each employer.",
    items: internships,
    type: "internships",
  }),
);
emit(
  "discounts.html",
  "Student discounts",
  "Find student discount and verification resources with links to current eligibility, offer, and renewal details.",
  directory({
    title: "A little more for your budget.",
    description:
      "Explore student offers on software, learning, and everyday essentials.",
    items: discounts,
    type: "discounts",
  }),
);
const marketCards = markets
  .map(
    (m, i) =>
      `<a class="market-card" href="${m.file}" data-order="${i}" data-city="${e(m.place)}" data-state="${e(m.place.includes(",") ? m.place.split(",").at(-1).trim() : "NH")}" data-search="${e((m.school + " " + m.place + " " + m.description).toLowerCase())}"><span class="school">${e(m.school)}</span><h2>${e(m.place)}</h2><p>${e(m.description)}</p><span class="link">Explore this market →</span></a>`,
  )
  .join("");
const housingFaq = [
  [
    "What will rent actually cost?",
    "Ask the leasing office for a written quote with rent, utilities, parking, internet, application fees, deposits, and any recurring charges. Static directory pages cannot confirm today’s price or availability.",
  ],
  [
    "How do I check the commute?",
    "Use the property’s exact address and your campus building. Compare walking, transit, and driving at the times you will travel. A city-wide campus label does not mean every property is walkable.",
  ],
  [
    "Can I get a shorter or furnished lease?",
    "Confirm the exact lease term, furniture inventory, and fees directly with the property. Student-oriented housing often uses 12-month installments.",
  ],
  [
    "What should I ask before signing?",
    "Ask who is liable for rent, whether the lease is individual or joint, what happens if a roommate leaves, and which rules apply to subletting, pets, move-out, and deposits. Read the agreement before paying.",
  ],
  [
    "How do I avoid a misleading listing?",
    "Check the official property website, verify the leasing contact independently, and request a tour or live video walkthrough. Don’t assume a Maps result or a directory mention confirms availability or suitability.",
  ],
  [
    "How can I suggest a property?",
    "Use the resource submission form with the property’s official website, address, campus served, and any restrictions. Submitting a property does not purchase placement.",
  ],
];
const faqs = () =>
  `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Before you sign</p><h2>Better questions for a better housing search.</h2></div><div class="faq-list">${housingFaq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></div></section>`;
emit(
  "housing.html",
  "Off-campus housing",
  "Search campus housing markets and find property websites, Maps lookups, and practical questions to ask before signing a lease.",
  hero(
    "Find your place near campus.",
    "Search by school, city, or state. These are research starting points, not verified available rentals.",
    `<div class="cta-row"><a class="btn btn-primary" href="#markets">Find your market</a><a class="btn btn-ghost" href="index.html#organizations">Suggest a property</a></div>`,
  ) +
    `<section class="wrap" id="markets" data-markets><div class="directory-controls"><div><label for="marketSearch">School, city, or state</label><input type="search" id="marketSearch" placeholder="Try Houston or Ohio" autocomplete="off"></div><div><label for="marketSort">Sort markets</label><select id="marketSort"><option value="default">Featured order</option><option value="city">City A–Z</option><option value="state">State A–Z</option></select></div></div><p id="marketCount" class="result-count" role="status" aria-live="polite">${markets.length} markets</p><div class="market-grid" id="marketGrid">${marketCards}</div><div class="empty-state" id="marketEmpty" hidden><h2>No matching markets</h2><p>Try the city or state name, or find housing support through your school.</p><a class="btn btn-primary" href="school-resources.html?topic=housing">Find campus housing support</a></div><p class="source-note">A directory mention is not an endorsement or a paid partnership. Check the property’s current terms and eligibility directly.</p></section>` +
    faqs(),
);
for (const m of markets) {
  const body =
    `<div class="wrap breadcrumb"><a href="housing.html">← All housing markets</a></div>` +
    hero(
      m.place,
      `Explore housing options near ${m.school}.`,
      "",
      "Off-campus housing",
    ) +
    `<section class="wrap"><p class="notice">${e(m.description)} Check eligibility, commute, and availability directly with each property.</p><div class="property-grid">${m.properties.map((p) => `<article class="property-card"><div class="card-heading"><p class="tag">Property research</p>${saveButton({ ...p, name: p.name })}</div><h2>${e(p.name)}</h2>${p.address ? `<p>${e(p.address)}</p>` : ""}<p>${e(p.summary || "Confirm the property identity, rental eligibility, current floor plans, and availability directly before applying.")}</p><div class="cta-row">${p.website ? external(p.website, "Official property site", "btn btn-primary") : external(p.maps, "Find property on Maps", "btn btn-primary")}${p.floorplans ? external(p.floorplans, "Current floor plans", "btn btn-ghost") : p.website ? external(p.maps, "Map lookup", "btn btn-ghost") : ""}</div><p class="review-date">${p.verifiedAt ? "Official source reviewed " + dateLabel(p.verifiedAt) + ". Current price and availability not verified." : "Official website and current availability have not been independently verified. Maps is a search lookup."}</p></article>`).join("")}</div></section>` +
    faqs() +
    `<section class="wrap"><div class="callout"><h2>Need help closer to your campus?</h2><p>Your school’s housing office may have rental guidance, emergency support, and off-campus listings.</p><div class="cta-row"><a class="btn btn-primary" href="school-resources.html?school=${encodeURIComponent(m.school)}&topic=housing">Find campus housing resources</a><a class="btn btn-ghost" href="index.html#organizations">Suggest a correction or property</a></div></div></section>`;
  emit(
    m.file,
    `Housing research in ${m.place}`,
    `Explore property sources and housing search questions near ${m.school} in ${m.place}.`,
    body,
  );
}
for (const slug of guides) {
  const metadata = JSON.parse(await readFile(`src/content/${slug}.json`));
  let body = await readFile(`src/content/${slug}.html`, "utf8");
  body = body
    .replaceAll("{{scholarshipCount}}", String(scholarships.length))
    .replace(
      "54 real, searchable scholarships you can start applying for now",
      `${scholarships.length} listed scholarship programs to explore`,
    )
    .replace(
      "54 scholarships you can start applying for now",
      `${scholarships.length} listed scholarship programs to explore`,
    );
  const intro = {
    "apply-to-college": [
      "College applications, made clearer.",
      "Find the right application system and take it one step at a time.",
    ],
    "career-guides": [
      "A little prep. A stronger next step.",
      "Resumes, interviews, and finding your direction. Start with what you need.",
    ],
    "financial-aid": [
      "Make sense of financial aid.",
      "Start with the FAFSA, understand your options, and find official help.",
    ],
    "money-basics": [
      "A little more money confidence.",
      "Understand aid refunds, build a budget, and get the basics in place.",
    ],
    tutoring: [
      "You don’t have to study solo.",
      "Find campus tutoring, writing help, and free learning resources.",
    ],
    wellbeing: [
      "Take care of the person, too.",
      "Support for your wellbeing, basic needs, and the days that feel like a lot.",
    ],
  }[slug];
  const $guide = load(body, null, false);
  $guide(".page-hero .kicker").text(metadata.title);
  $guide(".page-hero h1").text(intro[0]);
  $guide(".page-hero .lede").text(intro[1]);
  $guide(".accordion").removeAttr("open");
  $guide(".tool-card,.guide-card").each((_, card) => {
    const parts = $guide(card).children(
      "p:not(.price):not(.source-note),ul,ol",
    );
    if (parts.text().length <= 340) return;
    const preview = parts.first().text().trim();
    const excerpt =
      preview.length > 160
        ? preview.slice(0, 157).replace(/\s+\S*$/, "") + "…"
        : preview;
    const full = parts
      .toArray()
      .map((el) => $guide.html(el))
      .join("");
    parts
      .first()
      .before(
        `<p>${e(excerpt)}</p><details class="listing-details"><summary>Read more</summary><div>${full}</div></details>`,
      );
    parts.remove();
  });
  $guide(".page-hero .note").each((_, note) => {
    $guide(note).replaceWith(
      `<details class="guide-note"><summary>Before you start</summary><div>${$guide(note).html()}</div></details>`,
    );
  });
  const jumpLabels = {
    "apply-to-college": [
      "Application systems",
      "Your checklist",
      "Deadlines",
      "More resources",
    ],
    "career-guides": [
      "Resume",
      "Templates",
      "Interviews",
      "Career direction",
      "Free tools",
      "Resume builders",
      "Mentorship",
    ],
    "financial-aid": [
      "FAFSA",
      "Deadlines",
      "Work-study",
      "College costs",
      "State grants",
      "Your checklist",
    ],
    "money-basics": ["Aid refunds", "Budgeting", "Taxes", "Banking", "Earning"],
    tutoring: ["Campus help", "Online resources"],
    wellbeing: ["Wellbeing", "Basic needs"],
  }[slug];
  const jumps = [];
  $guide("section")
    .not(".page-hero")
    .each((index, section) => {
      const title = $guide(section).find("h2").first().text().trim();
      if (!title) return;
      const id = $guide(section).attr("id") || `guide-step-${index + 1}`;
      $guide(section).attr("id", id);
      const jumpLabel = jumpLabels[jumps.length] || title;
      jumps.push(
        `<a href="#${e(id)}" aria-label="Jump to ${e(title)}">${e(jumpLabel)}</a>`,
      );
    });
  $guide(".page-hero .wrap").append(
    `<nav class="guide-nav" aria-label="On this page">${jumps.join("")}</nav>`,
  );
  emit(slug + ".html", metadata.title, metadata.description, $guide.html());
}
const mentorshipBody =
  hero(
    "People who can help you find your direction.",
    "Find a mentoring program or tell us about the direction you’d like to take.",
  ) +
  `<section class="wrap"><div class="section-head"><h2>Find a mentor today</h2><p>These services operate independently of AstroPro. Check their eligibility, availability, and fees.</p></div><div class="tool-grid"><article class="tool-card"><p class="tag">Campus first</p><h3>Your school’s alumni network</h3><p>Career services and alumni relations often run mentoring programs for current students.</p><a class="link" href="school-resources.html?topic=alumni%20mentorship">Find your school’s program →</a></article><article class="tool-card"><p class="tag">Free</p><h3>ADPList</h3><p>Mentoring across design, technology, product, and related careers. Check individual mentor availability.</p>${external("https://adplist.org/", "Explore ADPList")}</article><article class="tool-card"><p class="tag">Professional network</p><h3>LinkedIn alumni tools</h3><p>Find your school’s alumni and reach out with a specific, respectful request for a career conversation.</p>${external("https://www.linkedin.com/", "Visit LinkedIn")}</article><article class="tool-card"><p class="tag">Paid</p><h3>MentorCruise</h3><p>Ongoing mentoring with independent professionals. Review pricing and each mentor’s terms before booking.</p>${external("https://mentorcruise.com/", "Explore MentorCruise")}</article></div></section><section class="wrap"><div class="section-head"><h2>Register your interest</h2><p>These requests reach our review inbox. A request does not guarantee a match or a response time. No mentoring relationship begins until both people agree.</p></div><div class="two-col"><div class="path-card"><h2>I’m looking for a mentor</h2><p class="desc">Tell us where you’re headed.</p>${form({ type: "mentee", button: "Register student interest", fields: field("name", "Your name") + field("email", "Your email", "email") + field("field", "Field or industry") + field("graduationYear", "Graduation year", "text", { required: false, max: 4 }) })}</div><div class="path-card"><h2>I’d like to mentor a student</h2><p class="desc">Share your field and availability.</p>${form({ type: "mentor", button: "Register mentor interest", fields: field("name", "Your name") + field("email", "Your email", "email") + field("field", "Your professional field") + field("availability", "Availability", "text", { options: ["30 minutes per month", "One hour per month", "A few hours per semester"] }) })}</div></div></section>`;
emit(
  "mentorship.html",
  "Mentorship",
  "Find independent mentoring options or register interest in AstroPro’s growing student and professional mentorship network.",
  mentorshipBody,
);
emit(
  "search.html",
  "Search student resources",
  "Find scholarships, careers, discounts, and housing in one search.",
  hero(
    "Find what you need.",
    "Search the directory, practical guides, and campus support.",
    "",
    "Find your next step",
  ) +
    `<section class="wrap search-page"><form id="resourceSearchForm" class="home-search" action="search.html" method="get" role="search"><label class="sr-only" for="resourceSearch">Search all resources</label>${icon("search")}<input id="resourceSearch" name="q" type="search" maxlength="120" placeholder="Try NASA, nursing, or Athens" autocomplete="off"><button class="btn btn-primary">Search ${icon("arrow")}</button></form><div class="search-categories"><a href="scholarships.html">Scholarships</a><a href="internships.html">Careers</a><a href="housing.html">Housing</a><a href="discounts.html">Discounts</a></div><p class="result-count" id="resourceSearchCount" role="status" aria-live="polite"></p><div class="listing-grid" id="resourceSearchResults"></div><div class="empty-state" id="resourceSearchEmpty"><span class="empty-icon">${icon("search")}</span><h2>What’s on your mind?</h2><p>Search a name, interest, school, or city—or choose a category above.</p></div><div class="load-more"><button class="btn btn-ghost" id="moreSearchResults" type="button" hidden>Show more results</button></div><noscript><p class="notice">Choose a category above to browse resources. Enable JavaScript to search the full directory.</p></noscript></section>`,
  { noindex: true },
);
emit(
  "saved.html",
  "Saved resources",
  "Your shortlist of scholarships, career programs, discounts, and housing research saved in this browser.",
  hero(
    "Your next steps, saved.",
    "Good finds, all in one place. Your shortlist stays in this browser.",
  ) +
    `<section class="wrap"><p class="notice">Saved items don’t create an account or email subscription. Clearing browser data removes your list. You can export a backup and import it in another browser.</p><div class="admin-controls"><button class="btn btn-ghost" data-export-saved>Export saved list</button><button class="btn btn-ghost" type="button" data-import-saved>Import saved list</button><input id="savedImport" aria-label="Import an AstroPro saved list" type="file" accept="application/json,.json" hidden><button class="btn btn-ghost" data-clear-saved>Clear saved list</button></div><p class="result-count" id="savedCount" role="status" aria-live="polite"></p><div class="listing-grid" id="savedGrid"></div><div class="empty-state" id="savedEmpty"><h2>Make room for your next opportunity.</h2><p>Use the Save button on a scholarship, career program, discount, or property.</p><a class="btn btn-primary" href="scholarships.html">Find something to save</a></div></section>`,
);
const topics = [
  "financial aid",
  "net price calculator",
  "career",
  "alumni mentorship",
  "tutoring",
  "writing",
  "library",
  "counseling",
  "basic needs",
  "housing",
  "transit",
];
emit(
  "school-resources.html",
  "Find campus resources",
  "Find official financial aid, career, tutoring, counseling, library, and housing resources through your college.",
  hero(
    "Your school is a good place to start.",
    "Find the campus services you may already have access to.",
  ) +
    `<section class="wrap"><form class="school-search" id="schoolSearch"><div><label for="schoolName">College or university name</label><input id="schoolName" name="school" type="search" required maxlength="150" placeholder="e.g. University of Houston" autocomplete="organization"></div><div><label for="schoolTopic">I’m looking for</label><select name="topic" id="schoolTopic">${topics.map((t) => `<option>${e(t)}</option>`).join("")}</select></div><button class="btn btn-primary" type="submit">Find official campus resources</button></form><div id="schoolResults" class="school-results" role="status" aria-live="polite"></div><p class="fineprint">This tool creates a web search for your school’s official resources. Check the domain and school name before sharing personal information. Search results are provided by Google, not verified by AstroPro.</p><div class="callout"><h2>Still choosing a school?</h2><p>Explore accredited institutions and official college information through the U.S. Department of Education.</p>${external("https://nces.ed.gov/collegenavigator/", "Open College Navigator", "btn btn-ghost")}</div></section>`,
);
const privacy = `<section class="wrap prose"><p class="fineprint">Effective October 31, 2026</p><h2>What this resource center collects</h2><p>You can browse without an account. Saving a resource stores its identifier in your browser’s local storage. Your saved list stays on your device unless you choose to export or share it.</p><p>If you submit a resource, mentoring interest, or data request, we collect the fields you provide, your agreement to the request-specific privacy notice, and a receipt identifier. These records are stored privately using Cloudflare D1 so the AstroPro team can review and respond. Forms do not subscribe you to a newsletter.</p><h2>Request handling and security</h2><p>Submission records are accessible only through an authenticated staff interface. We use short-lived, hashed network identifiers for abuse prevention; we do not store raw IP addresses in the submission database. Our hosting provider may process technical request information to operate and protect the service.</p><p>Resource and mentoring requests are retained for up to 90 days. Data requests are retained for up to 90 days while handled by the team. Communication preferences retain an email address and a dated do-not-contact record until changed or removed through a verified data request. Browser storage for a pending form may retain its receipt identifier and content in your current tab until it is accepted or you close the tab.</p><h2>How information is used</h2><p>We use a submitted request to review a resource, assess a mentoring inquiry, respond to you, or handle your data or communication preference request. We do not publish form submissions automatically or sell your contact information. We do not share a school-provided student directory through this service.</p><h2>External sites</h2><p>Applications and provider offers open on third-party sites with their own terms and privacy practices. Their cookies, eligibility checks, and data collection are outside this resource center. Our school finder opens a search with Google. Fonts and site assets are served from our own origin.</p><h2>Your choices</h2><p>Use <a href="data-requests.html">Your data</a> to request access, correction, or deletion. We may ask you to verify your email or identity before disclosing or changing a record. Use <a href="unsubscribe.html">Email preferences</a> to record a do-not-contact preference for this resource center.</p><p>If you already receive an AstroPro email from another system, use the unsubscribe link in that message or contact us. This site cannot confirm the state of a separate mailing list.</p><h2>Contact</h2><p>Email <a href="mailto:admin@astropromarketing.com">admin@astropromarketing.com</a>. Please do not submit health details, passwords, government identifiers, financial account information, or other sensitive personal information through these forms.</p></section>`;
emit(
  "privacy.html",
  "Privacy policy",
  "How the Student Resource Center handles saved resources, submitted requests, technical information, and your privacy choices.",
  hero(
    "Your information, handled with care.",
    "What this resource center collects, how we use it, and the choices available to you.",
  ) + privacy,
);
emit(
  "data-requests.html",
  "Your data",
  "Request access, correction, or deletion of information submitted to the AstroPro Student Resource Center.",
  hero(
    "Your data. Your request.",
    "Ask to access, correct, or delete information you submitted to this resource center. The team may need to verify your identity before acting.",
  ) +
    `<section class="wrap form-layout"><div class="prose"><h2>Tell us what you need.</h2><p>This form records a request for review. It does not automatically disclose or delete records. Keep your receipt so you can refer to it if you contact us.</p><p>For a separate AstroPro mailing list or another AstroPro service, include the service name in your request, or contact <a href="mailto:admin@astropromarketing.com">admin@astropromarketing.com</a>.</p></div><div class="form-panel">${form({ type: "data-request", button: "Send data request", fields: field("email", "Email connected to your request", "email") + field("requestType", "I would like to", "text", { options: ["Access my information", "Correct my information", "Delete my information"] }) + field("description", "Details", "textarea", { required: false, max: 2000, placeholder: "Identify the request or service, without adding sensitive personal information." }) })}</div></section>`,
);
emit(
  "unsubscribe.html",
  "Email preferences",
  "Record a do-not-contact preference for the Student Resource Center or find the unsubscribe path for existing AstroPro emails.",
  hero(
    "Choose what you hear from us.",
    "Browsing and saving resources never subscribes you to email. Record a do-not-contact preference for the Student Resource Center below.",
  ) +
    `<section class="wrap form-layout"><div class="prose"><h2>Already receiving an AstroPro email?</h2><p>Use the unsubscribe link in the message for that mailing list. If the link is missing or not working, email <a href="mailto:admin@astropromarketing.com?subject=Unsubscribe%20request">admin@astropromarketing.com</a> from the address you want removed.</p><p>This form stores a preference in the Student Resource Center’s own records. It does not claim to update a separate mailing platform. Request-related replies you ask for can still be sent.</p><p>To request removal of stored personal information, use <a href="data-requests.html">Your data</a>.</p></div><div class="form-panel">${form({ type: "unsubscribe", button: "Record do-not-contact preference", fields: field("email", "Your email", "email"), disclosure: "This preference applies to the Student Resource Center. Use the link in an existing email to unsubscribe from a separate mailing list." })}</div></section>`,
);
emit(
  "about.html",
  "About & editorial standards",
  "How AstroPro selects resources, labels uncertain information, and handles corrections and resource submissions.",
  hero(
    "Useful starting points. Clear expectations.",
    "We collect resources that help students navigate college and take their next step.",
  ) +
    `<section class="wrap prose"><h2>What we do</h2><p>AstroPro Student Resource Center is a free directory and guide collection. We link to scholarship sponsors, employers, providers, property sources, and campus services. Those organizations make their own decisions and set their own rules.</p><h2>How resources are reviewed</h2><p>We prefer official sources. A “source reviewed” date means we checked the linked source for the specified information; it does not promise the provider will keep the same terms. Other entries remain starting points whose current rules need confirmation. Closed and upcoming cycles are labeled where dates are known.</p><p>Resources without a verifiable current source may be withheld. We don’t invent deadlines, availability, partnerships, rankings, or review scores. Listing counts are generated from published records.</p><h2>Housing and commercial offers</h2><p>A property mention is not a guarantee of rental suitability or an endorsement. Map links are searches, not verified listings. We do not collect rental applications or payments. Discounts may involve paid subscriptions, renewals, or third-party verification; read the terms before signing up.</p><h2>Corrections and submissions</h2><p>Spot something wrong? <a href="index.html#organizations">Send the official source and a correction</a>. Submissions are reviewed by people and are not automatically published. Our directory currently has no paid-placement ordering.</p><h2>What is available here</h2><p>Browse directories, use guides, save a shortlist on your device, find campus resources, or send a request. We do not provide automatic scholarship matching, a live job feed, personalized financial or medical advice, or a student email list.</p></section>`,
);
emit(
  "admin.html",
  "Resource Center review inbox",
  "Private staff access to Student Resource Center requests.",
  hero(
    "Review inbox",
    "Staff access only. Use your private inbox access key. This page is not linked from public navigation.",
  ) +
    `<section class="wrap"><form id="adminLogin" class="school-search"><label for="adminToken">Private access key</label><input id="adminToken" type="password" required autocomplete="off" minlength="32"><button class="btn btn-primary">Open inbox</button></form><div id="adminMessage" role="status" aria-live="polite"></div><div id="adminInbox" hidden><div class="admin-controls"><button class="btn btn-primary" type="button" id="adminRefresh">Refresh</button><button class="btn btn-ghost" type="button" id="adminMore" hidden>Load older records</button><button class="btn btn-ghost" type="button" id="adminLogout">Lock inbox</button></div><div class="directory-controls admin-filters"><div><label for="adminView">View</label><select id="adminView"><option value="submissions">Requests</option><option value="preferences">Do-not-contact preferences</option></select></div><div><label for="adminStatus">Review status</label><select id="adminStatus"><option value="">All statuses</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></select></div><div><label for="adminType">Request type</label><select id="adminType"><option value="">All types</option><option value="listing">Resource submission</option><option value="mentee">Student mentoring interest</option><option value="mentor">Volunteer mentor interest</option><option value="data-request">Personal data request</option><option value="unsubscribe">Email preference request</option></select></div></div><p class="fineprint">Requests are private. Verify identity before fulfilling access, correction, or deletion requests. Follow-up is manual; this inbox does not send email. It locks after 15 minutes without activity.</p><div id="adminRecords"></div></div></section>`,
  { noindex: true },
);
emit(
  "404.html",
  "Page not found",
  "This resource page could not be found. Return to the AstroPro Student Resource Center.",
  hero(
    "Let’s find your next step.",
    "That page isn’t available. The resource may have moved, or the address may be incomplete.",
    `<div class="cta-row"><a class="btn btn-primary" href="${canonicalRoot}">Resource Center home</a><a class="btn btn-ghost" href="${canonicalRoot}scholarships.html">Find scholarships</a></div>`,
  ),
  { noindex: true },
);
await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await cp("resources", "dist/resources", { recursive: true });
await cp("public", "dist", { recursive: true });
await cp("src/styles/site.css", "dist/assets/site.css");
await cp("src/client/site.js", "dist/assets/site.js");
await cp("src/client/resource-search.js", "dist/assets/resource-search.js");
await cp("src/client/private-session.js", "dist/assets/private-session.js");
const catalog = [
  ...scholarships.map((x) => ({
    ...x,
    type: "scholarships",
    page: "scholarships.html",
  })),
  ...internships.map((x) => ({
    ...x,
    type: "internships",
    page: "internships.html",
  })),
  ...discounts.map((x) => ({
    ...x,
    type: "discounts",
    page: "discounts.html",
  })),
  ...markets.flatMap((m) =>
    m.properties.map((x) => ({
      ...x,
      type: "housing",
      page: m.file,
      description: `Property research in ${m.place} near ${m.school}. Confirm eligibility, commute, and availability.`,
      url: x.website || x.maps,
      amount: "Housing research",
      category: m.place,
    })),
  ),
];
await writeFile(
  "dist/assets/catalog.json",
  JSON.stringify(catalog.map(({ legacyDeadline, verifiedFields, ...x }) => x)),
);
for (const data of pages) {
  const html = page(data);
  const $ = load(html);
  $('a[target="_blank"]').attr("rel", "noopener noreferrer");
  $("style,script:not([src])").remove();
  $("[style]").removeAttr("style");
  $('a[href="#"]').each(() => {
    throw new Error(`Placeholder link in ${data.file}`);
  });
  if (data.file === "404.html") {
    $('link[href="assets/site.css"]').attr(
      "href",
      canonicalRoot + "assets/site.css",
    );
    $('script[src="assets/site.js"]').attr(
      "src",
      canonicalRoot + "assets/site.js",
    );
    $("a").each((_, a) => {
      const href = $(a).attr("href");
      if (href && !/^(https?:|mailto:|#)/.test(href))
        $(a).attr("href", canonicalRoot + href);
    });
  }
  await writeFile("dist/" + data.file, $.html());
}
await writeFile(
  "dist/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    pages
      .filter((x) => !x.noindex && x.file !== "saved.html")
      .map(
        (x) =>
          `<url><loc>${canonicalRoot + (x.file === "index.html" ? "" : x.file)}</loc></url>`,
      )
      .join("") +
    "</urlset>",
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nSitemap: ${canonicalRoot}sitemap.xml\n`,
);
await writeFile(
  "dist/build.json",
  JSON.stringify({
    builtAt: new Date().toISOString(),
    sourceCommit,
    pages: pages.length,
    scholarships: scholarships.length,
    internships: internships.length,
    discounts: discounts.length,
    markets: markets.length,
    properties: markets.reduce((a, m) => a + m.properties.length, 0),
  }),
);
console.log(
  `Built ${pages.length} pages and ${catalog.length} saveable resources.`,
);
