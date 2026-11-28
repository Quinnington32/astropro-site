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
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
};
// Share links: Facebook first, then the other places students actually send things.
const shareBar = (url, title) => {
  const u = encodeURIComponent(url),
    t = encodeURIComponent(title);
  return `<div class="sl-sharebar" data-share-url="${esc(url)}" data-share-title="${esc(title)}"><a class="btn btn-fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Share on Facebook</a><a class="btn btn-ghost" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a><a class="btn btn-ghost" href="sms:?&body=${t}%20${u}">Text</a><a class="btn btn-ghost" href="mailto:?subject=${t}&body=${u}">Email</a><button class="btn btn-ghost" type="button" data-native-share hidden>More…</button><button class="btn btn-ghost" type="button" data-copy-url>Copy link</button></div>`;
};
const pingShare = (url) => {
  const m = /[?&]id=([a-z0-9]{12})/.exec(url || "");
  if (m) fetch("/api/sublease/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m[1] }), keepalive: true }).catch(() => {});
};
const wireShare = (root) => {
  $$("[data-share-url]", root).forEach((bar) => {
    const url = bar.dataset.shareUrl,
      title = bar.dataset.shareTitle;
    bar.addEventListener("click", (ev) => { if (ev.target.closest("a,button")) pingShare(url); });
    const native = $("[data-native-share]", bar);
    if (native && navigator.share) {
      native.hidden = false;
      native.addEventListener("click", () => navigator.share({ title, url }).catch(() => {}));
    }
    $("[data-copy-url]", bar)?.addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      try {
        await navigator.clipboard.writeText(url);
        b.textContent = "Link copied";
      } catch {
        b.textContent = "Copy from the address bar";
      }
    });
  });
};
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
    pending: "Good. Keep the landlord's answer in writing. Your dashboard has landlord accountability templates you can send.",
    "not-asked": "No problem. After you submit, your dashboard gives you landlord accountability templates, including a ready-to-send request for permission.",
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
  // A link with ?code= lets us send a student back to their paid form from any device.
  const linkCode = (new URLSearchParams(location.search).get("code") || "").toLowerCase();
  if (/^[a-z0-9]{12}$/.test(linkCode)) {
    try {
      localStorage.setItem(CODE_KEY, linkCode);
    } catch {}
  }
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
    url.searchParams.set("item_name", "AstroPro Sublease War Room: 60-day listing, Facebook group posts, weekly landlord emails");
    url.searchParams.set("item_number", payCode);
    url.searchParams.set("amount", Number(payBtn.dataset.price).toFixed(2));
    url.searchParams.set("currency_code", "USD");
    url.searchParams.set("no_shipping", "1");
    url.searchParams.set("notify_url", location.origin + "/api/sublease/paypal-ipn");
    url.searchParams.set("return", location.origin + "/sublease-war-room.html?paid=1&code=" + payCode + "#start");
    url.searchParams.set("rm", "1");
    url.searchParams.set("cbt", "Continue to your Sublease War Room form");
    url.searchParams.set("cancel_return", location.origin + "/sublease-war-room.html#start");
    return url.href;
  };
  payBtn.href = buildPayUrl();
  const sticky = $("[data-sl-sticky]");
  if (sticky) {
    const startEl = $("#start");
    const upd = () => {
      const r = startEl.getBoundingClientRect();
      const past = window.scrollY > 500 && !(r.top < innerHeight && r.bottom > 0);
      sticky.hidden = !past;
      document.body.classList.toggle("sl-sticky-on", past);
    };
    addEventListener("scroll", upd, { passive: true });
    upd();
  }
  const payEmail = $("#slPayEmail");
  const EMAIL_KEY = "astropro.sublease.email";
  try {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved && payEmail) payEmail.value = saved;
  } catch {}
  let waiting = false;
  payBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const email = (payEmail?.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      say(payMsg, "Enter your email first so we can send your form link.");
      payEmail?.focus();
      return;
    }
    try {
      localStorage.setItem(EMAIL_KEY, email);
    } catch {}
    say(payMsg, "Opening PayPal's secure checkout…", true);
    try {
      await Promise.race([api("/intent", { method: "POST", body: JSON.stringify({ code: payCode, email }) }), new Promise((r) => setTimeout(r, 2500))]);
    } catch (e) {
      if (/valid email/i.test(e.message)) return say(payMsg, e.message);
    }
    waiting = true;
    location.href = buildPayUrl();
  });
  // If they pay in another tab or app and come back here, open the form as soon as the payment shows up.
  const recheck = async () => {
    if (!wrap.hidden) return;
    const st = await creditStatus();
    if (st.paid && !st.used) openForm(waiting);
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && recheck());
  window.addEventListener("focus", recheck);
  setInterval(() => waiting || document.visibilityState !== "visible" || recheck(), 8000);
  const openForm = (scroll = true) => {
    gate.hidden = true;
    wrap.hidden = false;
    try {
      const em = localStorage.getItem(EMAIL_KEY);
      if (em && !$("#slEmail").value) $("#slEmail").value = em;
    } catch {}
    if (scroll) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (/[?&]paid=1/.test(location.search)) return openForm(true);
    const st = await creditStatus();
    if (st.paid && !st.used) return openForm(/[?&]code=/.test(location.search) || location.hash === "#start");
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
      const school = String(fd.school || "").trim();
      const slug = marketName.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
      if (marketName.length < 3 || slug.length < 2 || school.length < 3) {
        say(msg, "Add your city and state and your school name so we can build your housing page.");
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
      showSuccess(out.id, link, out.live, out.emailed, body.ownerEmail);
    } catch (e) {
      say(msg, e.message);
      btn.disabled = false;
    }
  });
  function showSuccess(id, link, live, emailed, email) {
    const box = $("#slSuccess");
    $("[data-sl-live]").hidden = !live;
    $("[data-sl-confirming]").hidden = !!live;
    $("[data-sl-ref]").textContent = id;
    $("[data-sl-emailed]").hidden = !emailed;
    $("[data-sl-notemailed]").hidden = !!emailed;
    $("[data-sl-email]").textContent = email || "";
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
    const shareUrl = location.origin + "/sublease-listing.html?id=" + l.id;
    view.insertAdjacentHTML("beforeend", `<section class="sl-share-card"><h2>Share this place</h2><p>Know someone who needs a place? Send it their way.</p>${shareBar(shareUrl, l.title + " | " + money(l.rent) + "/mo")}</section>`);
    wireShare(view);
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
  { id: "fbgroup", short: "Facebook group", name: "Your market's Facebook group", tag: "Free · Best for students", url: groupUrl, why: "This is where most students look for subleases. Join the group, then post.", steps: ["Open the group and tap Join if you haven't.", "Tap Write something, paste the Facebook post from your launch kit, and add your photos.", "Add your listing link so students can see all the details."], copy: "fb" },
  { id: "school", short: "my school board", name: "Your school's off-campus housing board", tag: "Free · Students only", url: "https://www.google.com/search?q=" + encodeURIComponent((l.school || l.marketName) + " off campus housing post a sublet"), why: "Many schools run a free sublet board that only students and staff can use, which means fewer scams.", steps: ["Open the search result for your school's off-campus housing site.", "Sign in with your school account and choose Add a Listing or Post a Sublet.", "Paste the listing text and upload your photos."], copy: "long" },
  { id: "marketplace", short: "Facebook Marketplace", name: "Facebook Marketplace", tag: "Free · Huge reach", url: "https://www.facebook.com/marketplace/create/rental", why: "Free and local, with direct messaging. Choose Home for Rent.", steps: ["Choose Home for Rent and fill in the price, dates and bedrooms.", "Paste the listing text and add photos.", "Publish, then watch your messages for scams."], copy: "long" },
  { id: "craigslist", short: "Craigslist", name: "Craigslist", tag: "Free · Create a free account", url: "https://accounts.craigslist.org/login", why: "Free to post. Use the housing section's sublets & temporary category for your city.", steps: ["Make a free account so you can repost later.", "Choose your city, then housing, then sublets & temporary.", "Paste the listing text, add photos and a general location (no unit number)."], copy: "long" },
  { id: "zillow", short: "Zillow", name: "Zillow, Trulia and HotPads", tag: "Free for a first listing · Needs landlord OK", url: "https://www.zillow.com/rental-manager/post-a-listing/", why: "One Zillow Rental Manager listing also shows on Trulia and HotPads. Check Zillow's current rules and fees first, and only post if your landlord has approved a sublease.", steps: ["Create a free Zillow Rental Manager account.", "Create a listing, paste the text and add photos.", "Publish, and reply to renters through Zillow."], copy: "long" },
  { id: "zumper", short: "Zumper", name: "Zumper and PadMapper", tag: "Free for one listing", url: "https://www.zumper.com/", why: "Zumper lists for free and can share to Facebook Marketplace. Look for Post a rental or List a property.", steps: ["Create a free account.", "Choose List a property and paste your listing text.", "Add photos and publish."], copy: "long" },
  { id: "sublet", short: "Sublet.com", name: "Sublet.com and LeaseBreak", tag: "Free · Built for subleases", url: "https://www.sublet.com/", why: "Sites made for subleases and lease transfers. LeaseBreak is at leasebreak.com.", steps: ["Create an account on Sublet.com.", "Add your listing with the dates and rent.", "Repeat on LeaseBreak if you want more reach."], copy: "long" },
  { id: "reddit", short: "Reddit", name: "Reddit and campus groups", tag: "Free · Check each group's rules", url: "https://www.reddit.com/subreddits/search?q=" + encodeURIComponent(l.school || l.marketName), why: "Many campus and city subreddits have housing threads. Also try GroupMe, Discord and your school's housing Instagram.", steps: ["Find your school or city subreddit and read its housing rules.", "Paste the Reddit post from your launch kit where it's allowed.", "Share your listing link in student group chats."], copy: "reddit" },
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
// The 14-day game plan: a few small tasks a day, one or two new places each day. go = platform to open, copy = text to copy.
const PLAN = [
  { d: 1, title: "Launch day", tasks: [
    { id: "d1a", t: "Post in your market's Facebook group", go: "fbgroup" },
    { id: "d1b", t: "Post on Facebook Marketplace", go: "marketplace" },
    { id: "d1c", t: "Email your landlord to confirm you're on the relet list, and switch on the weekly check-ins below", copy: "ll2", label: "Copy the email" },
  ] },
  { d: 2, title: "Spread the word", tasks: [
    { id: "d2a", t: "Post on Craigslist", go: "craigslist" },
    { id: "d2b", t: "Post on your school's off-campus housing board", go: "school" },
    { id: "d2c", t: "Text your link to 5 friends and roommates and ask them to share it", copy: "short", label: "Copy the short post" },
  ] },
  { d: 3, title: "Go wider", tasks: [
    { id: "d3a", t: "Post on Zillow, Trulia and HotPads (only if your landlord has approved)", go: "zillow" },
    { id: "d3b", t: "Post on Zumper and PadMapper", go: "zumper" },
    { id: "d3c", t: "Answer every message within 2 hours, and offer two tour times", copy: "reply", label: "Copy the reply" },
  ] },
  { d: 4, title: "Sublease sites and campus chats", tasks: [
    { id: "d4a", t: "Post on Sublet.com and LeaseBreak", go: "sublet" },
    { id: "d4b", t: "Post on Reddit, GroupMe or Discord (check each group's rules)", go: "reddit" },
    { id: "d4c", t: "Book tours with everyone who has replied", copy: "followup", label: "Copy the follow-up" },
  ] },
  { d: 5, title: "Bump and push", tasks: [
    { id: "d5a", t: "Comment 'still available' on your Facebook group post with a new photo", copy: "bump", label: "Copy the comment" },
    { id: "d5b", t: "Share your listing in a second Facebook group (search your school + housing or roommates)", copy: "fb", label: "Copy the post" },
    { id: "d5c", t: "Check your stats card: views but no messages? Improve your photos or title (Edit listing)" },
  ] },
  { d: 6, title: "Social", tasks: [
    { id: "d6a", t: "Post your link on an Instagram story and in student roommate pages", copy: "short", label: "Copy the short post" },
    { id: "d6b", t: "Follow up with everyone who asked questions but hasn't booked a tour", copy: "followup", label: "Copy the follow-up" },
  ] },
  { d: 7, title: "Week one check-in", tasks: [
    { id: "d7a", t: "Repost on Facebook Marketplace so it jumps back to the top", go: "marketplace" },
    { id: "d7b", t: "Run your tours. Use the tour, sign and hand-over checklist below" },
    { id: "d7c", t: "Ask your landlord for a relet-list update", copy: "ll3", label: "Copy the email" },
  ] },
  { d: 8, title: "Sharpen the offer", tasks: [
    { id: "d8a", t: "No tours yet? Drop the rent $25 to $50 or add a move-in perk (Edit listing)" },
    { id: "d8b", t: "Repost in your Facebook group and mention the new price", copy: "bump", label: "Copy the comment" },
  ] },
  { d: 9, title: "Fresh eyes", tasks: [
    { id: "d9a", t: "Renew your Craigslist post", go: "craigslist" },
    { id: "d9b", t: "Message everyone who toured and ask what they're thinking", copy: "followup", label: "Copy the follow-up" },
  ] },
  { d: 10, title: "Second wave", tasks: [
    { id: "d10a", t: "Repost in your Facebook group", go: "fbgroup" },
    { id: "d10b", t: "Ask 3 friends to share your link again", copy: "short", label: "Copy the short post" },
    { id: "d10c", t: "Ask your landlord again whether they have anyone for your unit", copy: "ll3", label: "Copy the email" },
  ] },
  { d: 11, title: "Line up tours", tasks: [
    { id: "d11a", t: "Offer back-to-back tour slots on one day so people feel the demand", copy: "reply", label: "Copy the reply" },
    { id: "d11b", t: "Have the landlord's application link or office contact ready to send" },
  ] },
  { d: 12, title: "Close the deal", tasks: [
    { id: "d12a", t: "Follow up with everyone who has toured", copy: "followup", label: "Copy the follow-up" },
    { id: "d12b", t: "Confirm the landlord has approved your pick in writing" },
  ] },
  { d: 13, title: "Last push", tasks: [
    { id: "d13a", t: "Post in a different Facebook group or Marketplace", go: "marketplace" },
    { id: "d13b", t: "Send one more update to your landlord", copy: "ll3", label: "Copy the email" },
  ] },
  { d: 14, title: "Review and relaunch", tasks: [
    { id: "d14a", t: "Look at your views and messages. What worked? Do more of it." },
    { id: "d14b", t: "Add new photos, refresh your listing and repost everywhere (Edit listing)" },
  ] },
];
const TSH = [
  { title: "Before the tour", items: [["tsh1", "Get your landlord's approval in writing"], ["tsh2", "Offer two tour times in daylight, and have a roommate or friend there if you can"], ["tsh3", "Tidy the place and take fresh photos"]] },
  { title: "At the tour", items: [["tsh4", "Meet in person or on live video before anything else"], ["tsh5", "Check photo ID and that the name matches their application"], ["tsh6", "Show everything: appliances, parking, storage and any damage already there"], ["tsh7", "Go over the move-in date, rent due date and utilities"]] },
  { title: "After the tour", items: [["tsh8", "Send the landlord's application link or the office contact"], ["tsh9", "Wait for the landlord's approval in writing"], ["tsh10", "Never take money before approval"]] },
  { title: "Sign and hand over", items: [["tsh11", "Sign a written sublease or the landlord's own form"], ["tsh12", "Collect rent and deposit exactly as the paperwork says"], ["tsh13", "Walk through together and take dated move-in photos"], ["tsh14", "Send the photos to the landlord and the new tenant, then hand over keys, fobs and parking passes"], ["tsh15", "Mark your listing as filled here"]] },
];
const kit = (l, groupUrl) => {
  const bed = l.bedrooms === 0 ? "studio" : l.bedrooms + "-bedroom";
  const util = { yes: "utilities included", no: "utilities not included", some: "some utilities included" }[l.utilities];
  const furn = { yes: "furnished", no: "unfurnished", partly: "partly furnished" }[l.furnished];
  const url = location.origin + "/sublease-listing.html?id=" + l.id;
  const dates = dateText(l.startDate) + " to " + dateText(l.endDate);
  const verb = { sublease: "SUBLEASE", relet: "RELET", assignment: "LEASE TAKEOVER" }[l.type];
  const first = (l.ownerName || "").trim().split(/\s+/)[0] || "";
  const school = l.school || l.marketName;
  const months = Math.max(1, Math.round((new Date(l.endDate) - new Date(l.startDate)) / 2629800000));
  const monthsText = months + " month" + (months === 1 ? "" : "s");
  const approved = l.permission === "approved";
  const perks = [furn === "furnished" && "Furnished", l.utilities === "yes" && "Utilities included", l.utilities === "some" && "Some utilities included", approved && "Landlord-approved"].filter(Boolean);
  const intro = {
    sublease: "I have to leave early, and that's your gain: a place that's ready to move into, so there's no apartment hunting.",
    relet: "This is a relet, so you apply through the property and they handle the lease paperwork. Simple and official.",
    assignment: "You'd take over my lease for the rest of the term, so it's the same place and the same rate with no new-lease hunt.",
  }[l.type];
  const hello = first ? `Hi, I'm ${first}. ` : "";
  const hook = `🚨 ${verb}: ${bed} near ${school} for ${money(l.rent)}/mo`;
  const how = l.type === "relet" ? ["Message me and book a tour (in person or live video).", "Apply through the property's office.", "Get approved, sign with the property and move in."] : ["Message me and book a tour (in person or live video).", "Apply with the landlord for approval.", "Sign the " + (l.type === "assignment" ? "assignment" : "sublease") + " paperwork and move in."];
  const fb = `${hook}\n\n${hello}${intro}\n\n📍 ${l.area}\n📅 ${dates} (${monthsText})\n💰 ${money(l.rent)}/mo${l.deposit ? " · " + money(l.deposit) + " deposit" : ""}\n🛏 ${bed}, ${l.bathrooms} bath${perks.length ? "\n✅ " + perks.join(" · ") : ""}\n\nTHE DETAILS\n${l.description}\n\nTours are open now, in person or on live video. Tap the link to see every photo, then message me and I'll reply fast. Places like this don't last.\n👉 ${url}`;
  const long = `${l.title}\n\n${typeLabel[l.type]}: ${bed}, ${l.bathrooms} bath near ${school}\nRent: ${money(l.rent)}/month${l.deposit ? "\nDeposit: " + money(l.deposit) : ""}\nAvailable: ${dates} (${monthsText})\nWhere: ${l.area}\nFurnished: ${furn}\nUtilities: ${util}${approved ? "\nLandlord approval: already in writing" : ""}\n\nABOUT THE PLACE\n${intro}\n\n${l.description}\n\nHOW IT WORKS\n1. ${how[0]}\n2. ${how[1]}\n3. ${how[2]}\n\nPhotos and full details: ${url}\nMessage me today to book a tour.`;
  const reddit = `[${verb}] ${bed}/${l.bathrooms}ba near ${school} - ${money(l.rent)}/mo, ${dates}\n\n${hello}${intro}\n\n- Where: ${l.area}\n- Dates: ${dates} (${monthsText})\n- Rent: ${money(l.rent)}/mo${l.deposit ? ", " + money(l.deposit) + " deposit" : ""}\n- ${bed}, ${l.bathrooms} bath, ${furn}, ${util}${approved ? "\n- Landlord approval already in writing" : ""}\n\n${l.description}\n\nHappy to answer questions in the comments or by DM, and I can do tours in person or on video. Photos and details: ${url}`;
  const short = `${hook}\n${l.area} · ${dates}\nPhotos + details + message me: ${url}\nKnow someone who needs a place? Send this their way!`;
  const bump = `Still available! 🙌 ${bed} near ${school}, ${money(l.rent)}/mo, ${dates}. Tours this week, message me or see photos here: ${url}`;
  const reply = `Hi! Thanks for reaching out about the ${bed} at ${l.area}. It's still available for ${dates} at ${money(l.rent)}/mo.\n\nI'd love to show it to you. A few quick questions so I can plan:\n- What's your name and what school are you at?\n- When do you need to move in?\n- Would you like to tour in person or on live video? I can do [day] or [day].\n\nAfter you've seen it, the next step is the landlord's application and approval.`;
  const followup = `Hi [name], just checking in on the ${bed} at ${l.area}. It's still available ${dates} for ${money(l.rent)}/mo. I'm lining up tours this week, so I'm happy to hold a time for you. Does [day] work?`;
  const landlord = `Subject: Request to ${l.type === "relet" ? "relet" : l.type === "assignment" ? "assign" : "sublease"} my unit at ${l.area}\n\nHello,\n\nI'm a current tenant at ${l.area} and I need to leave early. I'd like to ask what options I have to ${l.type === "relet" ? "relet the unit" : l.type === "assignment" ? "assign my lease" : "sublease the unit"} for ${dates}.\n\nCould you please tell me:\n1. Whether this is allowed under my lease, and what approval you need in writing.\n2. What screening the new tenant must pass, and any fees.\n3. Whether I stay responsible on the lease, or can be released.\n4. How the security deposit would be handled.\n\nI'll find a qualified tenant and send you their application. Thank you for your help.\n\nBest,\n${l.ownerName || "[Your name]"}`;
  const ll2 = `Subject: Confirming my spot on the relet list: ${l.area}\n\nHi [Landlord or office name],\n\nI'm reaching out to confirm that I'm on the relet list for ${l.area}. I'm doing everything I can on my end to find a qualified tenant (${dates}), but I want to make sure you're also keeping my unit on your list.\n\nCould you please reply to confirm I'm on the list and let me know where my unit stands?\n\nThank you for your help.\n\nBest,\n${l.ownerName || "[Your name]"}`;
  const ll3 = `Subject: Relet update request: ${l.area}\n\nHi [Landlord or office name],\n\nI'm following up on my relet for ${l.area}. Are there any prospective tenants or applications on your side, and is my unit still on your relet list? I'm happy to send over any tenant I find so you can start their application right away.\n\nThank you,\n${l.ownerName || "[Your name]"}`;
  return { fb, long, reddit, short, bump, reply, followup, landlord, ll2, ll3, groupUrl, title: l.title, url };
};
async function managePage() {
  const root = $("#slManage");
  if (!root) return;
  let [id, token] = (location.hash.slice(1) || "").split(".");
  if (!id && !/[?&]signedout=1/.test(location.search)) {
    try {
      const last = localStorage.getItem("astropro.sublease.last");
      if (last && localStorage.getItem("astropro.sublease." + last)) id = last;
    } catch {}
  }
  const dash = $("#slDash");
  let saved = token;
  if (!saved && id) {
    try {
      saved = localStorage.getItem("astropro.sublease." + id);
    } catch {}
  }
  if (!id || !saved) {
    const out = /[?&]signedout=1/.test(location.search);
    dash.innerHTML = `<div class="sl-signin"><h2>${out ? "You're signed out." : "Sign in to your Sublease War Room"}</h2><p>Enter the email you used for your listing and we'll send you a private sign-in link. There's no password to remember.</p><form id="slSignin" novalidate><div class="field"><label for="slSigninEmail">Your email</label><input id="slSigninEmail" type="email" autocomplete="email" maxlength="254" placeholder="you@school.edu" required></div><p><button class="btn btn-primary" type="submit">Email me my link</button></p><p id="slSigninMsg" class="sl-msg" role="status" hidden></p></form><p class="fineprint">New here? <a href="sublease-war-room.html">Start your Sublease War Room</a>. Signing in with a new link signs out older ones.</p></div>`;
    try {
      const em = localStorage.getItem("astropro.sublease.email");
      if (em) $("#slSigninEmail").value = em;
    } catch {}
    $("#slSignin").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const msg = $("#slSigninMsg"),
        btn = $("button", ev.currentTarget);
      btn.disabled = true;
      try {
        await api("/signin", { method: "POST", body: JSON.stringify({ email: $("#slSigninEmail").value }) });
        say(msg, "If that email has a Sublease War Room, a sign-in link is on its way. Check your inbox and spam folder. If nothing arrives in a few minutes, email support@astroprostudentresourcecenter.com and we'll get you in.", true);
      } catch (e) {
        say(msg, e.message);
      }
      btn.disabled = false;
    });
    return;
  }
  const groups = JSON.parse(root.dataset.groups || "{}");
  let doneSet = null;
  let planOpen = false;
  const edits = {};
  const persist = () => {
    saveDone(id, [...doneSet]);
    api("/manage/" + id, { method: "POST", headers: { "x-manage-token": saved }, body: JSON.stringify({ action: "progress", done: [...doneSet] }) }).catch(() => {});
  };
  const payBase = { business: root.dataset.business, price: root.dataset.price };
  const headers = { "x-manage-token": saved };
  if (!/[?&]classic=1/.test(location.search)) {
    const { mountWarRoom } = await import("./war-room-app.js");
    return mountWarRoom({ id, saved, dash, root, groups, payBase, api, $, $$, esc, money, dateText, say, copyText, pingShare, wireShare, shareBar, shrink, typeLabel, kit });
  }
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
    if (!doneSet) doneSet = new Set(data.progress || loadDone(id));
    const done = [...doneSet].filter((x) => plats.some((p) => p.id === x));
    const dayNum = data.paidAt ? Math.min(14, Math.max(1, Math.floor((Date.now() - new Date(data.paidAt).getTime()) / 86400000) + 1)) : 1;
    const taskRow = (t) => `<li class="${doneSet.has(t.id) ? "done" : ""}"><label class="sl-check"><input type="checkbox" data-task="${t.id}"${doneSet.has(t.id) ? " checked" : ""}> <span>${esc(t.t)}</span></label><span class="sl-task-actions">${t.go && plats.find((p) => p.id === t.go && p.url) ? `<button class="btn btn-primary" type="button" data-go="${t.go}">Copy my post and open ${esc(plats.find((p) => p.id === t.go).short)} ↗</button>` : ""}${t.copy ? `<button class="btn btn-ghost" type="button" data-copy="${t.copy}">${esc(t.label || "Copy")}</button>` : ""}</span></li>`;
    const planHtml = PLAN.map((d) => { const n = d.tasks.filter((t) => doneSet.has(t.id)).length; return `<details class="sl-day${d.d === dayNum ? " today" : ""}"${d.d === dayNum ? " open" : ""}><summary><strong>Day ${d.d}: ${esc(d.title)}</strong>${d.d === dayNum ? ' <span class="sl-today">Today</span>' : ""}<span class="sl-day-count" data-day-count>${n}/${d.tasks.length}</span></summary><ul class="sl-tasks">${d.tasks.map(taskRow).join("")}</ul></details>`; }).join("");
    const tshHtml = TSH.map((g) => `<div class="sl-tsh"><h3>${esc(g.title)}</h3><ul class="sl-tasks">${g.items.map(([i, t]) => taskRow({ id: i, t })).join("")}</ul></div>`).join("");
    const overdue = PLAN.filter((d) => d.d <= dayNum).flatMap((d) => d.tasks.filter((t) => !doneSet.has(t.id)).map((t) => ({ ...t, day: d.d })));
    const todayList = overdue.slice(0, 3);
    const todayCard = `<div class="sl-next sl-today-card"><span class="sl-next-tag">Today, day ${dayNum} of 14</span><h2>${todayList.length ? "Do these " + (todayList.length === 1 ? "one thing" : todayList.length + " things") + " today" : "You're caught up for today"}</h2>${todayList.length ? `<ul class="sl-tasks">${todayList.map((t) => taskRow(t)).join("")}</ul>${overdue.length > 3 ? `<p class="fineprint">${overdue.length - 3} more from earlier days are waiting in the full plan.</p>` : ""}` : "<p>Nothing left from the plan so far. Answer your messages within a few hours and offer two tour times.</p>"}</div>`;
    const planDone = PLAN.reduce((a, d) => a + d.tasks.filter((t) => doneSet.has(t.id)).length, 0);
    const planTotal = PLAN.reduce((a, d) => a + d.tasks.length, 0);
    const tshDone = TSH.reduce((a, g) => a + g.items.filter(([i]) => doneSet.has(i)).length, 0);
    const tshTotal = TSH.reduce((a, g) => a + g.items.length, 0);
    const live = l.status === "live";
    const next = plats.find((p) => p.url && !done.includes(p.id));
    const paid = !!data.paidAt;
    const pending = !paid && ["pending_payment", "expired"].includes(l.status);
    const until = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const msLeft = data.expiresAt ? new Date(data.expiresAt).getTime() - Date.now() : 0;
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    const canRenew = live && !data.renewed && msLeft > 0 && msLeft <= 7 * 86400000;
    const steps = [
      ["Landlord permission", l.permission === "approved" ? "done" : "todo", l.permission === "approved" ? "Approved in writing." : "Use the Landlord accountability templates below and get approval in writing before you accept anyone."],
      ["Listing created", "done", "Your listing is built with photos and details."],
      ["Listing live", live ? "done" : "todo", live ? "Live until " + until + "." : l.status === "expired" ? "Expired. Pay the listing fee to bring it back." : l.status === "pending_payment" ? "Not live yet. Pay the listing fee to publish it." : "Status: " + l.status + "."],
      ["Get messages", data.leads.length ? "done" : "todo", data.leads.length ? data.leads.length + " message" + (data.leads.length === 1 ? "" : "s") + " so far." : "Post your listing using the launch kit below."],
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
      `<div class="sl-kit"><div class="sl-kit-head"><h3>${esc(label)}</h3><button class="btn btn-ghost" type="button" data-copy="${key}">Copy</button></div><textarea class="sl-kit-edit" data-kit="${key}" rows="${Math.min(18, text.split("\n").length + 1)}" aria-label="${esc(label)} (you can edit it before copying)">${esc(edits[key] ?? text)}</textarea></div>`;
    dash.innerHTML = `
      <div class="sl-acct"><span>Signed in as <strong>${esc(data.ownerEmail || l.ownerName || "you")}</strong></span><span><button class="btn btn-ghost" type="button" data-copy-private>Copy my private link</button> <button class="btn btn-ghost" type="button" data-signout>Sign out</button></span></div>
      <div class="sl-status ${esc(l.status)}"><div><strong>${esc(l.title)}</strong><span>${esc(l.marketName)} · ${money(l.rent)}/mo</span></div><span class="sl-pill">${esc({ pending_payment: "Waiting for payment", live: "Live", paused: "Paused", filled: "Filled", expired: "Expired" }[l.status])}</span></div>
      ${l.status === "filled" ? `<div class="callout sl-win"><h2>Congrats, you found someone! 🎉</h2>${data.outcome ? "<p>Thanks for telling us. You're all set.</p>" : `<form id="slOutForm" class="sl-form"><p>One quick question to help the next student.</p><div class="field"><label for="out_via">Where did you find them?</label><select id="out_via" name="foundVia"><option value="astropro">Through my AstroPro listing or message</option><option value="elsewhere">Somewhere else (Facebook, a friend, my landlord...)</option></select></div><div class="field"><label for="out_quote">Anything you'd tell the next student? (optional)</label><textarea id="out_quote" name="quote" rows="3" maxlength="600" placeholder="What worked, what didn't..."></textarea></div><label class="checkbox-label"><input type="checkbox" name="shareOk"><span>You can share my comment (first name only) on the site.</span></label><p><button class="btn btn-primary" type="submit">Send</button></p><p class="sl-msg" id="slOutMsg" hidden></p></form>`}</div>` : ""}
      ${pending ? `<div class="callout"><h2>${l.status === "expired" ? "Bring your listing back" : "Publish your listing"}</h2><p>${l.status === "expired" ? "Your listing ended." : "Your listing is saved but not live yet."} Pay the one-time listing fee and it goes live for 60 days. It updates automatically within a minute or two of your payment. Your reference code is <code>${esc(l.id)}</code>.</p><p><a class="btn btn-primary" href="${payUrl.href}" rel="noopener">Pay $${esc(payBase.price)} with PayPal</a></p><p class="fineprint">Questions? Email <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a> with your reference code.</p></div>` : ""}
      ${live ? `<div class="sl-stats"><div><strong>${data.views || 0}</strong><span>Views</span></div><div><strong>${data.shares || 0}</strong><span>Shares</span></div><div><strong>${data.leads.length}</strong><span>Messages</span></div><div><strong>${daysLeft}</strong><span>Days left</span></div></div>${data.leads.length ? "" : (data.views >= 10 ? `<p class="sl-tip">${data.views} people looked and none messaged yet. A new photo or a $25 price drop usually helps. Use Edit listing below.</p>` : `<p class="sl-tip">New listings take a few days to get traction. Post in your next place below and share your link.</p>`)}` : ""}
      ${live && canRenew ? `<div class="callout"><h2>Your listing ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</h2><p>Still need someone? Keep it live 30 more days, free. One time per listing.</p><p><button class="btn btn-primary" type="button" data-renew>Keep my listing live 30 more days</button> <span class="sl-msg" id="slRenewMsg" hidden></span></p></div>` : ""}
      ${paid && ["live", "paused"].includes(l.status) ? todayCard : ""}
      <section><h2>Your progress</h2><ol class="sl-steps">${steps.map(([t, s, d]) => `<li class="${s}"><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join("")}</ol></section>
      <section><h2>Messages from students (${data.leads.length})</h2>${data.leads.length ? data.leads.map((x) => `<article class="sl-lead${x.flagged ? " flagged" : ""}"><header><strong>${esc(x.name)}</strong><time>${new Date(x.created_at).toLocaleString()}</time></header>${x.flagged ? '<p class="sl-warn">Careful: this message uses wording common in rental scams. Don\'t send money or keys, and meet in person first.</p>' : ""}<p>${esc(x.message).replace(/\n/g, "<br>")}</p><p><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? " · " + esc(x.phone) : ""}</p></article>`).join("") : "<p>No messages yet. Use the launch kit below to get your first ones.</p>"}</section>
      <section class="sl-plan"><h2>Your 14-day game plan</h2><p>A few small jobs a day, with a new place or a new push each time. Tap a button to copy your post and open the site, then tick it off. Your ticks save to your account, so they follow you to any device.</p><div class="sl-progress"><div class="sl-bar"><span data-plan-bar style="width:${Math.round((planDone / planTotal) * 100)}%"></span></div><p data-plan-count>${planDone} of ${planTotal} tasks done</p></div><details class="sl-fullplan"${planOpen ? " open" : ""}><summary class="btn btn-ghost">Show the full 14-day plan</summary>${planHtml}</details></section>
      <section><h2>Where to post, step by step</h2><p>More places means more messages. Each one is free to start. Tap a site, paste the text we wrote, add your photos, then check it off. Sites can change their rules and fees, and only post if your landlord has approved.</p>
        <div class="sl-progress"><div class="sl-bar"><span style="width:${Math.round((done.length / plats.length) * 100)}%"></span></div><p>${done.length} of ${plats.length} places posted</p></div>
        <div class="sl-photos"><p><strong>Your photos</strong> (save them to upload elsewhere):</p>${Array.from({ length: l.photos }, (_, i) => `<a href="/api/sublease/photo/${esc(l.id)}/${i}" download="listing-photo-${i + 1}.jpg"><img alt="Photo ${i + 1}" src="/api/sublease/photo/${esc(l.id)}/${i}" width="96" height="72"><span>Save</span></a>`).join("")}</div>
        <div class="sl-plats">${plats.map((p) => `<article class="sl-plat${done.includes(p.id) ? " done" : ""}"><header><div><h3>${esc(p.name)}</h3><span class="sl-tag">${esc(p.tag)}</span></div><label class="sl-check"><input type="checkbox" data-done="${p.id}"${done.includes(p.id) ? " checked" : ""}> Posted</label></header><p>${esc(p.why)}</p><ol>${p.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol><p class="sl-plat-actions">${p.url ? `<button class="btn btn-primary" type="button" data-go="${p.id}">Copy my post and open ${esc(p.short)} ↗</button>` : ""}<button class="btn btn-ghost" type="button" data-copy="${p.copy}">Copy the text only</button></p><p class="sl-msg ok" data-go-msg="${p.id}" hidden></p></article>`).join("")}</div>
      </section>
      <section><h2>Share your listing</h2><p>The more places your link lands, the more messages you get. It shows your photo, price and title when you share it.</p>${shareBar(k.url, l.title + " | " + money(l.rent) + "/mo")}<div class="sl-share"><input readonly aria-label="Your public listing link" value="${esc(k.url)}"><button class="btn btn-ghost" type="button" data-copy="url">Copy link</button></div><p class="fineprint">${data.views || 0} view${data.views === 1 ? "" : "s"} of your public page so far.</p></section>
      <section class="sl-ll"><h2>Landlord accountability</h2><p>Landlords fill units fast and forget about relet lists. Put your landlord's email below and we'll email them for you, now and then once a week, asking where your relet stands. The emails go out in your name and replies come straight to you.</p>
        ${data.landlord && data.landlord.active ? `<div class="callout sl-ll-on"><p><strong>Weekly check-ins are on</strong> for <strong>${esc(data.landlord.email)}</strong>. ${data.landlord.sent} sent${data.landlord.lastSent ? ", last on " + new Date(data.landlord.lastSent).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}. Replies go to ${esc(data.ownerEmail || "you")}.</p><p><button class="btn btn-ghost" type="button" data-ll-stop>Stop the check-ins</button> <button class="btn btn-ghost" type="button" data-ll-change>Change landlord</button></p></div>` : ""}
        ${live || l.status === "paused" ? `<form id="slLLForm" class="sl-form callout" novalidate${data.landlord && data.landlord.active ? " hidden" : ""}><div class="field"><label for="ll_email">Your landlord or leasing office email</label><input id="ll_email" name="landlordEmail" type="email" autocomplete="off" placeholder="leasing@yourbuilding.com" required></div><div class="field"><label for="ll_name">Their name (optional)</label><input id="ll_name" name="landlordName" type="text" maxlength="80" placeholder="Ms. Garcia"></div><div class="field"><label for="ll_prop">Your building or unit (optional)</label><input id="ll_prop" name="property" type="text" maxlength="120" value="${esc(l.area)}"></div><div class="field"><label for="ll_note">Add a personal line (optional)</label><input id="ll_note" name="note" type="text" maxlength="300" placeholder="I'm moving out May 15 and can show the unit anytime."></div><p><button class="btn btn-primary" type="submit">Email my landlord now and every week</button></p><p class="sl-msg" id="slLLMsg" hidden></p><p class="fineprint">The more you reach out to the office, the more you'll be on their mind and the more it helps you. Your landlord gets a stop link in every email.</p></form>` : '<p class="fineprint">Weekly check-ins start once your listing is live.</p>'}
        <p class="fineprint" style="font-size:.72rem;opacity:.8">Did they add you to their relet list like they're supposed to?</p>
        <h3>Landlord accountability templates</h3>
        ${copy("landlord", "1. Ask for permission", k.landlord)}${copy("ll2", "2. Confirm you're on the relet list", k.ll2)}${copy("ll3", "3. Weekly follow-up", k.ll3)}
      </section>
      <section><h2>Launch kit</h2><p>Posts and message templates written from your listing: a hook, the key details, and a clear next step. Tap a box to edit it, then copy.</p>
        ${copy("fb", "Facebook group post", k.fb)}${copy("long", "Marketplace, Craigslist and listing sites", k.long)}${copy("reddit", "Reddit post", k.reddit)}${copy("short", "Short post for Instagram, GroupMe and texts", k.short)}${copy("bump", "'Still available' bump comment", k.bump)}${copy("reply", "Reply to new messages", k.reply)}${copy("followup", "Follow-up after a tour or no reply", k.followup)}
      </section>
      <section class="sl-tshwrap"><h2>Tour, sign and hand-over checklist</h2><p>From first tour to keys in hand. Tick things off as you go.</p><div class="sl-progress"><div class="sl-bar"><span data-tsh-bar style="width:${Math.round((tshDone / tshTotal) * 100)}%"></span></div><p data-tsh-count>${tshDone} of ${tshTotal} done</p></div>${tshHtml}</section>
      <section class="sl-actions"><h2>Manage your listing</h2>
        <p><a class="btn btn-ghost" href="sublease-listing.html?id=${esc(l.id)}">View public page</a>
        <button class="btn btn-ghost" data-edit type="button">Edit listing</button>
        ${live ? '<button class="btn btn-ghost" data-status="paused" type="button">Pause listing</button>' : ""}
        ${l.status === "paused" ? '<button class="btn btn-ghost" data-status="live" type="button">Turn back on</button>' : ""}
        ${["live", "paused"].includes(l.status) ? '<button class="btn btn-primary" data-status="filled" type="button">Mark as filled</button>' : ""}<button class="btn btn-ghost sl-danger" data-delete type="button">Delete listing</button></p><p class="sl-msg" id="slActMsg" hidden></p></section>`;
    $("[data-signout]", dash)?.addEventListener("click", () => {
      try {
        localStorage.removeItem("astropro.sublease." + id);
      } catch {}
      location.replace("sublease-manage.html?signedout=1");
    });
    $("[data-copy-private]", dash)?.addEventListener("click", async (ev) => {
      try {
        await navigator.clipboard.writeText(location.origin + "/sublease-manage.html#" + id + "." + saved);
        ev.currentTarget.textContent = "Link copied";
      } catch {
        ev.currentTarget.textContent = "Copy from the address bar";
      }
    });
    $$("[data-copy]", dash).forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(edits[b.dataset.copy] ?? k[b.dataset.copy]);
          b.textContent = "Copied";
        } catch {
          b.textContent = "Select and copy";
        }
      }),
    );
    $$("[data-done]", dash).forEach((b) =>
      b.addEventListener("change", () => {
        b.checked ? doneSet.add(b.dataset.done) : doneSet.delete(b.dataset.done);
        persist();
        render();
      }),
    );
    $("#slOutForm", dash)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const v = Object.fromEntries(new FormData(f).entries());
      try {
        await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "outcome", foundVia: v.foundVia, quote: v.quote, shareOk: v.shareOk === "on" }) });
        render();
      } catch (err) {
        say($("#slOutMsg"), err.message);
      }
    });
    $("[data-ll-change]", dash)?.addEventListener("click", () => { $("#slLLForm", dash).hidden = false; });
    $("[data-ll-stop]", dash)?.addEventListener("click", async () => {
      try {
        await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "landlord-stop" }) });
        render();
      } catch {}
    });
    $("#slLLForm", dash)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const b = $("button[type=submit]", f);
      b.disabled = true;
      try {
        const r = await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "landlord", ...Object.fromEntries(new FormData(f).entries()) }) });
        say($("#slLLMsg"), r.sentNow ? "Sent! Your landlord has your first check-in. We'll follow up weekly." : "Saved. Your first check-in goes out within the hour.", true);
        setTimeout(render, 1800);
      } catch (err) {
        b.disabled = false;
        say($("#slLLMsg"), err.message);
      }
    });
    $("[data-renew]", dash)?.addEventListener("click", async (ev) => {
      ev.currentTarget.disabled = true;
      try {
        await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "renew" }) });
        render();
      } catch (err) {
        ev.currentTarget.disabled = false;
        say($("#slRenewMsg"), err.message);
      }
    });
    $("[data-edit]", dash)?.addEventListener("click", (ev) => {
      if ($("#slEditForm")) return;
      const f = (name, label, val, type = "text", extra = "") => `<div class="field"><label for="ed_${name}">${label}</label><input id="ed_${name}" name="${name}" type="${type}" value="${esc(val ?? "")}" ${extra}></div>`;
      const sel = (name, label, val, opts) => `<div class="field"><label for="ed_${name}">${label}</label><select id="ed_${name}" name="${name}">${opts.map(([v, t]) => `<option value="${v}"${v === val ? " selected" : ""}>${t}</option>`).join("")}</select></div>`;
      const form = document.createElement("form");
      form.id = "slEditForm";
      form.className = "sl-form callout";
      form.noValidate = true;
      form.innerHTML = `<h3>Edit your listing</h3>${f("title", "Title", l.title, "text", 'maxlength="120"')}${f("area", "Neighborhood or building", l.area, "text", 'maxlength="150"')}${f("rent", "Monthly rent ($)", l.rent, "number", 'min="1"')}${f("deposit", "Deposit ($, optional)", l.deposit || "", "number", 'min="0"')}${f("startDate", "Move-in", l.startDate, "date")}${f("endDate", "Move-out", l.endDate, "date")}${f("bedrooms", "Bedrooms", l.bedrooms, "number", 'min="0"')}${f("bathrooms", "Bathrooms", l.bathrooms, "number", 'min="0.5" step="0.5"')}${sel("furnished", "Furnished", l.furnished, [["yes", "Yes"], ["no", "No"], ["partly", "Partly"]])}${sel("utilities", "Utilities", l.utilities, [["yes", "Included"], ["some", "Some included"], ["no", "Not included"]])}<div class="field"><label for="ed_photos">Replace photos (optional, up to 4)</label><input id="ed_photos" type="file" accept="image/*" multiple><p class="fineprint">Choosing new photos replaces all your current ones.</p></div><div class="field"><label for="ed_description">Description</label><textarea id="ed_description" name="description" rows="8" maxlength="2000">${esc(l.description)}</textarea></div><p class="sl-msg" id="slEditMsg" role="alert" hidden></p><button class="btn btn-primary" type="submit">Save changes</button> <button class="btn btn-ghost" type="button" data-edit-cancel>Cancel</button>`;
      ev.currentTarget.closest("section").appendChild(form);
      $("[data-edit-cancel]", form).addEventListener("click", () => form.remove());
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(form).entries());
        try {
          const files = [...($("#ed_photos", form)?.files || [])].slice(0, 4);
          if (files.length) {
            say($("#slEditMsg"), "Saving your photos...");
            const shrunk = [];
            for (const f of files) shrunk.push(await shrink(f));
            await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "photos", photos: shrunk }) });
          }
          await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "edit", fields }) });
          render();
        } catch (err) {
          say($("#slEditMsg"), err.message);
        }
      });
    });
    wireShare(dash);
    $$("[data-go]", dash).forEach((b) =>
      b.addEventListener("click", () => {
        const p = plats.find((x) => x.id === b.dataset.go);
        if (!p) return;
        const msgs = $$(`[data-go-msg="${p.id}"], [data-go-msg="next"]`, dash);
        // Copy first (while this page still has focus), then open the site.
        pingShare(k.url);
        const copied = copyText(edits[p.copy] ?? k[p.copy]);
        window.open(p.url, "_blank", "noopener");
        if (!msgs.length) copied.then((ok) => { b.textContent = ok ? "Copied! Paste it in the new tab" : "Copy failed: use the Launch kit below"; });
        copied.then((ok) =>
          msgs.forEach((m) => say(m, ok ? "Copied! Paste it into the page that just opened, add your photos, and post. Then tick Posted." : "Couldn't copy automatically. Tap Copy the text only, then paste it into the site.", ok)),
        );
      }),
    );
    $$("[data-task]", dash).forEach((b) =>
      b.addEventListener("change", () => {
        b.checked ? doneSet.add(b.dataset.task) : doneSet.delete(b.dataset.task);
        persist();
        render();
      }),
    );
    $("details.sl-fullplan", dash)?.addEventListener("toggle", (ev) => { planOpen = ev.currentTarget.open; });
    $$("[data-kit]", dash).forEach((t) => t.addEventListener("input", () => { edits[t.dataset.kit] = t.value; }));
    $$("[data-skip]", dash).forEach((b) =>
      b.addEventListener("click", () => {
        doneSet.add(b.dataset.skip);
        persist();
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
          `<article class="rental-card sl-student-post"><div class="rental-visual"><img loading="lazy" decoding="async" alt="${esc(l.title)}" src="/api/sublease/photo/${esc(l.id)}/0"><span class="rental-badge">${esc(typeLabel[l.type])}</span></div><div class="rental-body"><div class="card-heading"><h3>${esc(l.title)}</h3></div><p class="rental-meta">${esc(l.area)} · ${esc(bedText(l))} · ${dateText(l.startDate)} – ${dateText(l.endDate)}</p><p><strong>${money(l.rent)}/mo</strong>${l.utilities === "yes" ? ", utilities included" : ""}${l.furnished === "yes" ? ", furnished" : ""}</p><div class="cta-row"><a class="btn btn-primary" href="sublease-listing.html?id=${esc(l.id)}">View and message</a><a class="btn btn-ghost" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.origin + "/sublease-listing.html?id=" + l.id)}" target="_blank" rel="noopener">Share on Facebook</a></div><p class="review-date">Posted by a student. Confirm landlord approval and see the place before you pay anyone.</p></div></article>`,
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
        const grid = $("#slNewMarketGrid");
        if (grid && (items || []).length) {
          grid.innerHTML = items
            .map((m) => `<a class="market-card" href="housing-${esc(m.id.slice(2))}.html"><h2>${esc(m.name)}</h2><span class="school">${esc(m.school || "")}</span><span class="link">Explore this market →</span></a>`)
            .join("");
          $("#slNewMarkets").hidden = false;
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
