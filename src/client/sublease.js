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
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    say(msg, "");
    const fd = Object.fromEntries(new FormData(form));
    const opt = $("#slMarket").selectedOptions[0];
    const body = {
      ...fd,
      marketName: opt && opt.value ? opt.textContent : "",
      photos,
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
      showSuccess(out.id, link, body.marketName);
    } catch (e) {
      say(msg, e.message);
      btn.disabled = false;
    }
  });
  function showSuccess(id, link, marketName) {
    const box = $("#slSuccess");
    const pay = $("[data-sl-pay]");
    const url = new URL("https://www.paypal.com/cgi-bin/webscr");
    url.searchParams.set("cmd", "_xclick");
    url.searchParams.set("business", pay.dataset.business);
    url.searchParams.set("item_name", "Sublease War Room listing — " + marketName);
    url.searchParams.set("item_number", id);
    url.searchParams.set("amount", Number(pay.dataset.price).toFixed(2));
    url.searchParams.set("currency_code", "USD");
    url.searchParams.set("no_shipping", "1");
    pay.href = url.href;
    $("[data-sl-ref]").textContent = id;
    $("[data-sl-manage]").href = link;
    $("[data-sl-manage-url]").value = new URL(link, location.href).href;
    form.hidden = true;
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
    $("#slListingTitle").textContent = l.title;
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
  return { fb, reddit, landlord, reply, days, groupUrl };
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
    const live = l.status === "live";
    const pending = l.status === "pending_payment";
    const steps = [
      ["Landlord permission", l.permission === "approved" ? "done" : "todo", l.permission === "approved" ? "Approved in writing." : "Send the email below and get approval in writing before you accept anyone."],
      ["Listing created", "done", "Your listing is built with photos and details."],
      ["Listing live", live ? "done" : "todo", pending ? "Complete payment below. We turn it on after we confirm it." : live ? "Live on the Sublease War Room." : "Status: " + l.status + "."],
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
    const copy = (key, label, text) =>
      `<div class="sl-kit"><div class="sl-kit-head"><h3>${esc(label)}</h3><button class="btn btn-ghost" type="button" data-copy="${key}">Copy</button></div><pre>${esc(text)}</pre></div>`;
    dash.innerHTML = `
      <div class="sl-status ${esc(l.status)}"><div><strong>${esc(l.title)}</strong><span>${esc(l.marketName)} · ${money(l.rent)}/mo</span></div><span class="sl-pill">${esc({ pending_payment: "Waiting for payment", live: "Live", paused: "Paused", filled: "Filled", expired: "Expired" }[l.status])}</span></div>
      ${pending ? `<div class="callout"><h2>Turn your listing on</h2><p>Your listing is saved. Pay the one-time listing fee and we'll switch it on, usually within a few hours. Your reference code is <code>${esc(l.id)}</code>.</p><p><a class="btn btn-primary" href="${payUrl.href}" rel="noopener">Pay $${esc(payBase.price)} with PayPal</a></p><p class="fineprint">Questions? Email <a href="mailto:leasesolutions3@gmail.com">leasesolutions3@gmail.com</a> with your reference code.</p></div>` : ""}
      <section><h2>Your sublease checklist</h2><ol class="sl-steps">${steps.map(([t, s, d]) => `<li class="${s}"><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join("")}</ol></section>
      <section><h2>Messages from students (${data.leads.length})</h2>${data.leads.length ? data.leads.map((x) => `<article class="sl-lead${x.flagged ? " flagged" : ""}"><header><strong>${esc(x.name)}</strong><time>${new Date(x.created_at).toLocaleString()}</time></header>${x.flagged ? '<p class="sl-warn">Careful: this message uses wording common in rental scams. Don\'t send money or keys, and meet in person first.</p>' : ""}<p>${esc(x.message).replace(/\n/g, "<br>")}</p><p><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? " · " + esc(x.phone) : ""}</p></article>`).join("") : "<p>No messages yet. Use the launch kit below to get your first ones.</p>"}</section>
      <section><h2>Launch kit</h2><p>Everything below is written from your listing. Copy it, paste it, and you're posted.</p>
        ${k.groupUrl ? `<p><a class="btn btn-primary" href="${esc(k.groupUrl)}" target="_blank" rel="noopener">Open your market's Facebook group ↗</a></p>` : ""}
        ${copy("fb", "Facebook group post", k.fb)}${copy("reddit", "Reddit post", k.reddit)}${copy("landlord", "Email to your landlord", k.landlord)}${copy("reply", "Reply to new messages", k.reply)}
        <div class="sl-kit"><h3>Your next 14 days</h3><ul class="sl-days">${k.days.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
      </section>
      <section class="sl-actions"><h2>Manage your listing</h2>
        <p><a class="btn btn-ghost" href="sublease-listing.html?id=${esc(l.id)}">View public page</a>
        ${live ? '<button class="btn btn-ghost" data-status="paused" type="button">Pause listing</button>' : ""}
        ${l.status === "paused" ? '<button class="btn btn-ghost" data-status="live" type="button">Turn back on</button>' : ""}
        ${["live", "paused"].includes(l.status) ? '<button class="btn btn-primary" data-status="filled" type="button">Mark as filled</button>' : ""}</p><p class="sl-msg" id="slActMsg" hidden></p></section>`;
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
startPage();
browsePage();
listingPage();
managePage();
