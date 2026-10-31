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
];
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
  button: "Send for editorial review",
  fields:
    field("organization", "Organization name") +
    field("email", "Contact email", "email") +
    field("listingType", "Resource type", "text", {
      options: [
        "Scholarship",
        "Job or internship",
        "Student discount",
        "Housing property",
        "School partnership",
        "Other resource",
      ],
    }) +
    field("title", "Resource title") +
    field("description", "Description", "textarea", {
      max: 4000,
      placeholder: "Who is it for? Include eligibility, dates, and any cost.",
    }) +
    field("url", "Official application or information link", "url", {
      max: 1000,
    }),
});
const home = `<section class="home-hero"><div class="wrap hero-grid"><div><p class="eyebrow">A clearer path through college</p><h1>Everything college throws at you, in one place.</h1><p class="lede">Find funding, your next opportunity, and the support that makes college work. Start with what you need today.</p><div class="cta-row"><a class="btn btn-primary" href="scholarships.html">Find scholarships</a><a class="btn btn-ghost" href="index.html#resources">Explore all resources</a></div><p class="hero-note">Free to browse. No account required.</p></div><aside class="hero-aside" aria-label="Where to start"><h2>What’s your next step?</h2><a class="next-link" href="apply-to-college.html"><span aria-hidden="true">01</span><span><strong>I’m applying to college</strong><small>Applications, timelines, and financial aid</small></span></a><a class="next-link" href="internships.html"><span aria-hidden="true">02</span><span><strong>I’m looking for experience</strong><small>Student programs and career guidance</small></span></a><a class="next-link" href="housing.html"><span aria-hidden="true">03</span><span><strong>I need a place to live</strong><small>Campus markets and housing search tools</small></span></a><a class="next-link" href="school-resources.html"><span aria-hidden="true">04</span><span><strong>I could use some support</strong><small>Find help through your own school</small></span></a></aside></div></section><section class="wrap" aria-label="Directory overview"><div class="stats-strip"><div><strong>${scholarships.length}</strong><span>scholarships listed</span></div><div><strong>${internships.length}</strong><span>student career programs</span></div><div><strong>${discounts.length}</strong><span>discount resources</span></div><div><strong>${markets.length}</strong><span>campus housing markets</span></div></div></section><section id="resources"><div class="wrap"><div class="section-head"><p class="eyebrow">Your resource center</p><h2>Find something that moves you forward.</h2><p>Browse a category and save useful resources on this device. Applications go directly to the organization that runs each opportunity.</p></div><div class="resource-grid">${resourceTypes.map(([slug, tag, title, description]) => `<article class="resource-card"><p class="tag">${tag}</p><h3>${title}</h3><p>${description}</p><a class="link" href="${slug}.html">Explore ${title.toLowerCase()} →</a></article>`).join("")}</div></div></section><section id="mission"><div class="wrap form-layout"><div class="section-head"><p class="eyebrow">Our mission</p><h2>The place we wish we’d had when we were starting college.</h2><p>College comes with a lot to figure out. We bring useful starting points together so finding a scholarship, a career program, or campus support takes less searching.</p><p>Our directory is editorial, free to browse, and independent of the organizations linked here. We don’t submit applications or guarantee awards, jobs, housing, or mentor matches.</p><a class="link" href="about.html">How we select and review resources →</a></div><div class="callout"><h2>Build your own shortlist.</h2><p>Save resources while you browse, then come back to compare them. Your saved list stays in this browser.</p><a class="btn btn-primary" href="saved.html">Open saved resources</a></div></div></section><section id="organizations"><div class="wrap form-layout"><div class="section-head"><p class="eyebrow">For organizations</p><h2>Have something useful for students?</h2><p>Submit an official scholarship, student program, discount, or property website for review. A submission is a request for editorial consideration, not a paid placement or guaranteed listing.</p><p>We store your request so the team can review it and contact you. We don’t share a student mailing list or enroll visitors in marketing.</p><p class="fineprint">Schools can use this form to propose a partnership. Property owners should include the official property website, campus served, and any eligibility restrictions.</p></div><div class="form-panel">${listingForm}</div></div></section><section id="schools"><div class="wrap"><div class="callout"><p class="eyebrow">For schools</p><h2>Help students find the support already around them.</h2><p>Suggest official campus services or talk with us about keeping your school’s resources represented accurately.</p><a class="btn btn-primary" href="index.html#organizations">Suggest a school partnership</a></div></div></section>`;
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
    title: "Find funding for your next chapter.",
    description:
      "Scholarships for different backgrounds, interests, and stages of education. Compare the requirements, then apply directly with the sponsor.",
    items: scholarships,
    type: "scholarships",
  }),
);
emit(
  "internships.html",
  "Jobs & internships",
  "Browse student internship and early-career programs, search by field, and check current openings on employer websites.",
  directory({
    title: "Experience starts somewhere.",
    description:
      "Explore student internship and early-career programs by company, field, or keyword. Each employer sets its own requirements and application windows.",
    items: internships,
    type: "internships",
  }),
);
emit(
  "discounts.html",
  "Student discounts",
  "Find student discount and verification resources with links to current eligibility, offer, and renewal details.",
  directory({
    title: "Make your student budget go further.",
    description:
      "Software, learning tools, everyday essentials, and student offers. Check the provider’s current price, verification rules, and renewal terms.",
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
      `Housing research near ${m.school}. Check the exact campus, address, eligibility, and current availability before making plans.`,
      "",
      "Off-campus housing",
    ) +
    `<section class="wrap"><p class="notice">${e(m.description)} Directory entries are not ranked or confirmed available. We’ve removed inherited review scores and unsourced distance claims. Verify the commute to your specific campus.</p><div class="property-grid">${m.properties.map((p) => `<article class="property-card"><div class="card-heading"><p class="tag">Property research</p>${saveButton({ ...p, name: p.name })}</div><h2>${e(p.name)}</h2>${p.address ? `<p>${e(p.address)}</p>` : ""}<p>${e(p.summary || "Confirm the property identity, rental eligibility, current floor plans, and availability directly before applying.")}</p><div class="cta-row">${p.website ? external(p.website, "Official property site", "btn btn-primary") : external(p.maps, "Find property on Maps", "btn btn-primary")}${p.floorplans ? external(p.floorplans, "Current floor plans", "btn btn-ghost") : p.website ? external(p.maps, "Map lookup", "btn btn-ghost") : ""}</div><p class="review-date">${p.verifiedAt ? "Official source reviewed " + dateLabel(p.verifiedAt) + ". Current price and availability not verified." : "Official website and current availability have not been independently verified. Maps is a search lookup."}</p></article>`).join("")}</div></section>` +
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
  emit(slug + ".html", metadata.title, metadata.description, body);
}
const mentorshipBody =
  hero(
    "People who can help you find your direction.",
    "Start with an established mentorship program, or register your interest in the AstroPro network. Our own matching is handled by people as suitable mentors become available.",
  ) +
  `<section class="wrap"><div class="section-head"><h2>Find a mentor today</h2><p>These services operate independently of AstroPro. Check their eligibility, availability, and fees.</p></div><div class="tool-grid"><article class="tool-card"><p class="tag">Campus first</p><h3>Your school’s alumni network</h3><p>Career services and alumni relations often run mentoring programs for current students.</p><a class="link" href="school-resources.html?topic=alumni%20mentorship">Find your school’s program →</a></article><article class="tool-card"><p class="tag">Free</p><h3>ADPList</h3><p>Mentoring across design, technology, product, and related careers. Check individual mentor availability.</p>${external("https://adplist.org/", "Explore ADPList")}</article><article class="tool-card"><p class="tag">Professional network</p><h3>LinkedIn alumni tools</h3><p>Find your school’s alumni and reach out with a specific, respectful request for a career conversation.</p>${external("https://www.linkedin.com/", "Visit LinkedIn")}</article><article class="tool-card"><p class="tag">Paid</p><h3>MentorCruise</h3><p>Ongoing mentoring with independent professionals. Review pricing and each mentor’s terms before booking.</p>${external("https://mentorcruise.com/", "Explore MentorCruise")}</article></div></section><section class="wrap"><div class="section-head"><h2>Register your interest</h2><p>These requests reach our review inbox. A request does not guarantee a match or a response time. No mentoring relationship begins until both people agree.</p></div><div class="two-col"><div class="path-card"><h2>I’m looking for a mentor</h2><p class="desc">Tell us where you’re headed.</p>${form({ type: "mentee", button: "Register student interest", fields: field("name", "Your name") + field("email", "Your email", "email") + field("field", "Field or industry") + field("graduationYear", "Graduation year", "text", { required: false, max: 4 }) })}</div><div class="path-card"><h2>I’d like to mentor a student</h2><p class="desc">Share your field and availability.</p>${form({ type: "mentor", button: "Register mentor interest", fields: field("name", "Your name") + field("email", "Your email", "email") + field("field", "Your professional field") + field("availability", "Availability", "text", { options: ["30 minutes per month", "One hour per month", "A few hours per semester"] }) })}</div></div></section>`;
emit(
  "mentorship.html",
  "Mentorship",
  "Find independent mentoring options or register interest in AstroPro’s growing student and professional mentorship network.",
  mentorshipBody,
);
emit(
  "saved.html",
  "Saved resources",
  "Your shortlist of scholarships, career programs, discounts, and housing research saved in this browser.",
  hero(
    "Your next steps, saved.",
    "Keep useful resources together while you decide what to do next. This list is stored only in this browser on this device.",
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
    "Find the campus offices and free resources you may already have access to. Enter your school and the kind of help you need.",
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
