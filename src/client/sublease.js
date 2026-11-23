// Sublease War Room client. One module drives all four pages.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (n) => "$" + Number(n).toLocaleString("en-US");
const dateText = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const api = async (path, options = {}) => {
  const res = await fetch("/api/sublease" + path, {
    ...options,
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
};
const say = (el, text, ok = false) => {
  if (!el) return;
  el.textContent = text;
  el.hidden = !text;
  el.className = "sl-msg " + (ok ? "ok" : "bad");
};
const typeLabel = { sublease: "Sublease", relet: "Relet", assignment: "Lease takeover" };
const bedText = (l) => (l.bedrooms === 0 ? "Studio" : l.bedrooms + " bd") + " · " + l.bathrooms + " ba";
const cardHtml = (l) =>
  `<a class="sl-card" href="sublease-listing.html?id=${esc(l.id)}"><img loading="lazy" alt="" src="/api/sublease/photo/${esc(l.id)}/0" width="400" height="280"><div class="sl-card-body"><span class="sl-tag">${esc(typeLabel[l.type])}</span><h3>${esc(l.title)}</h3><p class="sl-price">${money(l.rent)}<small>/mo</small></p><p>${esc(l.area)} · ${esc(bedText(l))}</p><p class="sl-dates">${dateText(l.startDate)} – ${dateText(l.endDate)}</p></div></a>`;

// ---------- Photo handling ----------
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1100 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  for (const q of [0.78, 0.68, 0.58, 0.48, 0.38]) {
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= 440000) return url;
  }
  throw new Error("One of your photos is too large. Try a smaller one.");
}

// ---------- Page: start a listing ----------
function startPage() {
  const form = $("#slForm");
  if (!form) return;
  const msg = $("#slFormMsg"),
    previews = $("#slPreviews"),
    photoInput = $("#slPhotos");
  let photos = [];
  const today = new Date().toISOString().slice(0, 10);
  $("#slStart").min = today;
  $("#slEnd").min = today;
  const permission = $("#slPermission");
  const permNote = $("#slPermNote");
  const permHelp = {
    approved: "",
    pending: "Good. Keep the landlord's answer in writing. Your dashboard has an email you can send.",
    "not-asked": "No problem. After you submit, your dashboard gives you a ready-to-send email asking the landlord for permission.",
    "not-allowed": "If your lease bans subleasing, ask about a relet or lease-break program first. We can't list a place the lease doesn't allow.",
  };
  permission.addEventListener("change", () => {
    permNote.textContent = permHelp[permission.value] || "";
    permNote.hidden = !permNote.textContent;
  });
  photoInput.addEventListener("change", async () => {
    say(msg, "");
    try {
      const files = [...photoInput.files].slice(0, 4);
      photos = [];
      for (const f of files) photos.push(await shrink(f));
      previews.innerHTML = photos.map((p, i) => `<img alt="Photo ${i + 1} preview" src="${p}" width="120" height="84">`).join("");
    } catch (e) {
      say(msg, e.message);
      photoInput.value = "";
      photos = [];
      previews.innerHTML = "";
    }
  });
  // Pay first: the PayPal button carries a one-time pay code; the form opens once the server has confirmed that payment.
  const gate = $("#slPayGate"),
    wrap = $("#slFormWrap"),
    payMsg = $("#slPayMsg"),
    payBtn = $("[data-sl-pay]");
  const CODE_KEY = "astropro.sublease.paycode";
  const newCode = () => [...crypto.getRandomValues(new Uint8Array(12))].map((x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]).join("");
  let payCode = "";
  try {
    payCode = localStorage.getItem(CODE_KEY) || "";
  } catch {}
  if (!/^[a-z0-9]{12}$/.test(payCode)) {
    payCode = newCode();
    try {
      localStorage.setItem(CODE_KEY, payCode);
    } catch {}
  }
  const buildPayUrl = () => {
    const url = new URL("https://www.paypal.com/cgi-bin/webscr");
    url.searchParams.set("cmd", "_xclick");
    url.searchParams.set("business", payBtn.dataset.business);
    url.searchParams.set("item_name", "Sublease War Room onboarding fee");
    url.searchParams.set("item_number", payCode);
    url.searchParams.set("amount", Number(payBtn.dataset.price).toFixed(2));
    url.searchParams.set("currency_code", "USD");
    url.searchParams.set("no_shipping", "1");
    url.searchParams.set("notify_url", location.origin + "/api/sublease/paypal-ipn");
    url.searchParams.set("return", location.origin + "/sublease-war-room.html?paid=1#start");
    url.searchParams.set("cancel_return", location.origin + "/sublease-war-room.html#start");
    return url.href;
  };
  payBtn.href = buildPayUrl();
  const openForm = () => {
    gate.hidden = true;
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const creditStatus = async () => {
    try {
      return await api("/credit/" + payCode);
    } catch {
      return { paid: false, used: false };
    }
  };
  (async () => {
    // Coming back from PayPal: open the form right away. Confirmation can take a minute, so it never makes them wait.
    if (/[?&]paid=1/.test(location.search)) return openForm();
    const st = await creditStatus();
    if (st.paid && !st.used) return openForm();
    if (st.used) {
      payCode = newCode();
      try {
        localStorage.setItem(CODE_KEY, payCode);
      } catch {}
      payBtn.href = buildPayUrl();
    }
  })();
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    say(msg, "");
    const fd = Object.fromEntries(new FormData(form));
    const opt = $("#slMarket").selectedOptions[0];
    let market = fd.market,
      marketName = opt && opt.value ? opt.textContent : "";
    if (fd.market === "__new") {
      marketName = ($("#slNewSchool").value || "").trim().replace(/\s+/g, " ");
      const slug = marketName.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
      if (marketName.length < 3 || slug.length < 2) {
        say(msg, "Tell us your school and city so we can add it.");
        return;
      }
      market = "c-" + slug;
    }
    const body = {
      ...fd,
      market,
      marketName,
      photos,
      payCode,
      consent: $("#slConsent").checked,
    };
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      const out = await api("/listings", { method: "POST", body: JSON.stringify(body) });
      const link = `sublease-manage.html#${out.id}.${out.manageToken}`;
      try {
        localStorage.setItem("astropro.sublease." + out.id, out.manageToken);
      } catch {}
      showSuccess(out.id, link, out.live);
    } catch (e) {
      say(msg, e.message);
      btn.disabled = false;
    }
  });
  function showSuccess(id, link, live) {
    const box = $("#slSuccess");
    $("[data-sl-live]").hidden = !live;
    $("[data-sl-confirming]").hidden = !!live;
    $("[data-sl-ref]").textContent = id;
    $("[data-sl-manage]").href = link;
    $("[data-sl-manage-url]").value = new URL(link, location.href).href;
    try {
      localStorage.removeItem(CODE_KEY);
    } catch {}
    wrap.hidden = false;
    form.hidden = true;
    wrap.querySelector("h2").hidden = true;
    wrap.querySelector("h2 + p").hidden = true;
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("[data-sl-copy-link]")?.addEventListener("click", async () => {
    const input = $("[data-sl-manage-url]");
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
    }
    $("[data-sl-copy-link]").textContent = "Copied";
  });
}

// ---------- Page: browse ----------
async function browsePage() {
  const root = $("#slBrowse");
  if (!root) return;
  const select = $("#slFilter"),
    out = $("#slResults"),
    count = $("#slCount");
  const load = async () => {
    out.innerHTML = "";
    count.textContent = "Loading…";
    try {
      const { items } = await api("/listings" + (select.value ? "?market=" + encodeURIComponent(select.value) : ""));
      count.textContent = items.length ? items.length + " place" + (items.length === 1 ? "" : "s") + " available" : "";
      out.innerHTML = items.length
        ? items.map(cardHtml).join("")
        : `<div class="empty-state"><h2>No listings here yet.</h2><p>Be the first, or check back soon. Students post new places every week.</p><p><a class="btn btn-primary" href="sublease-war-room.html">List your place</a></p></div>`;
    } catch (e) {
      count.textContent = e.message;
    }
  };
  select.addEventListener("change", load);
  const want = new URLSearchParams(location.search).get("market");
  if (want) select.value = want;
  load();
}

// ---------- Page: one listing ----------
async function listingPage() {
  const root = $("#slListing");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id") || "";
  const view = $("#slView"),
    msg = $("#slLeadMsg"),
    form = $("#slLead");
  try {
    const { listing: l } = await api("/listings/" + encodeURIComponent(id));
    document.title = l.title + " — Sublease War Room";
    const photos = Array.from({ length: l.photos }, (_, i) => `<img alt="${esc(l.title)} photo ${i + 1}" src="/api/sublease/photo/${esc(l.id)}/${i}" loading="${i ? "lazy" : "eager"}">`).join("");
    view.innerHTML = `<div class="sl-gallery">${photos}</div><div class="sl-head"><span class="sl-tag">${esc(typeLabel[l.type])}</span>${l.status === "filled" ? '<span class="sl-tag sl-filled">Filled</span>' : ""}<h2 class="sl-title">${esc(l.title)}</h2><p class="sl-price">${money(l.rent)}<small>/mo</small></p></div><dl class="sl-facts"><div><dt>Where</dt><dd>${esc(l.area)}, ${esc(l.marketName)}</dd></div><div><dt>Near</dt><dd>${esc(l.school || l.marketName)}</dd></div><div><dt>Dates</dt><dd>${dateText(l.startDate)} – ${dateText(l.endDate)}</dd></div><div><dt>Size</dt><dd>${esc(bedText(l))}</dd></div><div><dt>Furnished</dt><dd>${esc({ yes: "Yes", no: "No", partly: "Partly" }[l.furnished])}</dd></div><div><dt>Utilities</dt><dd>${esc({ yes: "Included", no: "Not included", some: "Some included" }[l.utilities])}</dd></div>${l.deposit ? `<div><dt>Deposit</dt><dd>${money(l.deposit)}</dd></div>` : ""}<div><dt>Landlord OK</dt><dd>${esc({ approved: "Approved in writing", pending: "Requested", "not-asked": "Being requested" }[l.permission] || "")}</dd></div></dl><div class="prose"><h2>About this place</h2><p>${esc(l.description).replace(/\n/g, "<br>")}</p></div>`;
    if (l.status === "filled") form.hidden = true;
    form.dataset.listing = l.id;
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><h2>This listing isn't available.</h2><p>${esc(e.message)}</p><p><a class="btn btn-primary" href="sublease-listings.html">Browse other places</a></p></div>`;
    form.hidden = true;
  }
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    say(msg, "");
    const body = { ...Object.fromEntries(new FormData(form)), listingId: form.dataset.listing };
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      await api("/leads", { method: "POST", body: JSON.stringify(body) });
      form.reset();
      say(msg, "Sent. The student will get your message in their dashboard and reply to you.", true);
    } catch (e) {
      say(msg, e.message);
    }
    btn.disabled = false;
  });
}

// ---------- Page: owner dashboard (War Room) ----------
// Where to post: free platforms, verified against each site's own pages. Rules and fees change, so we say so.
const platforms = (l, groupUrl) => [
  { id: "fbgroup", name: "Your market's Facebook group", tag: "Free · Best for students", url: groupUrl, why: "This is where most students look for subleases. Join the group, then post.", steps: ["Open the group and tap Join if you haven't.", "Tap Write something, paste the Facebook post from your launch kit, and add your photos.", "Add your listing link so students can see all the details."], copy: "fb" },
  { id: "school", name: "Your school's off-campus housing board", tag: "Free · Students only", url: "https://www.google.com/search?q=" + encodeURIComponent((l.school || l.marketName) + " off campus housing post a sublet"), why: "Many schools run a free sublet board that only students and staff can use, which means fewer scams.", steps: ["Open the search result for your school's off-campus housing site.", "Sign in with your school account and choose Add a Listing or Post a Sublet.", "Paste the listing text and upload your photos."], copy: "long" },
  { id: "marketplace", name: "Facebook Marketplace", tag: "Free · Huge reach", url: "https://www.facebook.com/marketplace/create/rental", why: "Free and local, with direct messaging. Choose Home for Rent.", steps: ["Choose Home for Rent and fill in the price, dates and bedrooms.", "Paste the listing text and add photos.", "Publish, then watch your messages for scams."], copy: "long" },
  { id: "craigslist", name: "Craigslist", tag: "Free · Create a free account", url: "https://accounts.craigslist.org/login", why: "Free to post. Use the housing section's sublets & temporary category for your city.", steps: ["Make a free account so you can repost later.", "Choose your city, then housing, then sublets & temporary.", "Paste the listing text, add photos and a general location (no unit number)."], copy: "long" },
  { id: "zillow", name: "Zillow, Trulia and HotPads", tag: "Free for a first listing · Needs landlord OK", url: "https://www.zillow.com/rental-manager/post-a-listing/", why: "One Zillow Rental Manager listing also shows on Trulia and HotPads. Check Zillow's current rules and fees first, and only post if your landlord has approved a sublease.", steps: ["Create a free Zillow Rental Manager account.", "Create a listing, paste the text and add photos.", "Publish, and reply to renters through Zillow."], copy: "long" },
  { id: "zumper", name: "Zumper and PadMapper", tag: "Free for one listing", url: "https://www.zumper.com/", why: "Zumper lists for free and can share to Facebook Marketplace. Look for Post a rental or List a property.", steps: ["Create a free account.", "Choose List a property and paste your listing text.", "Add photos and publish."], copy: "long" },
  { id: "sublet", name: "Sublet.com and LeaseBreak", tag: "Free · Built for subleases", url: "https://www.sublet.com/", why: "Sites made for subleases and lease transfers. LeaseBreak is at leasebreak.com.", steps: ["Create an account on Sublet.com.", "Add your listing with the dates and rent.", "Repeat on LeaseBreak if you want more reach."], copy: "long" },
  { id: "reddit", name: "Reddit and campus groups", tag: "Free · Check each group's rules", url: "https://www.reddit.com/subreddits/search?q=" + encodeURIComponent(l.school || l.marketName), why: "Many campus and city subreddits have housing threads. Also try GroupMe, Discord and your school's housing Instagram.", steps: ["Find your school or city subreddit and read its housing rules.", "Paste the Reddit post from your launch kit where it's allowed.", "Share your listing link in student group chats."], copy: "reddit" },
];
const loadDone = (id) => {
  try {
    return JSON.parse(localStorage.getItem("astropro.sublease.done." + id) || "[]");
  } catch {
    return [];
  }
};
const saveDone = (id, list) => {
  try {
    localStorage.setItem("astropro.sublease.done." + id, JSON.stringify(list));
  } catch {}
};
const kit = (l, groupUrl) => {
  const bed = l.bedrooms === 0 ? "studio" : l.bedrooms + "-bedroom";
  const util = { yes: "utilities included", no: "utilities not included", some: "some utilities included" }[l.utilities];
  const furn = { yes: "furnished", no: "unfurnished", partly: "partly furnished" }[l.furnished];
  const url = location.origin + "/sublease-listing.html?id=" + l.id;
  const dates = dateText(l.startDate) + " to " + dateText(l.endDate);
  const verb = { sublease: "SUBLEASE", relet: "RELET", assignment: "LEASE TAKEOVER" }[l.type];
  const fb = `${verb}: ${bed} near ${l.school || l.marketName}, ${money(l.rent)}/mo\n\n📍 ${l.area}\n📅 ${dates}\n🛏 ${bed}, ${l.bathrooms} bath, ${furn}, ${util}\n${l.deposit ? "💵 Deposit: " + money(l.deposit) + "\n" : ""}\n${l.description}\n\nPhotos and details: ${url}\nMessage me here or use the form on the listing.`;
  const reddit = `[${verb}] ${bed} in ${l.area}, ${money(l.rent)}/mo (${dates})\n\n${l.description}\n\nDetails and photos: ${url}`;
  const landlord = `Subject: Request to ${l.type === "relet" ? "relet" : l.type === "assignment" ? "assign" : "sublease"} my unit at ${l.area}\n\nHello,\n\nI'm a current tenant at ${l.area} and I need to leave early. I'd like to ask what options I have to ${l.type === "relet" ? "relet the unit" : l.type === "assignment" ? "assign my lease" : "sublease the unit"} for ${dates}.\n\nCould you please tell me:\n1. Whether this is allowed under my lease, and what approval you need in writing.\n2. What screening the new tenant must pass, and any fees.\n3. Whether I stay responsible on the lease, or can be released.\n4. How the security deposit would be handled.\n\nI'll find a qualified tenant and send you their application. Thank you for your help.\n\nBest,\n${l.ownerName || "[Your name]"}`;
  const reply = `Hi! Thanks for your interest in the ${bed} at ${l.area}. It's available ${dates} for ${money(l.rent)}/mo. I'd love to set up a tour in person or by live video. What days work for you? I'll also need to share your application with the landlord for approval.`;
  const days = [
    "Day 1: Post your listing in your market's Facebook group. Copy the post below and paste it.",
    "Day 2: Share your listing link with friends, roommates and your school's housing or roommate pages.",
    "Day 3: Post on Reddit (campus and city subreddits that allow housing posts).",
    "Day 4: Reply to every message within a few hours. Offer two tour times.",
    "Day 5: Refresh your Facebook post with a new photo and 'still available'.",
    "Day 6–7: Follow up with everyone who asked questions but hasn't booked a tour.",
    "Day 8: Lower the price slightly or add a move-in perk if you have no tours yet.",
    "Day 10: Repost everywhere. Ask your landlord whether they have a relet list.",
    "Day 14: Review what's working. Add new photos, then repost.",
  ];
  const long = `${l.title}\n\n${typeLabel[l.type]}: ${bed} near ${l.school || l.marketName}, ${money(l.rent)}/mo\nArea: ${l.area}\nDates: ${dates}\nBedrooms/baths: ${bed}, ${l.bathrooms} bath\nFurnished: ${furn}; ${util}\n${l.deposit ? "Deposit: " + money(l.deposit) + "\n" : ""}\n${l.description}\n\nMore photos and details: ${url}`;
  return { fb, reddit, landlord, reply, days, groupUrl, long, title: l.title, url };
};
async function managePage() {
  const root = $("#slManage");
  if (!root) return;
  const [id, token] = (location.hash.slice(1) || "").split(".");
  const dash = $("#slDash");
  let saved = token;
  if (!saved && id) {
    try {
      saved = localStorage.getItem("astropro.sublease." + id);
    } catch {}
  }
  if (!id || !saved) {
    dash.innerHTML = `<div class="empty-state"><h2>Open your private dashboard link.</h2><p>Use the link you saved when you created your listing. It contains your private key.</p><p><a class="btn btn-primary" href="sublease-war-room.html">Start a listing</a></p></div>`;
    return;
  }
  const groups = JSON.parse(root.dataset.groups || "{}");
  const payBase = { business: root.dataset.business, price: root.dataset.price };
  const headers = { "x-manage-token": saved };
  const render = async () => {
    let data;
    try {
      data = await api("/manage/" + id, { headers });
    } catch (e) {
      dash.innerHTML = `<div class="empty-state"><h2>We couldn't open that dashboard.</h2><p>${esc(e.message)}</p></div>`;
      return;
    }
    const l = data.listing;
    l.ownerName = data.ownerName || "";
    const k = kit(l, groups[l.market]);
    const plats = platforms(l, k.groupUrl).filter((p) => p.id !== "fbgroup" || p.url);
    const done = loadDone(id).filter((x) => plats.some((p) => p.id === x));
    const live = l.status === "live";
    const paid = !!data.paidAt;
    const pending = !paid && ["pending_payment", "expired"].includes(l.status);
    const until = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const steps = [
      ["Landlord permission", l.permission === "approved" ? "done" : "todo", l.permission === "approved" ? "Approved in writing." : "Send the email below and get approval in writing before you accept anyone."],
      ["Listing created", "done", "Your listing is built with photos and details."],
      ["Listing live", live ? "done" : "todo", live ? "Live until " + until + "." : l.status === "expired" ? "Expired. Pay the listing fee to bring it back." : l.status === "pending_payment" ? "Not live yet. Pay the listing fee to publish it." : "Status: " + l.status + "."],
      ["Get messages", data.leads.length ? "done" : "todo", data.leads.length ? data.leads.length + " message" + (data.leads.length === 1 ? "" : "s") + " so far." : "Post your listing using the launch kit below."],
      ["Tours and applications", "todo", "Show the place in person or on live video. Never take money before you've seen proof of identity and the landlord has approved."],
      ["Sign the agreement", "todo", "Use a written sublease or the landlord's own form. See the guide for what to include."],
      ["Hand over the keys", "todo", "Record move-in photos with the new tenant and send them to the landlord."],
    ];
    const payUrl = new URL("https://www.paypal.com/cgi-bin/webscr");
    payUrl.searchParams.set("cmd", "_xclick");
    payUrl.searchParams.set("business", payBase.business);
    payUrl.searchParams.set("item_name", "Sublease War Room listing — " + l.marketName);
    payUrl.searchParams.set("item_number", l.id);
    payUrl.searchParams.set("amount", Number(payBase.price).toFixed(2));
    payUrl.searchParams.set("currency_code", "USD");
    payUrl.searchParams.set("no_shipping", "1");
    payUrl.searchParams.set("notify_url", location.origin + "/api/sublease/paypal-ipn");
    payUrl.searchParams.set("return", location.origin + "/sublease-manage.html#" + id + "." + saved);
    const copy = (key, label, text) =>
      `<div class="sl-kit"><div class="sl-kit-head"><h3>${esc(label)}</h3><button class="btn btn-ghost" type="button" data-copy="${key}">Copy</button></div><pre>${esc(text)}</pre></div>`;
    dash.innerHTML = `
      <div class="sl-status ${esc(l.status)}"><div><strong>${esc(l.title)}</strong><span>${esc(l.marketName)} · ${money(l.rent)}/mo</span></div><span class="sl-pill">${esc({ pending_payment: "Waiting for payment", live: "Live", paused: "Paused", filled: "Filled", expired: "Expired" }[l.status])}</span></div>
      ${pending ? `<div class="callout"><h2>${l.status === "expired" ? "Bring your listing back" : "Publish your listing"}</h2><p>${l.status === "expired" ? "Your listing ended." : "Your listing is saved but not live yet."} Pay the one-time listing fee and it goes live for 60 days. It updates automatically within a minute or two of your payment. Your reference code is <code>${esc(l.id)}</code>.</p><p><a class="btn btn-primary" href="${payUrl.href}" rel="noopener">Pay $${esc(payBase.price)} with PayPal</a></p><p class="fineprint">Questions? Email <a href="mailto:leasesolutions3@gmail.com">leasesolutions3@gmail.com</a> with your reference code.</p></div>` : ""}
      <section><h2>Your sublease checklist</h2><ol class="sl-steps">${steps.map(([t, s, d]) => `<li class="${s}"><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join("")}</ol></section>
      <section><h2>Messages from students (${data.leads.length})</h2>${data.leads.length ? data.leads.map((x) => `<article class="sl-lead${x.flagged ? " flagged" : ""}"><header><strong>${esc(x.name)}</strong><time>${new Date(x.created_at).toLocaleString()}</time></header>${x.flagged ? '<p class="sl-warn">Careful: this message uses wording common in rental scams. Don\'t send money or keys, and meet in person first.</p>' : ""}<p>${esc(x.message).replace(/\n/g, "<br>")}</p><p><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? " · " + esc(x.phone) : ""}</p></article>`).join("") : "<p>No messages yet. Use the launch kit below to get your first ones.</p>"}</section>
      <section><h2>Post it everywhere</h2><p>More places means more messages. Each one is free to start. Tap a site, paste the text we wrote, add your photos, then check it off. Sites can change their rules and fees, and only post if your landlord has approved.</p>
        <div class="sl-progress"><div class="sl-bar"><span style="width:${Math.round((done.length / plats.length) * 100)}%"></span></div><p>${done.length} of ${plats.length} places posted</p></div>
        <div class="sl-photos"><p><strong>Your photos</strong> (save them to upload elsewhere):</p>${Array.from({ length: l.photos }, (_, i) => `<a href="/api/sublease/photo/${esc(l.id)}/${i}" download="listing-photo-${i + 1}.jpg"><img alt="Photo ${i + 1}" src="/api/sublease/photo/${esc(l.id)}/${i}" width="96" height="72"><span>Save</span></a>`).join("")}</div>
        <div class="sl-plats">${plats.map((p) => `<article class="sl-plat${done.includes(p.id) ? " done" : ""}"><header><div><h3>${esc(p.name)}</h3><span class="sl-tag">${esc(p.tag)}</span></div><label class="sl-check"><input type="checkbox" data-done="${p.id}"${done.includes(p.id) ? " checked" : ""}> Posted</label></header><p>${esc(p.why)}</p><ol>${p.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><p class="sl-plat-actions"><button class="btn btn-ghost" type="button" data-copy="${p.copy}">Copy the text</button>${p.url ? `<a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener">Open ${esc(p.name.split(" ")[0] === "Your" ? "it" : p.name.split(" ")[0])} ↗</a>` : ""}</p></article>`).join("")}</div>
      </section>
      <section><h2>Share your listing</h2><p>Send this link to friends, roommates and group chats:</p><div class="sl-share"><input readonly aria-label="Your public listing link" value="${esc(k.url)}"><button class="btn btn-ghost" type="button" data-copy="url">Copy link</button></div><p class="fineprint">${data.views || 0} view${data.views === 1 ? "" : "s"} of your public page so far.</p></section>
      <section><h2>Launch kit</h2><p>Your posts and message templates, written from your listing.</p>
        ${copy("fb", "Facebook group post", k.fb)}${copy("reddit", "Reddit post", k.reddit)}${copy("landlord", "Email to your landlord", k.landlord)}${copy("reply", "Reply to new messages", k.reply)}
        <div class="sl-kit"><h3>Your next 14 days</h3><ul class="sl-days">${k.days.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
      </section>
      <section class="sl-actions"><h2>Manage your listing</h2>
        <p><a class="btn btn-ghost" href="sublease-listing.html?id=${esc(l.id)}">View public page</a>
        ${live ? '<button class="btn btn-ghost" data-status="paused" type="button">Pause listing</button>' : ""}
        ${l.status === "paused" ? '<button class="btn btn-ghost" data-status="live" type="button">Turn back on</button>' : ""}
        ${["live", "paused"].includes(l.status) ? '<button class="btn btn-primary" data-status="filled" type="button">Mark as filled</button>' : ""}<button class="btn btn-ghost sl-danger" data-delete type="button">Delete listing</button></p><p class="sl-msg" id="slActMsg" hidden></p></section>`;
    $$("[data-copy]", dash).forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(k[b.dataset.copy]);
          b.textContent = "Copied";
        } catch {
          b.textContent = "Select and copy";
        }
      }),
    );
    $$("[data-done]", dash).forEach((b) =>
      b.addEventListener("change", () => {
        const set = new Set(loadDone(id));
        b.checked ? set.add(b.dataset.done) : set.delete(b.dataset.done);
        saveDone(id, [...set]);
        render();
      }),
    );
    $("[data-delete]", dash)?.addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      if (!b.dataset.sure) {
        b.dataset.sure = "1";
        b.textContent = "Click again to delete forever";
        return;
      }
      try {
        await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "delete" }) });
        try {
          localStorage.removeItem("astropro.sublease." + id);
        } catch {}
        dash.innerHTML = `<div class="empty-state"><h2>Your listing was deleted.</h2><p>It's gone from the site, along with its photos and messages.</p><p><a class="btn btn-primary" href="sublease-war-room.html">Start a new listing</a></p></div>`;
      } catch (e) {
        say($("#slActMsg"), e.message);
      }
    });
    $$("[data-status]", dash).forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ status: b.dataset.status }) });
          render();
        } catch (e) {
          say($("#slActMsg"), e.message);
        }
      }),
    );
  };
  render();
}
// ---------- Market pages: student posts inside "Available Rentals" ----------
async function marketFeed() {
  const box = $("[data-sl-market]");
  if (!box) return;
  try {
    const { items } = await api("/listings?market=" + encodeURIComponent(box.dataset.slMarket));
    if (!items.length) return;
    box.innerHTML = items
      .map(
        (l) =>
          `<article class="rental-card sl-student-post"><div class="rental-visual"><img loading="lazy" decoding="async" alt="${esc(l.title)}" src="/api/sublease/photo/${esc(l.id)}/0"><span class="rental-badge">${esc(typeLabel[l.type])}</span></div><div class="rental-body"><div class="card-heading"><h3>${esc(l.title)}</h3></div><p class="rental-meta">${esc(l.area)} · ${esc(bedText(l))} · ${dateText(l.startDate)} – ${dateText(l.endDate)}</p><p><strong>${money(l.rent)}/mo</strong>${l.utilities === "yes" ? ", utilities included" : ""}${l.furnished === "yes" ? ", furnished" : ""}</p><div class="cta-row"><a class="btn btn-primary" href="sublease-listing.html?id=${esc(l.id)}">View and message</a></div><p class="review-date">Posted by a student. Confirm landlord approval and see the place before you pay anyone.</p></div></article>`,
      )
      .join("");
    box.hidden = false;
    $("[data-sl-empty]")?.setAttribute("hidden", "");
  } catch {}
}
// Add student-created markets to the dropdowns, and reveal the "school is not listed" box.
{
  const form = $("#slMarket"),
    filter = $("#slFilter");
  const wrap = $("#slNewWrap");
  if (form && wrap) form.addEventListener("change", () => (wrap.hidden = form.value !== "__new"));
  if (form || filter) {
    fetch("/api/sublease/markets")
      .then((r) => r.json())
      .then(({ items }) => {
        for (const m of items || []) {
          for (const sel of [form, filter]) {
            if (!sel || [...sel.options].some((o) => o.value === m.id)) continue;
            const o = document.createElement("option");
            o.value = m.id;
            o.textContent = m.name;
            sel.insertBefore(o, sel === form ? sel.querySelector('option[value="__new"]') : null);
          }
        }
        const want = new URLSearchParams(location.search).get("market");
        for (const sel of [form, filter]) if (want && sel && [...sel.options].some((o) => o.value === want)) sel.value = want;
        if (filter && want) filter.dispatchEvent(new Event("change"));
      })
      .catch(() => {});
  }
}
// Preselect the market when arriving from a market page.
{
  const want = new URLSearchParams(location.search).get("market");
  const sel = $("#slMarket");
  if (want && sel && [...sel.options].some((o) => o.value === want)) sel.value = want;
}
marketFeed();
startPage();
browsePage();
listingPage();
managePage();

// ---- Sublease War Room page: funnel counts, cost calculator, sample dashboard ----
{
  const track = (name) => {
    try {
      fetch("/api/sublease/event", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => {});
    } catch {}
  };
  const once = (name) => {
    try {
      if (sessionStorage.getItem("sl." + name)) return;
      sessionStorage.setItem("sl." + name, "1");
    } catch {}
    track(name);
  };
  if ($("[data-sublease-start]")) {
    once("view");
    $$('a[href="#start"]').forEach((a) => a.addEventListener("click", () => once("cta_click")));
    $("[data-sl-pay]")?.addEventListener("click", () => track("pay_click"));
    new MutationObserver(() => {
      if ($("#slFormWrap") && !$("#slFormWrap").hidden) once("form_open");
    }).observe($("#slFormWrap") || document.body, { attributes: true, attributeFilter: ["hidden"] });
    $("#slForm")?.addEventListener("submit", () => once("form_submit"));
  }
  const calc = $("#slCalc");
  if (calc) {
    const rent = $("#slCalcRent"),
      months = $("#slCalcMonths"),
      out = $("#slCalcOut");
    const run = () => {
      const r = Number(rent.value),
        m = Number(months.value);
      if (!(r > 0) || !(m > 0)) {
        out.hidden = true;
        return;
      }
      once("calc_used");
      const owed = r * m,
        week = Math.round((r * 12) / 52),
        days = Math.max(1, Math.round(39 / (r / 30)));
      out.hidden = false;
      out.innerHTML =
        `<p>If nobody takes over, you still owe about <strong>${money(Math.round(owed))}</strong> in rent for the rest of your lease.</p>` +
        `<p>Every week the place sits empty costs you about <strong>${money(week)}</strong>.</p>` +
        `<p>The Sublease War Room is <strong>$39 one time</strong>. That's about ${days} ${days === 1 ? "day" : "days"} of your rent.</p>` +
        `<p><a class="btn btn-primary" href="#start">Get started</a></p>`;
    };
    rent.addEventListener("input", run);
    months.addEventListener("input", run);
  }
  $("#slPreviewToggle")?.addEventListener("click", () => once("preview_open"));
}
