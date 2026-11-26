import { tipsAndTricks, calendarNote, scamFlags, stateNotes, defaultStateNote, extraGuides } from "../src/data/sublease-extra.mjs";
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
  "textbooks",
  "student-products",
  "test-prep",
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
    "Internships",
    "Explore student programs and check current openings with employers.",
  ],
  [
    "housing",
    "Living",
    "Off-Campus Housing",
    "Find your campus market and compare property sources.",
  ],
  [
    "discounts",
    "Savings",
    "Student Discounts",
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
    "Financial Aid",
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
    "textbooks",
    "College costs",
    "Book Store",
    "Find your textbook and compare free, library, used, and rental options.",
  ],
  [
    "student-products",
    "College costs",
    "Student Products",
    "Tech, software, dorm essentials, and school supplies for less.",
  ],
  [
    "test-prep",
    "Learning",
    "Test prep",
    "Official free practice and fee waivers for the SAT, ACT, CLEP, LSAT, GRE, and MCAT.",
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
  ["scholarships", "scholarships.html", "Scholarships", "mint"],
  ["internships", "internships.html", "Internships", "lavender"],
  ["housing", "housing.html", "Off-Campus Housing", "peach"],
  ["housing", "sublease-war-room.html", "Sublease War Room", "rose"],
  ["discounts", "discounts.html", "Student Discounts", "butter"],
  ["guides", "apply-to-college.html", "Apply for College", "blue"],
  ["money", "financial-aid.html", "Financial Aid", "rose"],
  ["textbooks", "textbooks.html", "Book Store", "mint"],
  ["products", "student-products.html", "Student Products", "peach"],
  ["testprep", "test-prep.html", "Test Prep", "lavender"],
];
const supportLinks = [
  ["mentorship", "mentorship.html", "Find a mentor", "Connect with someone a few steps ahead of you"],
  ["tutoring", "tutoring.html", "Study help", "Tutoring and academic support when you’re stuck"],
  ["wellbeing", "wellbeing.html", "Wellbeing", "Support for stress, health, and balance"],
  ["money", "money-basics.html", "Money basics", "Budgeting, credit, and everyday money skills"],
  ["scholarships", "financial-aid.html", "Financial aid", "FAFSA, grants, and deadlines explained"],
  ["guides", "career-guides.html", "Career guides", "Resumes, interviews, and applications"],
];
const helpChoices = [
  "Applying to several scholarships for me",
  "Finding scholarships that fit me",
  "Writing my essays and answers",
  "Keeping track of deadlines",
  "All of the above",
];
const interestForm = () =>
  form({
    type: "scholarship-interest",
    button: "Get early access",
    fields:
      field("name", "First name", "text", { required: false, placeholder: "Your first name" }) +
      field("email", "Email", "email", { placeholder: "you@example.com" }) +
      field("helpWith", "What would help most?", "text", { options: helpChoices }),
    disclosure:
      "We only email about scholarships and student resources, and never sell your information. Unsubscribe any time.",
  });
const interestCopy = `<h2>Want us to apply to multiple scholarships for you?</h2><p>Tell us you’re interested and join the early-access list. We’ll email you first if it opens, and tell you what it would cost before you pay anything.</p><ul class="interest-points"><li>${icon("check")} No payment now, and no obligation.</li><li>${icon("check")} Also get new scholarships and deadlines by email.</li></ul>`;
const interestDrawer = `<section class="wrap interest-band interest-drawer-wrap" id="get-help"><details class="interest-drawer"><summary><span class="interest-sum"><span class="category-icon tone-peach">${icon("scholarships")}</span><span><strong>Want us to apply to multiple scholarships for you?</strong><small>Join the early-access list</small></span></span><span class="interest-action">Join the list ${icon("plus")}</span></summary><div class="interest-card"><div class="interest-copy">${interestCopy}</div><div class="form-panel interest-form">${interestForm()}</div></div></details></section>`;
const home = `
<section class="home-hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="hero-badge">A little help for your next big thing</p>
      <h1>Your next chapter<br><span>starts here.</span></h1>
      <p class="lede">Scholarships, careers, housing, and support for life at college. Find a good place to start.</p>
      <form class="home-search" action="search.html" method="get" role="search">
        <label class="sr-only" for="homeSearch">Search all student resources</label>
        ${icon("search")}<input id="homeSearch" name="q" type="search" placeholder="Search scholarships & more" maxlength="120" required><button class="btn btn-primary" type="submit">Search ${icon("arrow")}</button>
      </form>
      <div class="popular-links need-links"><span>I need…</span><a href="scholarships.html">Money for school</a><a href="housing.html">A place to live</a><a href="internships.html">A job or internship</a><a href="school-resources.html">Help at my school</a></div>
      <p class="hero-note">${icon("check")} Free to explore. No account needed.</p>
    </div>
    <figure class="campus-visual">
      <div class="campus-photo"><img src="assets/campus-life.webp" width="1000" height="1500" alt="Students talking together on a leafy campus path" fetchpriority="high" decoding="async"></div>
      <figcaption><span class="campus-caption-icon" aria-hidden="true">${icon("guides")}</span><span><strong>A little direction.</strong><small>A lot of possibility.</small></span></figcaption>
      <span class="campus-spark" aria-hidden="true">✦</span>
    </figure>
  </div>
</section>
<section id="resources" class="home-resources">
  <div class="wrap">
    <div class="section-head section-head-row"><div><p class="eyebrow">Student Resource Center</p><h2>Scroll through the resources below</h2></div><p>You’ve got options. Let’s find yours.</p></div>
    <div class="resource-tiles">${homeCategories.map(([symbol, href, title, tone]) => `<a class="resource-tile${href === "sublease-war-room.html" ? " tape-tile" : ""}" href="${href}"><span class="category-icon tone-${tone}">${icon(symbol)}</span><h3>${title}</h3></a>`).join("")}</div>
  </div>
</section>
<section id="mission" class="home-support">
  <div class="wrap support-panel">
    <div><p class="eyebrow">A little help goes a long way</p><h2>You don’t have to figure it all out alone.</h2><p>Find support for the college stuff—and the life stuff.</p><a class="btn btn-light" href="school-resources.html">Find help at my school ${icon("arrow")}</a></div>
    <div class="support-links support-cards">${supportLinks.map(([symbol, href, title, blurb]) => `<a href="${href}">${icon(symbol)}<span class="support-text"><strong>${title}</strong><small>${blurb}</small></span><span aria-hidden="true">↗</span></a>`).join("")}</div>
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
    afterHero: interestDrawer,
  }),
);
emit(
  "internships.html",
  "Internships",
  "Browse student internship and early-career programs, search by field, and check current openings on employer websites.",
  directory({
    title: "Find your next opportunity.",
    description:
      "Scroll through every program below, filter by field, and check current openings with each employer.",
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
const stateNames = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington, DC",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",AB:"Alberta",BC:"British Columbia",MB:"Manitoba",NB:"New Brunswick",NL:"Newfoundland and Labrador",NS:"Nova Scotia",NT:"Northwest Territories",ON:"Ontario",PE:"Prince Edward Island",QC:"Quebec",SK:"Saskatchewan",YT:"Yukon"};
const stateOf = (m) => m.place.split(",").at(-1).trim();
const marketCard = (m, i) =>
  `<a class="market-card" href="${m.file}" data-order="${i}" data-city="${e(m.place)}" data-state="${e(stateOf(m))}" data-search="${e((m.school + " " + m.place + " " + (stateNames[stateOf(m)] || "") + " " + m.description).toLowerCase())}"><h2>${e(m.place)}</h2><span class="school">${e(m.school)}</span><span class="link">${m.properties.some((p) => p.spotlight) ? "See available rentals" : "Explore this market"} →</span></a>`;
const stateGroups = Object.entries(
  markets.reduce((acc, m, i) => ((acc[stateOf(m)] ||= []).push([m, i]), acc), {}),
).sort((a, b) => (stateNames[a[0]] || a[0]).localeCompare(stateNames[b[0]] || b[0]));
const stateJump = `<nav class="state-jump" aria-label="Jump to a state">${stateGroups.map(([st, list]) => `<a href="#state-${st}" data-jump="${st}">${e(st)}<span>${list.length}</span></a>`).join("")}</nav>`;
const marketCards = `<div id="marketGroups">${stateGroups
  .map(([st, list]) => `<section class="state-group" id="state-${st}" data-state-group="${st}"><h2 class="state-heading">${e(stateNames[st] || st)} <span>${list.length}</span></h2><div class="market-grid">${list.sort((x, y) => x[0].place.localeCompare(y[0].place)).map(([m, i]) => marketCard(m, i)).join("")}</div></section>`)
  .join("")}</div><div class="market-grid" id="marketGrid" hidden></div>`;
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
function housingPropertyCard(p) {
  const spotlight = p.spotlight;
  const website = p.website
    ? external(p.website, "Official property site", "btn btn-primary")
    : external(p.maps, "Find property on Maps", "btn btn-primary");
  const details = p.floorplans
    ? external(p.floorplans, "Current floor plans", "btn btn-ghost")
    : p.website ? external(p.maps, "Map lookup", "btn btn-ghost") : "";
  const discussion = spotlight?.facebookPost
    ? external(spotlight.facebookPost, "Facebook discussion", "link")
    : "";
  const photo = spotlight?.photo && spotlight?.photoAlt
    ? `<img class="property-photo" src="${e(spotlight.photo)}" alt="${e(spotlight.photoAlt)}" loading="lazy" decoding="async">`
    : "";
  return `<article class="property-card" id="${e(p.id)}">
    <div class="card-heading"><p class="tag">${spotlight ? "Rental spotlight" : "Property research"}</p>${saveButton({ ...p, name: p.name })}</div>
    <h2>${e(p.name)}</h2>
    ${p.address ? `<p>${e(p.address)}</p>` : ""}
    ${photo}
    <p>${e(p.summary || "Confirm the property identity, rental eligibility, current floor plans, and availability directly before applying.")}</p>
    <div class="cta-row">${website}${details}${discussion}</div>
    <p class="review-date">${p.verifiedAt ? "Official source reviewed " + dateLabel(p.verifiedAt) + ". Check current pricing and availability with the property." : "Official website and current availability have not been independently verified. Maps is a search lookup."}</p>
  </article>`;
}
emit(
  "housing.html",
  "Off-campus housing",
  "Search campus housing markets and find property websites, Maps lookups, and practical questions to ask before signing a lease.",
  hero(
    "Find your place near campus.",
    "Search by school, city, or state. These are research starting points, not verified available rentals.",
    `<div class="cta-row"><a class="btn btn-primary" href="#markets">Find your market</a><a class="btn btn-ghost" href="sublease-war-room.html">Sublease War Room</a><a class="btn btn-ghost" href="index.html#organizations">Suggest a property</a></div>`,
  ) +
    `<section class="wrap tape-row"><a class="tape-btn" href="sublease-war-room.html"><span>Stuck in a lease? Enter the Sublease War Room</span></a></section>` +
    `<section class="wrap" id="markets" data-markets><div class="directory-controls"><div><label for="marketSearch">School, city, or state</label><input type="search" id="marketSearch" placeholder="Try Houston or Ohio" autocomplete="off"></div><div><label for="marketSort">Sort markets</label><select id="marketSort"><option value="state">Group by state</option><option value="city">City A–Z</option></select></div></div><p id="marketCount" class="result-count" role="status" aria-live="polite">${markets.length} markets</p>${stateJump}${marketCards}<div class="empty-state" id="marketEmpty" hidden><h2>No matching markets</h2><p>Try the city or state name, or find housing support through your school.</p><a class="btn btn-primary" href="school-resources.html?topic=housing">Find campus housing support</a></div><section id="slNewMarkets" hidden><h2 class="state-heading">Added by students</h2><div class="market-grid" id="slNewMarketGrid"></div></section><p class="source-note">A directory mention is not an endorsement or a paid partnership. Check the property’s current terms and eligibility directly.</p></section><script type="module" src="assets/sublease.js"></script>` +
    faqs(),
);
emit(
  "subleasing.html",
  "Subleasing and reletting a student lease",
  "A practical student guide to subleasing, lease assignments and reletting: how each works, how to do it safely, and how to avoid sublease scams.",
  hero(
    "Subleasing and reletting, made simpler.",
    "Plans change. If you need to move out early, or you need a place for a semester, here is how subleases and relets usually work and how to protect yourself.",
    `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Sublease War Room</a><a class="btn btn-ghost" href="#checklists">Jump to checklists</a></div>`,
    "Housing guide",
  ) +
    `<section class="wrap prose"><h2>Sublease, relet or assignment?</h2><p>The words get mixed up, and landlords use them differently. Ask your property which terms it uses before you advertise anything.</p><ul><li><strong>Sublease.</strong> You stay on the original lease and someone else lives in your place for part of the term. You are still responsible to the landlord.</li><li><strong>Relet (re-let).</strong> The property finds a new tenant and may release you from the lease, often for a fee. This is common at student apartment communities.</li><li><strong>Lease assignment or takeover.</strong> The new tenant takes over your lease. The landlord usually has to approve it in writing.</li></ul><p>Many leases ban subleasing without written permission. Read your lease and get the landlord’s approval before you list your place.</p></section>
<section class="wrap prose" id="checklists"><h2>If you are leaving your place</h2><ul><li>Read the lease section on subleasing, assignment and early termination.</li><li>Ask the landlord or leasing office, in writing, whether they offer a relet program and what it costs.</li><li>Get any approval in writing before you advertise, including the new tenant’s screening requirements.</li><li>Post clear photos, the rent, the dates, deposit terms and what utilities cost.</li><li>Meet applicants in person or by live video, and never give out your lease login or personal ID numbers.</li><li>Sign a written sublease agreement with the exact dates, rent, deposit and who pays what.</li><li>Keep records of every payment and message.</li></ul></section>
<section class="wrap prose"><h2>If you are taking over a place</h2><ul><li>Tour the unit in person or on live video before you send any money.</li><li>Confirm with the landlord, not just the current tenant, that the sublease is allowed.</li><li>Ask who the lease is with and whether the landlord will put you in writing.</li><li>Find out how the deposit works, and whether you pay the current tenant or the landlord.</li><li>Check what you will owe for utilities, parking, fees and damage already in the unit.</li><li>Take dated photos on move-in day and send them to the landlord.</li></ul></section>
<section class="wrap prose"><h2>Avoiding sublease scams</h2><ul><li>Walk away if someone asks you to pay a deposit before you see the unit or sign anything.</li><li>Be wary of requests for gift cards, wire transfers, cash apps or cryptocurrency.</li><li>Be wary of a landlord who is “out of the country” and can only mail keys.</li><li>Search the address and compare photos. Scammers often reuse listings.</li><li>If a price looks far below similar places nearby, treat it as a warning sign.</li></ul><p>Reporting a scam: contact your campus housing office, your local police non-emergency line, and the platform where the listing was posted.</p></section>
<section class="wrap prose"><h2>Where students find subleases</h2><p>Each market page on our housing directory links to its local student Facebook group where students post subleases and relets. Browse the group, read recent posts, and apply the checklist above before you commit.</p><p><a class="btn btn-primary" href="sublease-war-room.html">Open the Sublease War Room</a> <a class="btn btn-ghost" href="housing.html#markets">Browse housing markets</a></p><p class="source-note">This guide is general information, not legal advice. Lease rules and tenant rights vary by state and by property. For help, check your school’s student legal services or local tenant resources.</p></section>`,
);
const initials = (name) =>
  name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
// Photos only appear once someone has marked them approved (photoApproved) and written alt text.
function rentalVisual(p, m, badge) {
  const src = p.photoApproved && p.photo ? p.photo : p.spotlight?.photo && p.spotlight?.photoAlt ? p.spotlight.photo : "";
  const alt = p.photoAlt || p.spotlight?.photoAlt || "";
  const tag = badge ? `<span class="rental-badge">${e(badge)}</span>` : "";
  if (src && alt) return `<div class="rental-visual"><img src="${e(src)}" alt="${e(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">${tag}</div>`;
  return `<div class="rental-visual"><div class="rental-art" aria-hidden="true"><span class="rental-mark">${e(initials(p.name))}</span><small>${e(m.place)}</small></div>${tag}</div>`;
}
function rentalCard(p, m, { badge, feed }) {
  const site = p.website ? external(p.website, "Visit website", "btn btn-primary") : external(p.maps, "Find on Maps", "btn btn-primary");
  const maps = p.website ? external(p.maps, "View on Maps", "btn btn-ghost") : "";
  const post = feed && p.spotlight?.facebookPost ? external(p.spotlight.facebookPost, "See the group post", "link") : "";
  const when = feed && p.spotlight?.publishedAt ? `<p class="rental-meta">Posted ${dateLabel(p.spotlight.publishedAt)} by our team</p>` : "";
  const fallback = "Official source reviewed. Confirm current floor plans, pricing, and availability directly with the property.";
  return `<article class="rental-card" id="${feed ? "feed-" : ""}${e(p.id)}">${rentalVisual(p, m, badge)}<div class="rental-body"><div class="card-heading"><h3>${e(p.name)}</h3>${saveButton({ ...p, name: p.name })}</div>${when}${p.address ? `<p class="rental-meta">${e(p.address)}</p>` : ""}<p>${e(p.summary || fallback)}</p><div class="cta-row">${site}${maps}${post}</div><p class="review-date">${p.verifiedAt ? "Official source reviewed " + dateLabel(p.verifiedAt) + ". Check current pricing and availability with the property." : "Not independently verified. Confirm details with the property."}</p></div></article>`;
}
const marketPageBody = (m) => {
  const picks = m.properties.filter((p) => p.pick).sort((a, b) => a.pick - b.pick).slice(0, 3);
  const feed = m.properties
    .filter((p) => p.spotlight)
    .sort((a, b) => (b.spotlight.publishedAt || "").localeCompare(a.spotlight.publishedAt || ""));
  const more = m.properties.filter((p) => !p.pick && !p.spotlight);
  const groupId = (m.facebookGroup || feed.map((p) => p.spotlight.facebookPost).find(Boolean) || "").match(/facebook\.com\/groups\/(\d+)/)?.[1];
  const groupUrl = m.facebookGroup || (groupId ? `https://www.facebook.com/groups/${groupId}/` : "");
  const groupBtn = groupUrl ? external(groupUrl, "Join the Facebook group", "btn btn-ghost") : "";
  const moreGroups = (m.facebookGroupsMore || []).length
    ? `<p class="more-groups">More groups for this market: ${m.facebookGroupsMore.map((g) => external(g.url, g.label, "link")).join(" · ")}</p>`
    : "";
  const picksHtml = picks.length
    ? `<section class="wrap market-section" id="top-picks"><div class="section-head-row"><div><p class="eyebrow">Near ${e(m.school)}</p><h2>${picks.length === 3 ? "Our top 3 picks" : "Our top picks"}</h2></div></div><div class="rental-grid">${picks.map((p) => rentalCard(p, m, { badge: "Top pick " + p.pick })).join("")}</div></section>`
    : `<section class="wrap market-section" id="top-picks"><div class="empty-feed"><h2>Top picks for ${e(m.place)} are on the way</h2><p>We only feature properties after reviewing their official sites. Check back soon, or suggest one below.</p></div></section>`;
  const feedHtml = `<section class="wrap market-section" id="available-rentals"><div class="section-head-row"><div><h2>Available Rentals &amp; Subleases</h2><p class="feed-note">Always confirm price and availability with the property.</p>${moreGroups}</div>${groupBtn}</div><div class="rental-grid sl-market-feed" data-sl-market="${e(m.id)}" hidden></div>${seoIds.has(m.id) ? `<p class="feed-note">New to subleasing? <a href="${seoFile(m)}">How to sublease, relet or take over a lease near ${e(seoPrimary(m))}</a>.</p>` : ""}${feed.length ? `<div class="rental-grid">${feed.map((p) => rentalCard(p, m, { badge: "Available", feed: true })).join("")}</div>` : `<div class="empty-feed" data-sl-empty><h3>No rentals posted for ${e(m.place)} yet</h3><p>Our team is scanning the market. Know a good rental or manage one here? Send it our way.</p><div class="cta-row"><a class="btn btn-primary" href="index.html#organizations">Suggest a rental</a>${groupBtn}</div></div>`}</section>`;
  const moreHtml = "";
  const body =
    `<div class="tape-row tape-top"><a class="tape-btn" href="sublease-war-room.html?market=${encodeURIComponent(m.id)}"><span>Moving out early? Enter the Sublease War Room</span></a></div>` +
    `<div class="wrap breadcrumb"><a href="housing.html">← All housing markets</a></div>` +
    hero(m.place, `Explore housing options near ${m.school}.`, "", "Off-campus housing") +
    `<section class="wrap"><p class="notice">${e(m.description)} Check eligibility, commute, and availability directly with each property.</p></section>` +
    picksHtml +
    feedHtml +
    moreHtml +
    faqs() +
    `<script type="module" src="assets/sublease.js"></script>` +
    `<section class="wrap"><div class="callout"><h2>Need help closer to your campus?</h2><p>Your school’s housing office may have rental guidance, emergency support, and off-campus listings.</p><div class="cta-row"><a class="btn btn-primary" href="school-resources.html?school=${encodeURIComponent(m.school)}&topic=housing">Find campus housing resources</a><a class="btn btn-ghost" href="index.html#organizations">Suggest a correction or property</a></div></div></section>`;
  return body;
};

// ---- SEO: sublease / relet / lease takeover pages --------------------------------
const SEO_NEW = ["state-college-pa","west-lafayette-in","tallahassee-fl","orlando-fl","athens-ga","tuscaloosa-al","auburn-al","baton-rouge-la","clemson-sc","chapel-hill-nc","blacksburg-va","bloomington-in","east-lansing-mi","champaign-il","lubbock-tx","waco-tx","knoxville-tn","lexington-ky","fayetteville-ar","oxford-ms","columbia-sc","columbia-mo","eugene-or","charlottesville-va","boulder-co","salt-lake-city-ut","corvallis-or","pullman-wa","norman-ok","fort-worth-tx","morgantown-wv","lafayette-la","starkville-ms","durham-nc","miami-fl","atlanta-ga","nashville-tn","louisville-ky","cincinnati-oh","kent-oh","athens-oh","south-bend-in","laramie-wy","bozeman-mt","moscow-id","logan-ut","las-cruces-nm","flagstaff-az","davis-ca","santa-barbara-ca","san-luis-obispo-ca","amherst-ma","ithaca-ny","syracuse-ny","buffalo-ny","storrs-ct","new-haven-ct","providence-ri","durham-nh","orono-me","burlington-vt","newark-de","pittsburgh-pa","hattiesburg-ms","ruston-la","statesboro-ga","oxford-oh","muncie-in","carbondale-il","dekalb-il","mount-pleasant-mi","ypsilanti-mi","huntsville-tx","nacogdoches-tx","arlington-tx","richardson-tx","corpus-christi-tx","milwaukee-wi","kansas-city-mo","st-louis-mo","indianapolis-in","richmond-va","norfolk-va","charlotte-nc","birmingham-al","jacksonville-fl","tulsa-ok","des-moines-ia","washington-dc","baltimore-md","detroit-mi","cleveland-oh"];
const SEO_SCHOOLS = ["college-station-tx", "austin-tx", "columbus", "ann-arbor", "tempe-az", "gainesville", "san-marcos-tx", "houston", "denton", "ames-ia", "tucson-az", "madison", "minneapolis", "tampa", "provo-ut", "stillwater-ok", "lawrence-ks", "manhattan-ks", "raleigh-nc", "fort-collins-co"];
const seoGood = (m) => !/^Colleges and universities near/.test(m.school) && (SEO_SCHOOLS.includes(m.id.replace(/^housing-/, "")) || m.properties.length >= 3 || SEO_NEW.includes(m.id.replace(/^housing-/, "")));
const seoMarkets = markets.filter(seoGood);
const seoFile = (m) => "sublease-" + m.id.replace(/^housing-/, "") + ".html";
const seoPrimary = (m) => /^Colleges and universities near/.test(m.school) ? m.place.split(",")[0] : m.school.split(/ & |, /)[0];
const seoIds = new Set(seoMarkets.map((m) => m.id));
const leaseFaq = [
  ["Can I get out of my apartment lease early?", "Usually yes, but it depends on your lease and your state. The common routes are a relet through the property, a sublease, a lease takeover (assignment), or paying an early termination fee. Read your lease first, then ask the landlord in writing which options they allow."],
  ["What is the cheapest way to get out of a lease?", "Often it is finding a qualified replacement tenant, because you stop paying rent as soon as someone else takes over. That can be a relet handled by the property, a lease takeover the landlord approves, or a sublease where you stay responsible on paper."],
  ["Will breaking my lease hurt my credit?", "Unpaid rent or fees that go to collections can show up on a credit report. Handling the exit in writing with your landlord, and keeping proof of any agreement, lowers that risk. This is general information, not legal advice."],
  ["Do I need my landlord's permission to sublease?", "Most leases require it. Subleasing without permission can be a lease violation. Ask for approval in writing before you advertise the place or accept money from anyone."],
  ["How fast can I find someone to take over my lease?", "It varies by market and season. Places priced fairly, with good photos, posted in the right student groups and shared widely tend to move fastest. Starting early, before the move-out date, helps a lot."],
];
const stateCode = (m) => (m.place.match(/,\s*([A-Z]{2})$/) || [, ""])[1];
const stateName = (m) => (stateNotes[stateCode(m)]?.name) || (m.place.split(",").pop().trim());
const stateParas = (m) => stateNotes[stateCode(m)]?.paras || [defaultStateNote(m.place.split(",").pop().trim())];
const seoSchoolPage = (m) => {
  const name = seoPrimary(m);
  const props = m.properties.slice(0, 6).map((p) => e(p.name));
  const faq = [
    [`How do I find a sublease near ${name}?`, `Start with the live listings on this page, then check the student housing groups for ${m.place} and the property websites near campus. Always tour in person or on live video and confirm the landlord approved the sublease before you send any money.`],
    [`How do I get out of my lease near ${name}?`, `Read your lease, then ask your property whether it offers a relet or lets you assign or sublease. Many students near ${name} find a replacement tenant themselves, which stops rent from piling up. Get everything in writing.`],
    [`What is the difference between a sublease, a relet and a lease takeover in ${m.place}?`, `A sublease keeps you on the lease while someone else lives there. A relet lets the property find a new tenant and release you. A lease takeover (assignment) moves the lease to the new tenant, with landlord approval. Terms vary by property, so ask which your landlord uses.`],
    [`Is subleasing safe near ${name}?`, `It can be, if you avoid common scams: never pay a deposit before seeing the unit, be wary of gift cards, wire transfers and requests to move off the platform, and confirm the person is who they say they are.`],
  ];
  const body =
    `<div class="wrap breadcrumb"><a href="sublease-by-school.html">← Sublease by school</a></div>` +
    hero(`Sublease, relet or lease takeover near ${name}`, `Find a sublease, relet or lease takeover near ${m.school} in ${m.place}, or get out of your lease early.`, `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html?market=${encodeURIComponent(m.id)}">List your place</a><a class="btn btn-ghost" href="${m.file}#available-rentals">See live listings</a></div>`, "Sublease & relet") +
    `<section class="wrap prose"><h2>Subleases, relets and lease takeovers in ${e(m.place)}</h2><p>${e(m.description)} That mix of neighborhoods means students near ${e(name)} are always looking to hand off a lease or pick one up mid-term.</p><p>Whether you call it a sublease, a relet or a lease takeover, the goal is the same: a new tenant moves in, and the person leaving stops paying for a place they are not using.</p></section>` +
    `<section class="wrap prose" id="listings"><h2>Live sublease listings near ${e(name)}</h2><p>Student sublease listings are posted under Available Rentals &amp; Subleases on the <a href="${m.file}#available-rentals">${e(m.place)} housing page</a>.</p></section>` +
    `<section class="wrap prose"><h2>Leaving your lease near ${e(name)}?</h2><ol><li>Read the lease sections on subleasing, assignment and early termination.</li><li>Ask the leasing office, in writing, about their relet or lease takeover process and any fees.</li><li>List your place where students near ${e(name)} will see it, and share it in the local housing groups.</li><li>Tour, get the landlord's approval in writing, and sign the paperwork before any money moves.</li></ol></section>` +
    `<section class="wrap prose"><h2>When to list a sublease near ${e(name)}</h2><p>${e(calendarNote)}</p></section>` +
    `<section class="wrap prose"><h2>Sublease tips for ${e(name)} students</h2><ul>${tipsAndTricks.map(([h, p]) => `<li><strong>${e(h)}.</strong> ${e(p)}</li>`).join("")}</ul></section>` +
    `<section class="wrap prose"><h2>Sublease scams to watch for near ${e(name)}</h2><ul>${scamFlags.map((s) => `<li>${e(s)}</li>`).join("")}</ul></section>` +
    `<section class="wrap prose"><h2>${e(stateName(m))} rules to know</h2>${stateParas(m).map((p) => `<p>${e(p)}</p>`).join("")}<p class="source-note">General information, not legal advice.</p></section>` +
    (props.length ? `<section class="wrap prose"><h2>Apartment communities near ${e(name)}</h2><p>Properties we track in ${e(m.place)} include ${props.join(", ")}. Each property has its own sublease and relet rules, so check with the leasing office before you list or apply. See all of them on our <a href="${e(m.file)}">${e(m.place)} housing page</a>.</p></section>` : `<section class="wrap prose"><p>See our <a href="${e(m.file)}">${e(m.place)} housing page</a> for properties and local student groups.</p></section>`) +
    `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Common questions</p><h2>Subleasing near ${e(name)}</h2></div><div class="faq-list">${faq.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div></div></section>` +
    `<section class="wrap prose"><p class="source-note">General information, not legal advice. Lease and tenant rules vary by state and by property.</p></section>` +
    "";
  emit(seoFile(m), `Sublease near ${name}: Relet & Lease Takeover | ${m.place}`, `Find a sublease, relet or lease takeover near ${m.school} in ${m.place}, or get out of your lease early. Live student listings and a safe-sublease checklist.`, body, { faq });
};
for (const m of seoMarkets) seoSchoolPage(m);
emit(
  "sublease-by-school.html",
  "Sublease by school: relets and lease takeovers near campus",
  "Browse sublease, relet and lease takeover pages for major off-campus student housing markets, and list your own place for local students.",
  hero("Sublease by school.", "Find a sublease or hand off your lease near campus.", `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Sublease War Room</a><a class="btn btn-ghost" href="get-out-of-my-lease.html">Get out of your lease</a></div>`, "Sublease & relet") +
    `<section class="wrap prose"><h2>Pick your school</h2>${(() => { const by = {}; for (const m of seoMarkets) (by[(m.place.match(/,\s*([A-Z]{2})$/) || [, "Other"])[1]] ||= []).push(m); return Object.keys(by).sort().map((st) => `<h3>${st}</h3><ul class="link-grid">${by[st].map((m) => `<li><a href="${seoFile(m)}">Sublease near ${e(seoPrimary(m))} <span class="muted">(${e(m.place)})</span></a></li>`).join("")}</ul>`).join(""); })()}<p>Guides: <a href="sublease-guides.html">all sublease and relet guides</a>.</p><p>Don't see your school? <a href="housing.html#markets">Browse every housing market</a> or <a href="sublease-war-room.html">list your place anyway</a>.</p></section>`,
);
emit(
  "get-out-of-my-lease.html",
  "How to get out of your apartment lease early (student guide)",
  "Need to leave your apartment lease early? Compare relets, subleases, lease takeovers and early termination, what they cost, and how to do it safely.",
  hero("How to get out of your lease early.", "Your options, from cheapest to most expensive, and what to do first.", `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Sublease War Room</a><a class="btn btn-ghost" href="sublease-vs-relet-vs-lease-takeover.html">Sublease vs relet vs takeover</a></div>`, "Student housing guide") +
    `<section class="wrap prose"><h2>Start here</h2><ol><li><strong>Read your lease.</strong> Look for sublease, assignment, relet and early termination sections, plus any fees.</li><li><strong>Talk to the leasing office in writing.</strong> Ask what they allow and what it costs. Keep every reply.</li><li><strong>Pick the route</strong> below that fits your lease and your timeline.</li></ol></section>` +
    `<section class="wrap prose"><h2>Your options</h2><h3>1. Relet through the property</h3><p>The property finds the next tenant, often from its own relet list, and releases you once someone signs. It is usually the cleanest exit because the landlord controls the paperwork. Ask to be added to the relet list and check in often. The more you stay in touch, the more you stay on their mind.</p><h3>2. Lease takeover (assignment)</h3><p>A new tenant takes over your lease with the landlord's approval. You can often be released from the lease afterward, but only if the landlord agrees in writing.</p><h3>3. Sublease</h3><p>Someone else lives in your place while you remain on the lease. It works when the landlord allows it, but you are still responsible if the subtenant stops paying, so vet carefully.</p><h3>4. Pay to break the lease</h3><p>Some leases let you terminate early for a fee or a set number of months of rent. It is certain but can cost the most.</p></section>` +
    `<section class="wrap prose"><h2>Get the most out of any option</h2><ul><li>Start early. Rent keeps running until someone takes over.</li><li>Price fairly and use good photos. The first week matters most.</li><li>Share the listing in your school's student housing groups, not just one site.</li><li>Get the landlord's approval in writing before anyone pays or moves in.</li><li>Never accept a deposit from someone you haven't met or can't verify.</li></ul><p>Our <a href="sublease-war-room.html">Sublease War Room</a> builds the listing, shares it to local housing groups, writes your posts, and emails your landlord every week for you.</p><p class="source-note">General information, not legal advice. Lease and tenant rules vary by state and by property.</p></section>` +
    `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Common questions</p><h2>Getting out of a lease</h2></div><div class="faq-list">${leaseFaq.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div></div></section>`,
  { faq: leaseFaq },
);
const compareFaq = [
  ["Which is better: a sublease or a lease takeover?", "A lease takeover usually ends your responsibility once the landlord approves it in writing. A sublease keeps you on the lease, so you stay liable. If your landlord allows both, a takeover or relet is usually safer for the person leaving."],
  ["What does relet mean?", "A relet means the property finds a new tenant for your unit and releases you from the lease once the new tenant signs. Many student properties run a relet list."],
  ["Can a landlord refuse a sublease?", "Many leases require landlord consent, and some prohibit subleasing. Check your lease and ask in writing. Rules differ by state."],
];
emit(
  "sublease-vs-relet-vs-lease-takeover.html",
  "Sublease vs relet vs lease takeover: what's the difference?",
  "Sublease, relet and lease takeover (assignment) sound alike but work differently. See who stays on the lease, who is liable, and which fits your situation.",
  hero("Sublease vs relet vs lease takeover.", "Three ways to hand off a lease, and who is responsible in each.", `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Sublease War Room</a><a class="btn btn-ghost" href="get-out-of-my-lease.html">Get out of your lease</a></div>`, "Student housing guide") +
    `<section class="wrap prose"><div class="table-wrap"><table><thead><tr><th></th><th>Sublease</th><th>Relet</th><th>Lease takeover</th></tr></thead><tbody><tr><th>Who finds the new tenant?</th><td>You</td><td>The property (you can help)</td><td>You, with landlord approval</td></tr><tr><th>Do you stay on the lease?</th><td>Yes</td><td>No, once released</td><td>Usually no, once approved</td></tr><tr><th>Who is liable if rent stops?</th><td>You</td><td>The new tenant</td><td>The new tenant</td></tr><tr><th>Landlord approval?</th><td>Usually required</td><td>It is their process</td><td>Always</td></tr></tbody></table></div><h2>Sublease</h2><p>You rent your place to someone else for part or all of the remaining term. You stay on the lease and remain responsible for rent and damage.</p><h2>Relet</h2><p>The property helps find a new tenant and releases you after they sign. Ask about fees and whether you must keep paying until a replacement signs.</p><h2>Lease takeover (assignment)</h2><p>You transfer the lease itself. With the landlord's written approval, the new tenant steps into your place.</p><p>Not sure which applies? Ask your leasing office, then <a href="sublease-war-room.html">list your place in the Sublease War Room</a>. <a href="sublease-by-school.html">Browse subleases by school</a>.</p><p class="source-note">General information, not legal advice. Rules vary by state and by property.</p></section>` +
    `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Common questions</p><h2>Sublease, relet and takeover</h2></div><div class="faq-list">${compareFaq.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div></div></section>`,
  { faq: compareFaq },
);

// ---- SEO: state pages and question guides --------------------------------------
const STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", FL: "Florida", GA: "Georgia", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia", WA: "Washington", WI: "Wisconsin" };
const byState = {};
for (const m of seoMarkets) { const st = (m.place.match(/,\s*([A-Z]{2})$/) || [])[1]; if (STATES[st]) (byState[st] ||= []).push(m); }
const stateSlug = (n) => n.toLowerCase().replace(/\s+/g, "-");
for (const [st, list] of Object.entries(byState)) {
  const name = STATES[st];
  const faq = [
    [`How do I get out of a lease in ${name}?`, `Start with your lease and ask your property in writing about a relet, lease takeover or sublease. Rules differ by state and by property, so confirm what applies to you. Finding a qualified replacement tenant is often the fastest way to stop paying rent on a place you are not using.`],
    [`Can I sublease my apartment in ${name}?`, `Many leases allow it with the landlord's written approval, and some prohibit it. Ask before you advertise, and keep the approval in writing.`],
    [`Where do students look for subleases in ${name}?`, `Student housing groups on Facebook, school housing boards and sublease listings near campus. The Sublease War Room lists your place and shares it to local groups for you.`],
  ];
  const body = `<div class="wrap breadcrumb"><a href="sublease-by-school.html">← Sublease by school</a></div>` +
    hero(`Sublease, relet or lease takeover in ${name}`, `Find a sublease near campus or hand off your lease at a ${name} college.`, `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Enter the Sublease War Room</a><a class="btn btn-ghost" href="get-out-of-my-lease.html">Get out of your lease</a></div>`, "Sublease & relet") +
    `<section class="wrap prose"><h2>Sublease pages by school in ${e(name)}</h2><ul class="link-grid">${list.map((m) => `<li><a href="${seoFile(m)}">Sublease near ${e(seoPrimary(m))} <span class="muted">(${e(m.place)})</span></a></li>`).join("")}</ul><p>Moving out early? The <a href="sublease-war-room.html">Sublease War Room</a> lists your place, shares it to local housing groups and emails your landlord every week. Read the guides on <a href="get-out-of-my-lease.html">getting out of a lease</a> and <a href="sublease-vs-relet-vs-lease-takeover.html">sublease vs relet vs lease takeover</a>.</p><p class="source-note">General information, not legal advice. Tenant rules vary by state and by property.</p></section>` +
    `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Common questions</p><h2>Subleasing in ${e(name)}</h2></div><div class="faq-list">${faq.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div></div></section>`;
  emit(`sublease-${stateSlug(name)}.html`, `Sublease in ${name}: Relet & Lease Takeover Help for Students`, `Find a sublease, relet or lease takeover near ${name} colleges, or get out of your lease early. School-by-school pages and a safe-sublease guide.`, body, { faq });
}
const qGuides = [
  ["can-my-landlord-refuse-a-sublease", "Can my landlord refuse a sublease?", "Can a landlord refuse a sublease? What your lease says, how to ask for approval, and what to do if the answer is no.", "Can my landlord refuse a sublease?", "It depends on your lease and your state.", [["Check your lease first", "Many leases say a sublease needs the landlord's written consent, and some prohibit it. Look for sections on subleasing, assignment and relet."], ["Ask in writing", "Send a short message naming the person you want to bring in, the dates, and that you will stay responsible if that applies. Keep the reply."], ["If the answer is no", "Ask about a relet or lease takeover instead, or about an early termination fee. Offering a qualified replacement tenant gives the landlord a reason to say yes."], ["Do not skip approval", "Subleasing without permission can be a lease violation. Get it in writing before anyone pays or moves in."]], [["Can a landlord say no to a sublease?", "Often yes, depending on the lease and state law. Ask in writing and keep the answer."], ["What if my lease does not mention subleasing?", "Ask the landlord anyway and get the answer in writing. Rules differ by state."]]],
  ["how-much-does-it-cost-to-break-a-lease", "How much does it cost to break a lease?", "What breaking a lease can cost: early termination fees, remaining rent, and cheaper ways out like a relet or lease takeover.", "How much does it cost to break a lease?", "The cost ranges from a set fee to the rest of your rent.", [["What your lease says", "Some leases set an early termination fee or a number of months of rent. Others make you pay rent until the unit is relet."], ["Remaining rent", "If you leave with no agreement, you can owe rent through the end of the lease, plus fees. Some states require landlords to try to find a new tenant."], ["Ways to pay less", "A relet, lease takeover or approved sublease can cut your cost sharply because rent stops once a replacement signs or moves in."], ["Get it in writing", "Whatever you agree, keep the written terms so a surprise charge does not show up later."]], [["Is it cheaper to sublease or break the lease?", "Often a relet, takeover or approved sublease costs less than paying a fee or the remaining rent. Ask your landlord what they allow."], ["Can I get my deposit back?", "That depends on your lease, the condition of the unit and local rules. Ask about it when you agree the exit."]]],
  ["sublease-scams-to-avoid", "Sublease scams to avoid", "Sublease scams to avoid as a student: fake listings, deposit requests, gift cards and wire transfers, and how to stay safe.", "Sublease scams to avoid", "A few warning signs catch most scams.", [["Never pay before you see it", "Do not send a deposit or rent for a place you have not toured in person or on live video."], ["Avoid gift cards and wires", "Legitimate landlords and subtenants do not ask for gift cards, wire transfers or crypto."], ["Verify the person", "Confirm the listing with the leasing office and ask for a photo ID and proof they are on the lease."], ["Stay on the platform", "Be wary of anyone who wants to move the chat to text right away or pressures you to act now."]], [["How do I know a sublease is real?", "Tour it, confirm with the landlord that the sublease is approved, and use a written agreement."], ["What should I do if I think it is a scam?", "Stop sending money, save the messages, and report it to the platform and your local authorities."]]],
  ["how-to-sublease-your-apartment", "How to sublease your apartment", "How to sublease your apartment to a student: get approval, set a fair price, write a great listing, vet people and sign the paperwork.", "How to sublease your apartment", "Six steps from approval to move-in.", [["Get approval", "Read your lease and ask your landlord in writing. Many properties require consent."], ["Price it fairly", "Check similar places nearby. A fair price brings more people in the first week, when interest is highest."], ["Write a clear listing", "Include dates, rent, what is included, floor plan, perks and good photos."], ["Share it where students look", "Post in your school's housing groups and listings. The Sublease War Room does this for you."], ["Vet the person", "Meet them, confirm who they are, and run the landlord's application if there is one."], ["Sign it properly", "Use the landlord's paperwork or a written sublease agreement, and settle the deposit and key hand-off."]], [["How long does a sublease take?", "It varies by market and season. Starting early and sharing widely usually helps."], ["Am I still responsible with a sublease?", "Usually yes, because you stay on the lease. A relet or lease takeover can release you instead."]]],
];
qGuides.push(...extraGuides);
const guideFiles = qGuides.map((g) => g[0] + ".html");
for (const [slug, title, desc, h1, sub, steps, faq] of qGuides) {
  const body = hero(h1 + ".", sub, `<div class="cta-row"><a class="btn btn-primary" href="sublease-war-room.html">Enter the Sublease War Room</a><a class="btn btn-ghost" href="get-out-of-my-lease.html">Get out of your lease</a></div>`, "Student housing guide") +
    `<section class="wrap prose">${steps.map(([h, p]) => `<h2>${e(h)}</h2><p>${e(p)}</p>`).join("")}<p>Need help? The <a href="sublease-war-room.html">Sublease War Room</a> builds your listing, shares it to local housing groups and emails your landlord weekly. See <a href="sublease-by-school.html">sublease pages by school</a> or compare <a href="sublease-vs-relet-vs-lease-takeover.html">sublease vs relet vs lease takeover</a>.</p><p class="source-note">General information, not legal advice. Rules vary by state and by property.</p></section>` +
    `<section id="tips"><div class="wrap"><div class="section-head"><p class="eyebrow">Common questions</p><h2>${e(h1)}</h2></div><div class="faq-list">${faq.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div></div></section>`;
  emit(slug + ".html", title, desc, body, { faq });
}
emit("sublease-guides.html", "Sublease, relet and lease takeover guides for students", "Guides for students on subleasing, reletting and lease takeovers: getting out of a lease, costs, scams and how to sublease safely.", hero("Sublease guides.", "Straight answers on getting out of a lease.", "", "Student housing guide") + `<section class="wrap prose"><ul class="link-grid"><li><a href="get-out-of-my-lease.html">How to get out of your lease early</a></li><li><a href="sublease-vs-relet-vs-lease-takeover.html">Sublease vs relet vs lease takeover</a></li>${qGuides.map((g) => `<li><a href="${g[0]}.html">${e(g[1])}</a></li>`).join("")}<li><a href="sublease-by-school.html">Sublease by school</a></li></ul></section>`);
for (const m of markets)
  emit(
    m.file,
    `Housing near ${seoPrimary(m)}: Rentals, Subleases & Lease Takeovers`,
    `Apartments, subleases, relets and lease takeovers near ${m.school} in ${m.place}. Student listings, nearby properties, and how to get out of your lease.`,
    marketPageBody(m),
  );
// Template for markets that students add. The Worker fills in the tokens.
{
  const tpl = { id: "c-tplmarket", file: "market-template.html", school: "TPL_SCHOOL", place: "TPL_PLACE", description: "Students near TPL_SCHOOL share places, lease takeovers and subleases here. Check eligibility, commute, and availability directly with each property.", properties: [] };
  emit(tpl.file, "Housing research in TPL_PLACE", "Explore property sources and housing search questions near TPL_SCHOOL in TPL_PLACE.", marketPageBody(tpl), { noindex: true });
}
{
  const cityCount = {};
  for (const m of markets) { const c = m.place.split(",")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); cityCount[c] = (cityCount[c] || 0) + 1; }
  const links = {};
  for (const m of markets) {
    const c = m.place.split(",")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const full = m.id.replace(/^housing-/, "");
    links[full] = m.file;
    if (cityCount[c] === 1) links[c] = m.file;
  }
  await writeFile("worker/market-links.mjs", "// Generated by scripts/build.mjs: short links like /go/ames for each housing market.\nexport const marketLinks = " + JSON.stringify(links, null, 2) + ";\n");
  await writeFile("worker/sublease-redirects.mjs", "export const subleaseRedirects = {};\n");
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
    textbooks: [
      "Textbooks, without the sticker shock.",
      "We know not every student can afford to buy books brand new, and you shouldn’t have to. Start with the free and low-cost options below.",
    ],
    "student-products": [
      "Everything for college, for less.",
      "Tech, dorm and apartment basics, and school supplies. Start with free and secondhand.",
    ],
    "test-prep": [
      "Prep for your test without overpaying.",
      "Official free practice, fee waivers, and credit-by-exam options.",
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
    textbooks: ["Book finder", "Free books", "Rent or buy used", "Saving tips", "More products"],
    "student-products": ["Tech & software", "Furnish for less", "Essentials", "School supplies"],
    "test-prep": ["SAT, ACT & AP", "Credit by exam", "Graduate school", "Study tips"],
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
    `<section class="wrap search-page"><form id="resourceSearchForm" class="home-search" action="search.html" method="get" role="search"><label class="sr-only" for="resourceSearch">Search all resources</label>${icon("search")}<input id="resourceSearch" name="q" type="search" maxlength="120" placeholder="Try NASA, nursing, or Athens" autocomplete="off"><button class="btn btn-primary">Search ${icon("arrow")}</button></form><div class="search-categories"><a href="scholarships.html">Scholarships</a><a href="internships.html">Internships</a><a href="housing.html">Housing</a><a href="discounts.html">Discounts</a></div><p class="result-count" id="resourceSearchCount" role="status" aria-live="polite"></p><div class="listing-grid" id="resourceSearchResults"></div><div class="empty-state" id="resourceSearchEmpty"><span class="empty-icon">${icon("search")}</span><h2>What’s on your mind?</h2><p>Search a name, interest, school, or city—or choose a category above.</p></div><div class="load-more"><button class="btn btn-ghost" id="moreSearchResults" type="button" hidden>Show more results</button></div><noscript><p class="notice">Choose a category above to browse resources. Enable JavaScript to search the full directory.</p></noscript></section>`,
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
    `<section class="wrap"><p class="notice">Saved items don’t create an account or email subscription. Clearing browser data removes your list. You can export a backup and import it in another browser.</p><div class="admin-controls"><button class="btn btn-ghost" data-export-saved>Export saved list</button><button class="btn btn-ghost" type="button" data-import-saved>Import saved list</button><input id="savedImport" aria-label="Import a Student Resource Center saved list" type="file" accept="application/json,.json" hidden><button class="btn btn-ghost" data-clear-saved>Clear saved list</button></div><p class="result-count" id="savedCount" role="status" aria-live="polite"></p><div class="listing-grid" id="savedGrid"></div><div class="empty-state" id="savedEmpty"><h2>Make room for your next opportunity.</h2><p>Use the Save button on a scholarship, career program, discount, or property.</p><a class="btn btn-primary" href="scholarships.html">Find something to save</a></div></section>`,
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
    `<section class="wrap"><form class="school-search" id="schoolSearch" action="https://www.google.com/search" method="get" role="search"><div><label for="schoolName">College or university name</label><input id="schoolName" name="as_q" type="search" required maxlength="150" placeholder="e.g. University of Houston" autocomplete="organization"></div><div><label for="schoolTopic">I’m looking for</label><select name="as_epq" id="schoolTopic">${topics.map((t) => `<option>${e(t)}</option>`).join("")}</select></div><button class="btn btn-primary" type="submit">Search campus support ${icon("arrow")}</button><p class="fineprint">Opens Google search results for your school and topic. Choose your school’s official website.</p></form><div class="callout"><h2>Still choosing a school?</h2><p>Explore accredited institutions and official college information through the U.S. Department of Education.</p>${external("https://nces.ed.gov/collegenavigator/", "Open College Navigator", "btn btn-ghost")}</div></section>`,
);
const privacy = `<section class="wrap prose"><p class="fineprint">Effective October 31, 2026</p><h2>What this resource center collects</h2><p>You can browse without an account. Saving a resource stores its identifier in your browser’s local storage. Your saved list stays on your device unless you choose to export or share it.</p><p>If you submit a resource, mentoring interest, or data request, we collect the fields you provide, your agreement to the request-specific privacy notice, and a receipt identifier. These records are stored privately using Cloudflare D1 so the AstroPro team can review and respond. Most forms do not subscribe you to a newsletter. The one exception is the scholarship help sign-up, where you choose to give us your email.</p><h2>Scholarship help sign-ups</h2><p>If you join the scholarship help list, we store your email, your optional first name, and the kind of help you chose in the same private database. We use them to email you about our scholarship application help service (if it opens), new scholarships, and deadlines. We keep them until you unsubscribe or ask us to delete them, and we do not sell or share them. Use <a href="unsubscribe.html">Email preferences</a> or the link in any message to opt out.</p><h2>Request handling and security</h2><p>Submission records are accessible only through an authenticated staff interface. We use short-lived, hashed network identifiers for abuse prevention; we do not store raw IP addresses in the submission database. Our hosting provider may process technical request information to operate and protect the service.</p><p>Resource and mentoring requests are retained for up to 90 days. Data requests are retained for up to 90 days while handled by the team. Communication preferences retain an email address and a dated do-not-contact record until changed or removed through a verified data request. Browser storage for a pending form may retain its receipt identifier and content in your current tab until it is accepted or you close the tab.</p><h2>How information is used</h2><p>We use a submitted request to review a resource, assess a mentoring inquiry, respond to you, or handle your data or communication preference request. We do not publish form submissions automatically or sell your contact information. We do not share a school-provided student directory through this service.</p><h2>External sites</h2><p>Applications and provider offers open on third-party sites with their own terms and privacy practices. Their cookies, eligibility checks, and data collection are outside this resource center. Our school finder opens a search with Google. Fonts and site assets are served from our own origin.</p><h2>Your choices</h2><p>Use <a href="data-requests.html">Your data</a> to request access, correction, or deletion. We may ask you to verify your email or identity before disclosing or changing a record. Use <a href="unsubscribe.html">Email preferences</a> to record a do-not-contact preference for this resource center.</p><p>If you already receive an AstroPro email from another system, use the unsubscribe link in that message or contact us. This site cannot confirm the state of a separate mailing list.</p><h2>Contact</h2><p>Email <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a>. Please do not submit health details, passwords, government identifiers, financial account information, or other sensitive personal information through these forms.</p></section>`;
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
    `<section class="wrap form-layout"><div class="prose"><h2>Tell us what you need.</h2><p>This form records a request for review. It does not automatically disclose or delete records. Keep your receipt so you can refer to it if you contact us.</p><p>For a separate AstroPro mailing list or another AstroPro service, include the service name in your request, or contact <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a>.</p></div><div class="form-panel">${form({ type: "data-request", button: "Send data request", fields: field("email", "Email connected to your request", "email") + field("requestType", "I would like to", "text", { options: ["Access my information", "Correct my information", "Delete my information"] }) + field("description", "Details", "textarea", { required: false, max: 2000, placeholder: "Identify the request or service, without adding sensitive personal information." }) })}</div></section>`,
);
emit(
  "unsubscribe.html",
  "Email preferences",
  "Record a do-not-contact preference for the Student Resource Center or find the unsubscribe path for existing AstroPro emails.",
  hero(
    "Choose what you hear from us.",
    "Browsing and saving resources never subscribes you to email. Record a do-not-contact preference for the Student Resource Center below.",
  ) +
    `<section class="wrap form-layout"><div class="prose"><h2>Already receiving an AstroPro email?</h2><p>Use the unsubscribe link in the message for that mailing list. If the link is missing or not working, email <a href="mailto:support@astroprostudentresourcecenter.com?subject=Unsubscribe%20request">support@astroprostudentresourcecenter.com</a> from the address you want removed.</p><p>This form stores a preference in the Student Resource Center’s own records. It does not claim to update a separate mailing platform. Request-related replies you ask for can still be sent.</p><p>To request removal of stored personal information, use <a href="data-requests.html">Your data</a>.</p></div><div class="form-panel">${form({ type: "unsubscribe", button: "Record do-not-contact preference", fields: field("email", "Your email", "email"), disclosure: "This preference applies to the Student Resource Center. Use the link in an existing email to unsubscribe from a separate mailing list." })}</div></section>`,
);
emit(
  "about.html",
  "About & editorial standards",
  "How AstroPro selects resources, labels uncertain information, and handles corrections and resource submissions.",
  hero(
    "Useful starting points. Clear expectations.",
    "We collect resources that help students navigate college and take their next step.",
  ) +
    `<section class="wrap prose"><h2>What we do</h2><p>Student Resource Center is a free directory and guide collection, and a project by AstroPro. We link to scholarship sponsors, employers, providers, property sources, and campus services. Those organizations make their own decisions and set their own rules.</p><h2>How resources are reviewed</h2><p>We prefer official sources. A “source reviewed” date means we checked the linked source for the specified information; it does not promise the provider will keep the same terms. Other entries remain starting points whose current rules need confirmation. Closed and upcoming cycles are labeled where dates are known.</p><p>Resources without a verifiable current source may be withheld. We don’t invent deadlines, availability, partnerships, rankings, or review scores. Listing counts are generated from published records.</p><h2>Housing and commercial offers</h2><p>A property mention is not a guarantee of rental suitability or an endorsement. Map links are searches, not verified listings. We do not collect rental applications or payments. Discounts may involve paid subscriptions, renewals, or third-party verification; read the terms before signing up.</p><h2>Corrections and submissions</h2><p>Spot something wrong? <a href="index.html#organizations">Send the official source and a correction</a>. Submissions are reviewed by people and are not automatically published. Our directory currently has no paid-placement ordering.</p><h2>What is available here</h2><p>Browse directories, use guides, save a shortlist on your device, find campus resources, or send a request. We do not provide automatic scholarship matching, a live job feed, or personalized financial or medical advice. If you join the scholarship help list, we email only you, only about scholarships and student resources.</p></section>`,
);
const PARTNER_CAMPAIGN_PRICE = 499;
const PAYPAL_BUSINESS_EMAIL = (
  process.env.PAYPAL_BUSINESS_EMAIL || "michael.squinn8989@gmail.com"
).trim();
const partnerSteps = [
  [
    "Complete your payment",
    `Pick your campus market below and pay the $${PARTNER_CAMPAIGN_PRICE} campaign fee through PayPal. You’ll get a reference code — keep it handy.`,
  ],
  [
    "Tell us about your campaign",
    "Come back here and continue to a short form: your contact details, what you want the email to say, a link for students to click, and either your flyer or a request for us to design one.",
  ],
  [
    "We send your email",
    "Our team reviews your details and sends your campaign to the student list for that market. We’ll email you to confirm timing.",
  ],
];
const partnerPayBody =
  hero(
    "Put your property in front of our students.",
    "AstroPro’s Student Resource Center reaches students actively searching for off-campus housing. We take pride in being a resource students trust — and we know choosing where to live is a big decision, which is why we’re careful about what reaches their inbox.",
    "",
    "Property & business partners",
  ) +
  `<section class="wrap prose">
    <h2>Why partners work with us</h2>
    <p>Off-campus housing is one of the biggest decisions a student makes each year. Students come to the Student Resource Center looking for a real place to start — not a sales pitch — and we work to keep it that way. A campaign email through AstroPro reaches that same audience directly, for the campus market you choose.</p>
  </section>
  <section class="wrap">
    <div class="section-head">
      <span class="kicker-sm">The process</span>
      <h2>How a campaign works</h2>
    </div>
    <div class="step-list">
      ${partnerSteps
        .map(
          ([title, body], i) =>
            `<div class="step"><div class="n">${i + 1}</div><div class="body"><h3>${e(title)}</h3><p>${e(body)}</p></div></div>`,
        )
        .join("")}
    </div>
  </section>
  <section class="wrap" data-partner-pay data-paypal-business="${e(PAYPAL_BUSINESS_EMAIL)}" data-price="${PARTNER_CAMPAIGN_PRICE}">
    <div class="callout">
      <h2>Step 1 · Choose your market and pay</h2>
      <p class="fineprint">Your reference code: <code data-order-ref></code> — this is included automatically when you click Pay, and carries through to your onboarding form.</p>
      <div class="field">
        <label for="partnerMarket">Campus market</label>
        <select id="partnerMarket">
          <option value="">Choose a market…</option>
          ${markets.map((m) => `<option value="${e(m.id)}">${e(m.school)} — ${e(m.place)}</option>`).join("")}
        </select>
      </div>
      <p class="award">$${PARTNER_CAMPAIGN_PRICE} flat rate, any market.</p>
      ${
        PAYPAL_BUSINESS_EMAIL
          ? `<a data-pay-link class="btn btn-primary is-disabled" aria-disabled="true" target="_blank" rel="noopener noreferrer" href="mailto:support@astroprostudentresourcecenter.com">Pay with PayPal <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`
          : `<p class="notice">Online payment isn’t configured yet. Contact <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a> to arrange payment and we’ll get your campaign started.</p>`
      }
      <p class="fineprint">After PayPal confirms your payment, continue to the onboarding form below.</p>
      <a data-continue-link data-base="partner-onboarding.html" class="btn btn-ghost" href="partner-onboarding.html">Continue to onboarding ${icon("arrow")}</a>
    </div>
  </section>
  <section class="wrap prose">
    <h2>Questions before you pay?</h2>
    <p>Email <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a> and we’ll help you get set up.</p>
  </section>`;
emit(
  "property-partners.html",
  "Property & business partners",
  "Send a paid campaign email to students in your campus market. Pay with PayPal, then tell us what you'd like to say.",
  partnerPayBody,
);
const SUBLEASE_PRICE = Number(process.env.SUBLEASE_PRICE || 39);
const slMarketOptions = (all) =>
  (all ? '<option value="">All markets</option>' : '<option value="">Choose your market</option>') +
  markets
    .slice()
    .sort((a, b) => a.place.localeCompare(b.place))
    .map((m) => `<option value="${e(m.id)}">${e(m.place)}</option>`)
    .join("");
const slGroups = Object.fromEntries(
  markets
    .map((m) => {
      const id = (m.facebookGroup || m.properties.map((p) => p.spotlight?.facebookPost).find(Boolean) || "").match(/facebook\.com\/groups\/(\d+)/)?.[1];
      return [m.id, m.facebookGroup || (id ? `https://www.facebook.com/groups/${id}/` : "")];
    })
    .filter(([, v]) => v),
);
const slScript = `<script type="module" src="assets/sublease.js"></script>`;
const slValue = [
  ["Landlord accountability", "We email your landlord for you every week asking where your relet stands, plus ready-to-send templates to confirm you're on their relet list. The more they hear from the office, the more you stay on their mind."],
  ["We share your listing to the Facebook groups in town", "Your listing gets posted from our AstroPro Facebook page into the student housing groups we belong to near your campus."],
  ["Your own public listing page", "Your listing is posted on our local housing page, where thousands of students come to look for housing. Photos, details and your own link, live for 60 days."],
  ["Ready-to-post ads", "Our team has formulated strategic, professionally written posts with your details. Copy, paste, done."],
  ["10+ places to post, done for you", "We hand you a list of 10+ platforms with your post ready for each one and a direct link. You just paste it in and press submit."],
  ["Every message in one place", "Interested students message you through your page, and you get an email each time. Your private dashboard collects them all."],
  ["Scam protection", "Messages that use common rental-scam wording are flagged before you reply."],
  ["Reply templates", "Know what to say to the first message, the tour request and the “is it still available?” question."],
  ["A 14-day game plan", "A day-by-day plan so you always know the next move, with a link to your market’s student Facebook group."],
  ["Tour, sign and hand-over checklist", "From first message to signed agreement to move-in photos, nothing gets missed."],
];
const slSteps = [
  ["Pay your one-time $" + SUBLEASE_PRICE + " onboarding fee", "One flat fee through secure PayPal. No subscription and no commission."],
  ["Fill out your onboarding form", "As soon as you finish paying, the form opens right here. Add your details, price, dates and photos."],
  ["Work your checklist", "Your private dashboard gives you a short checklist: what to post, who to nudge, how to answer each message. Check things off and your listing stays live for 60 days."],
];
const tapeHero = (...a) => hero(...a).replace('<section class="page-hero"><div class="wrap">', '<section class="page-hero tape-page"><div class="wrap tape-page-in">');
emit(
  "sublease-war-room.html",
  "Sublease War Room",
  "Stop paying rent on an empty apartment. We list your place, share it to the Facebook groups in town and email your landlord every week. One-time fee.",
  hero(
    "Stop paying rent on an empty apartment.",
    "We list your place, share it to the Facebook groups in town, and email your landlord every week until someone takes it over. Built by former apartment managers. One-time fee.",
    `<div class="cta-row"><a class="btn btn-primary" href="#start">Get started</a><a class="btn btn-ghost" href="#what-you-get">See what you get</a></div>`,
    "Sublease War Room",
  ) +
    `<section class="wrap" id="what-you-get"><div class="section-head"><span class="kicker-sm">What you get</span><h2>Everything we do to get your place subleased.</h2><p>We studied subleasing for over a decade and put everything we know here.</p></div><div class="sl-value">${slValue.map(([t, b], i) => `<div class="sl-value-item"><span class="sl-value-n">${i + 1}</span><div><h3>${e(t)}</h3><p>${e(b)}</p></div></div>`).join("")}</div><p class="source-note">We write your posts and take you to every place to post them. Facebook and most sites don’t let outside tools post for you, so you press submit yourself. This is general information, not legal advice. Subleasing rules depend on your lease and your state.</p></section>
<section class="wrap" id="slPreview"><div class="section-head"><span class="kicker-sm">See it first</span><h2>This is what your private dashboard looks like.</h2><p>An example with made-up details. Yours is built from your own listing.</p></div><div class="sl-demo" aria-label="Example dashboard"><div class="sl-demo-bar"><span></span><span></span><span></span><em>Your Sublease War Room dashboard · example</em></div><div class="sl-demo-grid"><div class="sl-demo-card"><h3>Today's to-do</h3><ul class="sl-demo-list"><li class="done">Listing is live on your campus market page</li><li class="done">We shared it to the Facebook groups in town</li><li class="done">Landlord check-in sent this week</li><li>Post to your school's Facebook housing group <b>Copy post</b></li><li>Post on Marketplace and Craigslist <b>Copy post</b></li><li>Reply to 2 new messages</li></ul></div><div class="sl-demo-card"><h3>Messages (3)</h3><div class="sl-demo-msg"><strong>Jordan</strong><p>Hi! Is the 2 bed still available for May? I can tour Thursday.</p></div><div class="sl-demo-msg flag"><strong>Chris</strong><span class="sl-demo-flag">Possible scam</span><p>I'm out of the country, I'll send a cashier's check and you wire back the extra…</p></div></div><div class="sl-demo-card"><h3>Your ready-to-post ad</h3><p class="sl-demo-post">🚨 SUBLEASE: 2-bedroom near campus for $1,100/mo. Furnished, utilities included, 5 minutes on foot to class. Tours open now. Tap the link for every photo, then message me. Places like this don't last.</p></div></div></div></section>
<section class="wrap"><div class="section-head"><span class="kicker-sm">Next steps</span><h2>Three steps to a subleased place.</h2></div><div class="step-list">${slSteps.map(([t, b], i) => `<div class="step"><div class="n">${i + 1}</div><div class="body"><h3>${e(t)}</h3><p>${e(b)}</p></div></div>`).join("")}</div><div class="cta-row"><a class="btn btn-primary" href="#start">Get started</a></div></section>
<section class="wrap" id="slCalc"><div class="section-head"><span class="kicker-sm">Do the math</span><h2>What is an empty apartment costing you?</h2><p>Enter two numbers. Nothing is saved.</p></div><div class="sl-calc"><div class="sl-row"><div class="field"><label for="slCalcRent">Your rent per month ($)</label><input id="slCalcRent" type="number" min="1" max="20000" inputmode="numeric" placeholder="e.g. 1100"></div><div class="field"><label for="slCalcMonths">Months left on your lease</label><input id="slCalcMonths" type="number" min="1" max="24" inputmode="numeric" placeholder="e.g. 5"></div></div><div id="slCalcOut" class="sl-calc-out" role="status" aria-live="polite" hidden></div></div></section>
<section class="wrap" id="start" data-sublease-start data-business="${e(PAYPAL_BUSINESS_EMAIL)}" data-price="${SUBLEASE_PRICE}"><div class="callout" id="slPayGate"><h2>Get started</h2><p><strong>$${SUBLEASE_PRICE} one-time onboarding fee.</strong> Pay securely with PayPal. When you come back from PayPal, your onboarding form opens right here.</p><div class="field sl-pay-email"><label for="slPayEmail">Your email</label><input id="slPayEmail" type="email" maxlength="254" autocomplete="email" placeholder="you@school.edu" required><p class="fineprint">We email your form link and your private War Room link here, so you can always get back in.</p></div><p><a class="btn btn-primary" data-sl-pay data-business="${e(PAYPAL_BUSINESS_EMAIL)}" data-price="${SUBLEASE_PRICE}" href="mailto:support@astroprostudentresourcecenter.com" rel="noopener">Pay $${SUBLEASE_PRICE} and get started</a></p><p id="slPayMsg" class="sl-msg" role="status" hidden></p><p class="fineprint">Already paid? <a href="sublease-manage.html">Sign in</a> and we'll email your link.</p></div>
<div class="callout" id="slFormWrap" hidden><h2>Thank you! Now tell us about your place.</h2><p>This takes about five minutes. Your listing goes live for 60 days as soon as PayPal confirms your payment.</p>
<form id="slForm" class="sl-form" novalidate>
<div class="field"><label for="slMarket">Campus market</label><select id="slMarket" name="market" required>${slMarketOptions(false)}<option value="__new">My school isn&#39;t listed</option></select></div>
<div class="field" id="slNewWrap" hidden><label for="slNewSchool">City and state</label><input id="slNewSchool" maxlength="100" placeholder="e.g. Boise, ID"><p class="fineprint">Add your school below too. We will build a full housing page for your school so other students there can find your place.</p></div>
<div class="field"><label for="slSchool">School</label><input id="slSchool" name="school" maxlength="150" placeholder="e.g. University of Florida"></div>
<div class="field"><label for="slType">What are you doing?</label><select id="slType" name="type" required><option value="sublease">Sublease (I stay on the lease)</option><option value="relet">Relet (the property finds a new tenant)</option><option value="assignment">Lease takeover (new tenant takes over my lease)</option></select></div>
<div class="field"><label for="slPermission">Does your landlord allow it?</label><select id="slPermission" name="permission" required><option value="approved">Yes, I have approval in writing</option><option value="pending">I asked and I'm waiting</option><option value="not-asked">I haven't asked yet</option><option value="not-allowed">My lease says no</option></select><p id="slPermNote" class="fineprint" hidden></p></div>
<div class="field"><label for="slTitle">Listing title</label><input id="slTitle" name="title" maxlength="120" placeholder="Sunny 2 bed near campus, summer sublease" required></div>
<div class="field"><label for="slArea">Neighborhood or building</label><input id="slArea" name="area" maxlength="150" placeholder="e.g. The Hub, 2 blocks from campus" required><p class="fineprint">Don’t include your unit number. Share the exact address only with serious applicants.</p></div>
<div class="sl-row"><div class="field"><label for="slRent">Rent per month ($)</label><input id="slRent" name="rent" type="number" min="1" max="20000" inputmode="numeric" required></div><div class="field"><label for="slDeposit">Deposit ($, optional)</label><input id="slDeposit" name="deposit" type="number" min="0" max="20000" inputmode="numeric"></div></div>
<div class="sl-row"><div class="field"><label for="slStart">Move-in date</label><input id="slStart" name="startDate" type="date" required></div><div class="field"><label for="slEnd">Move-out date</label><input id="slEnd" name="endDate" type="date" required></div></div>
<div class="sl-row"><div class="field"><label for="slBeds">Bedrooms (0 = studio)</label><input id="slBeds" name="bedrooms" type="number" min="0" max="10" required></div><div class="field"><label for="slBaths">Bathrooms</label><input id="slBaths" name="bathrooms" type="number" min="0.5" max="10" step="0.5" required></div></div>
<div class="sl-row"><div class="field"><label for="slFurn">Furnished?</label><select id="slFurn" name="furnished" required><option value="yes">Yes</option><option value="partly">Partly</option><option value="no">No</option></select></div><div class="field"><label for="slUtil">Utilities</label><select id="slUtil" name="utilities" required><option value="yes">Included</option><option value="some">Some included</option><option value="no">Not included</option></select></div></div>
<div class="field"><label for="slDesc">Describe your place</label><textarea id="slDesc" name="description" rows="6" maxlength="2000" placeholder="Roommates, parking, pets, what's nearby, why it's a good deal…" required></textarea></div>
<div class="field"><label for="slPhotos">Photos (1 to 4)</label><input id="slPhotos" type="file" accept="image/*" multiple><div id="slPreviews" class="sl-previews"></div></div>
<div class="sl-row"><div class="field"><label for="slName">Your name</label><input id="slName" name="ownerName" maxlength="100" autocomplete="name" required></div><div class="field"><label for="slEmail">Your email</label><input id="slEmail" name="ownerEmail" type="email" maxlength="254" autocomplete="email" required></div></div>
<div class="field"><label for="slPhone">Phone (optional, private)</label><input id="slPhone" name="ownerPhone" type="tel" maxlength="40" autocomplete="tel"></div>
<div class="honeypot" aria-hidden="true"><label for="slWebsite">Leave this empty</label><input id="slWebsite" name="website" tabindex="-1" autocomplete="off"></div>
<label class="checkbox-label"><input id="slConsent" type="checkbox" required><span>I have the right to list this place, and my landlord permits it or I will get permission before I accept anyone.</span></label>
<p class="fineprint">Your name and contact details are never shown on the public listing. Students message you through the page, and you see their messages in your private dashboard.</p>
<p id="slFormMsg" class="sl-msg" role="alert" hidden></p>
<button class="btn btn-primary" type="submit">Publish my listing</button>
</form>
<div id="slSuccess" hidden><h2>You're in!</h2><p>Reference code: <code data-sl-ref></code></p><p data-sl-live hidden><strong>Your listing is live for 60 days.</strong></p><p data-sl-confirming hidden><strong>Your listing goes live automatically the moment PayPal confirms your payment, usually within a minute or two.</strong> You don't need to do anything.</p><p>Next, open your dashboard. It tells you exactly what to post, where, and what to say.</p><p data-sl-emailed hidden>We emailed your private link to <strong data-sl-email></strong>. Keep that email, it's how you get back in.</p><p data-sl-notemailed hidden><strong>Save your private dashboard link below.</strong> It's how you reach your messages and launch kit. If you lose it, use <a href="sublease-manage.html">Sign in</a> and we'll send a new one.</p><div class="field"><label for="slManageUrl">Your private dashboard link</label><input id="slManageUrl" data-sl-manage-url readonly></div><p><button class="btn btn-ghost" type="button" data-sl-copy-link>Copy link</button> <a class="btn btn-primary" data-sl-manage href="sublease-manage.html">Open my dashboard</a></p></div>
</div>
</div></section>${slScript}`,
);
emit(
  "sublease-listings.html",
  "Subleases and relets near campus",
  "Browse student subleases, relets and lease takeovers by campus market.",
  hero("Subleases near campus.", "Places that students are handing off right now. Choose your market to see what's available.", "", "Student housing") +
    `<section class="wrap" id="slBrowse"><div class="directory-controls"><div><label for="slFilter">Campus market</label><select id="slFilter">${slMarketOptions(true)}</select></div></div><p id="slCount" class="result-count" role="status" aria-live="polite"></p><div id="slResults" class="sl-grid"></div><p class="source-note">Always see a place in person or on live video, confirm the landlord approves, and never send money before that. <a href="subleasing.html">Read the sublease guide.</a></p></section>${slScript}`,
);
emit(
  "sublease-listing.html",
  "Sublease listing",
  "A student sublease listing on the Sublease War Room.",
  `<div class="wrap breadcrumb"><a href="sublease-listings.html">← All subleases</a></div><section class="wrap sl-detail" id="slListing"><h1 class="sr-only">Sublease listing</h1><div id="slView"><p>Loading…</p></div><div class="callout" id="slContact"><h2>Message the student</h2><form id="slLead" class="sl-form" novalidate><div class="field"><label for="slLName">Your name</label><input id="slLName" name="name" maxlength="100" autocomplete="name" required></div><div class="field"><label for="slLEmail">Your email</label><input id="slLEmail" name="email" type="email" maxlength="254" autocomplete="email" required></div><div class="field"><label for="slLPhone">Phone (optional)</label><input id="slLPhone" name="phone" type="tel" maxlength="40" autocomplete="tel"></div><div class="field"><label for="slLMsg">Message</label><textarea id="slLMsg" name="message" rows="5" maxlength="1500" required placeholder="Hi! I'm interested. Can I tour on…?"></textarea></div><div class="honeypot" aria-hidden="true"><label for="slLWeb">Leave this empty</label><input id="slLWeb" name="website" tabindex="-1" autocomplete="off"></div><p class="fineprint">Never send a deposit or rent before you’ve seen the place and the landlord has approved. </p><p id="slLeadMsg" class="sl-msg" role="alert" hidden></p><button class="btn btn-primary" type="submit">Send message</button></form></div></section>${slScript}`,
  { noindex: true },
);
emit(
  "sublease-manage.html",
  "Your Sublease War Room dashboard",
  "Your private Sublease War Room dashboard.",
  hero("Your sublease dashboard.", "Your checklist, your messages and your launch kit, all in one place.", "", "Sublease War Room") +
    `<section class="wrap" id="slManage" data-business="${e(PAYPAL_BUSINESS_EMAIL)}" data-price="${SUBLEASE_PRICE}" data-groups="${e(JSON.stringify(slGroups))}"><div id="slDash"><p>Loading your dashboard…</p></div></section>${slScript}`,
  { noindex: true },
);
const partnerCampaignForm = form({
  type: "partner-campaign",
  button: "Submit campaign order",
  disclosure:
    "Our team reviews every campaign before it goes out. We'll follow up by email to confirm timing.",
  fields:
    `<input type="hidden" name="market" value="">` +
    `<input type="hidden" name="marketName" value="">` +
    `<input type="hidden" name="orderRef" value="">` +
    field("contactName", "Your name") +
    field("email", "Your email", "email") +
    field("phone", "Phone", "tel", { required: false, max: 40 }) +
    field("subject", "Email subject line", "text", {
      placeholder: "e.g. New move-in special near campus",
      max: 200,
    }) +
    field("instructions", "What should the email say?", "textarea", {
      max: 4000,
      rows: 6,
      placeholder:
        "Tell us about your property, the offer, and anything students should know.",
    }) +
    field("url", "Link for students to click", "url", {
      required: false,
      max: 1000,
      placeholder: "https://",
      hint: "Your listing, application, or website. Leave blank if you don’t have one yet.",
    }) +
    field("flyer", "Upload a flyer", "file", {
      required: false,
      accept: "image/png,image/jpeg,image/webp,application/pdf",
      hint: "PNG, JPEG, WebP, or PDF.",
    }) +
    field("wantsFlyerDesigned", "", "checkbox", {
      checkboxLabel: "Have AstroPro design the flyer for me instead",
    }),
});
emit(
  "partner-onboarding.html",
  "Partner campaign onboarding",
  "Tell AstroPro what you'd like your student campaign email to say.",
  hero(
    "Tell us about your campaign.",
    "A few details and you're set — our team handles the rest.",
    "",
    "Property & business partners",
  ) +
    `<section class="wrap"><p class="notice" data-order-summary hidden></p></section>` +
    `<section class="wrap form-layout"><div class="prose"><h2>Before you submit</h2><p>Complete payment on the <a href="property-partners.html">Property Partners page</a> first if you haven’t already. Use the same reference code so we can match your order to your payment.</p><ul class="submission-checks"><li>${icon("check")} Upload a flyer, or ask us to design one.</li><li>${icon("check")} Tell us exactly what the email should say.</li><li>${icon("check")} We’ll confirm timing by email before it goes out.</li></ul></div><div class="form-panel">${partnerCampaignForm}</div></section>`,
  { noindex: true },
);
emit(
  "admin.html",
  "Resource Center review inbox",
  "Private staff access to Student Resource Center requests.",
  hero(
    "Review inbox",
    "Staff access only. Use your private inbox access key. This page is not linked from public navigation.",
  ) +
    `<section class="wrap"><form id="adminLogin" class="school-search"><label for="adminToken">Private access key</label><input id="adminToken" type="password" required autocomplete="off" minlength="32"><button class="btn btn-primary">Open inbox</button></form><div id="adminMessage" role="status" aria-live="polite"></div><div id="adminInbox" hidden><div class="admin-controls"><button class="btn btn-primary" type="button" id="adminRefresh">Refresh</button><button class="btn btn-ghost" type="button" id="adminMore" hidden>Load older records</button><button class="btn btn-ghost" type="button" id="adminLogout">Lock inbox</button></div><div class="directory-controls admin-filters"><div><label for="adminView">View</label><select id="adminView"><option value="submissions">Requests</option><option value="preferences">Do-not-contact preferences</option></select></div><div><label for="adminStatus">Review status</label><select id="adminStatus"><option value="">All statuses</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></select></div><div><label for="adminType">Request type</label><select id="adminType"><option value="">All types</option><option value="listing">Resource submission</option><option value="mentee">Student mentoring interest</option><option value="mentor">Volunteer mentor interest</option><option value="data-request">Personal data request</option><option value="unsubscribe">Email preference request</option><option value="partner-campaign">Partner campaign order</option></select></div></div><p class="fineprint">Requests are private. Verify identity before fulfilling access, correction, or deletion requests. Follow-up is manual; this inbox does not send email. It locks after 15 minutes without activity.</p><div id="adminRecords"></div></div></section>`,
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
await cp("src/client/book-finder.js", "dist/assets/book-finder.js");
await cp("src/client/private-session.js", "dist/assets/private-session.js");
await cp("src/client/sublease.js", "dist/assets/sublease.js");
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
      page: `${m.file}#${x.id}`,
      description: `${m.place} · ${m.school}. ${x.summary || "Confirm eligibility, commute, and availability."}`,
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
  $("style,script:not([src]):not([type=\"application/ld+json\"])").remove();
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
    $("img[src]").each((_, img) => {
      const src = $(img).attr("src");
      if (src && !/^(https?:|data:)/.test(src))
        $(img).attr("src", canonicalRoot + src);
    });
    $('link[rel="icon"],link[rel="apple-touch-icon"]').each((_, link) => {
      const href = $(link).attr("href");
      if (href && !/^https?:/.test(href))
        $(link).attr("href", canonicalRoot + href);
    });
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
          `<url><loc>${canonicalRoot + (x.file === "index.html" ? "" : x.file)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`,
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
