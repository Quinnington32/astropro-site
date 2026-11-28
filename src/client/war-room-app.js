// Sublease War Room dashboard: command center on top, a menu on the right, one center at a time in the middle.
import { cityInfo, platformList, PLAN, TIPS, MOTIVATION, llTemplates, HELP, TSH } from "./war-room-data.js";

const PLAN_DAYS = 30;
const ICONS = {
  today: '<path d="M4 12l5 5L20 6"/>',
  messages: '<path d="M4 5h16v11H8l-4 4z"/>',
  platforms: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  marketing: '<path d="M4 14V9l12-4v14L4 14zM16 8c3 0 4 2 4 4s-1 4-4 4M7 14l1 5h3l-1-5"/>',
  landlord: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  leads: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 8v6M8 11h6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
  listing: '<path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const NAV = [["today", "Today"], ["messages", "Messages"], ["platforms", "Platforms"], ["marketing", "Marketing"], ["landlord", "Landlord"], ["leads", "Lead Finder"], ["help", "Help Center"], ["listing", "My Listing"]];

export async function mountWarRoom(h) {
  const { id, saved, dash, root, groups, api, $, $$, esc, money, dateText, say, copyText, pingShare, wireShare, shareBar, shrink, typeLabel, kit } = h;
  const headers = { "x-manage-token": saved };
  const store = (k, v) => { try { v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
  const fetchStore = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  let data, l, k, c, plats, texts;
  let doneSet = null;
  let view = fetchStore("astropro.wr.view." + id) || "today";
  let sub = null;
  const edits = {};
  let showPlan = false;
  let helpTab = "tips";
  let mktTab = "flyers";
  const flyers = {};
  let scrollFn = null;

  const persist = () => {
    store("astropro.sublease.done." + id, JSON.stringify([...doneSet]));
    api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "progress", done: [...doneSet] }) }).catch(() => {});
  };
  const isDone = (t) => doneSet.has(t.id) || (t.do && t.do.startsWith("plat:") && doneSet.has("p_" + t.do.slice(5)));
  const postedCount = () => plats.filter((p) => doneSet.has("p_" + p.id)).length;
  const leadCount = () => [...doneSet].filter((x) => /^lf\d+$/.test(x)).length;

  // ---------- data ----------
  const load = async () => {
    try {
      data = await api("/manage/" + id, { headers });
    } catch (e) {
      dash.innerHTML = `<div class="empty-state"><h2>We couldn't open that dashboard.</h2><p>${esc(e.message)}</p><p><a class="btn btn-primary" href="sublease-manage.html?signedout=1">Sign in again</a></p></div>`;
      return false;
    }
    l = data.listing;
    l.ownerName = data.ownerName || "";
    c = cityInfo(l);
    k = kit(l, groups[l.market]);
    k.dates = dateText(l.startDate) + " to " + dateText(l.endDate);
    plats = platformList(l, k.groupUrl);
    if (!doneSet) {
      let local = [];
      try { local = JSON.parse(fetchStore("astropro.sublease.done." + id) || "[]"); } catch {}
      doneSet = new Set(data.progress || local);
    }
    texts = { ...k };
    llTemplates(l, k).forEach((t) => { texts["ll_" + t.id] = t.body; });
    store("astropro.sublease.last", id);
    return true;
  };

  const dayNum = () => (data.paidAt ? Math.min(PLAN_DAYS, Math.max(1, Math.floor((Date.now() - new Date(data.paidAt).getTime()) / 86400000) + 1)) : 1);
  const rawDay = () => (data.paidAt ? Math.max(1, Math.floor((Date.now() - new Date(data.paidAt).getTime()) / 86400000) + 1) : 1);

  // ---------- command center ----------
  const commandCenter = () => {
    const dn = dayNum();
    const all = PLAN.flatMap((d) => d.tasks);
    const planDone = all.filter(isDone).length;
    const pct = Math.round((planDone / all.length) * 100);
    const msLeft = data.expiresAt ? new Date(data.expiresAt).getTime() - Date.now() : 0;
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    const live = l.status === "live";
    const boost = data.boost || null;
    const tip = TIPS[(rawDay() - 1) % TIPS.length];
    const motto = MOTIVATION[(rawDay() - 1) % MOTIVATION.length];
    const statusText = { pending_payment: "Waiting for payment", live: "Live", paused: "Paused", filled: "Filled", expired: "Expired" }[l.status];
    const tile = (n, label, sub2, w) => `<div class="wr-tile"><strong>${n}</strong><span>${label}</span><small>${sub2 || "&nbsp;"}</small>${w != null ? `<i class="wr-meter"><b data-w="${w}"></b></i>` : ""}</div>`;
    const lastShare = boost && boost.lastAt ? "last " + new Date(boost.lastAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "we share it for you";
    const mini = `<div class="wr-mini" hidden><b>Day ${dn}/${PLAN_DAYS}</b><span>${daysLeft} days left</span><span>${postedCount()}/${plats.length} platforms</span><span>${boost && boost.groups ? boost.groups : 0} FB groups</span><span>${data.leads.length} messages</span><button type="button" data-top>Command center ↑</button></div>`;
    return `${mini}<section class="wr-cc" aria-label="Command center">
      <header class="wr-cc-bar"><span class="wr-live"><i></i>${live ? "LIVE" : esc(statusText.toUpperCase())}</span><b>Command center</b><span class="wr-cc-listing">${esc(l.title)} · ${esc(l.marketName)} · ${money(l.rent)}/mo</span><em>Day ${dn} of ${PLAN_DAYS}</em></header>
      <div class="wr-cc-body">
        <div class="wr-ring" data-ring="${pct}"><span>${pct}%</span><small>of the 30-day plan</small></div>
        <div class="wr-tiles">
          ${tile(daysLeft, "Days left", live ? "of 60 on your listing" : statusText, live ? Math.min(100, Math.round((daysLeft / 60) * 100)) : 0)}
          ${tile(postedCount() + " / " + plats.length, "Platforms posted", "tick them in Platforms", plats.length ? Math.round((postedCount() / plats.length) * 100) : 0)}
          ${tile(boost && boost.groups ? boost.groups : 0, "Facebook groups", esc(lastShare), boost && boost.groups ? 100 : 0)}
          ${tile(data.views || 0, "Views", "on your public page")}
          ${tile(data.shares || 0, "Shares", "link shares")}
          ${tile(data.leads.length, "Messages", data.leads.length ? "from students" : "none yet")}
          ${tile(leadCount(), "Students contacted", "from Lead Finder")}
          ${tile(planDone + " / " + all.length, "Plan tasks", "done so far", pct)}
        </div>
      </div>
      <div class="wr-cc-tip"><span class="wr-cc-tag">Tip of the day</span><p>${esc(tip)}</p><small>${esc(motto)}</small></div>
    </section>`;
  };

  // ---------- today ----------
  const taskRow = (t, day) => {
    const d = isDone(t);
    const target = t.do ? goLabel(t.do) : "";
    return `<li class="wr-task${d ? " done" : ""}"><label class="wr-check"><input type="checkbox" data-task="${t.id}"${d ? " checked" : ""}><span>${esc(t.t)}</span></label>${t.do && !d ? `<button class="btn btn-primary wr-go" type="button" data-go="${esc(t.do)}">${esc(target)} →</button>` : ""}</li>`;
  };
  const goLabel = (to) => {
    if (to.startsWith("plat:")) { const p = plats.find((x) => x.id === to.slice(5)); return p ? "Open " + p.name : "Open"; }
    return { ll: "Open Landlord center", "mkt:flyer": "Open my flyers", "mkt:posts": "Open my posts", leads: "Open Lead Finder", msgs: "Open Messages", "help:tour": "Open the checklist", "help:scams": "Open scam tips", "listing:edit": "Edit my listing", "listing:share": "Open My Listing" }[to] || "Open";
  };
  const todayView = () => {
    const dn = dayNum();
    const pastDue = PLAN.filter((d) => d.d <= dn).flatMap((d) => d.tasks.filter((t) => !isDone(t)).map((t) => ({ ...t, day: d.d })));
    const todays = (PLAN[dn - 1] || PLAN[0]).tasks;
    const todayIds = new Set(todays.map((t) => t.id));
    const earlier = pastDue.filter((t) => !todayIds.has(t.id)).slice(0, 4);
    const next = PLAN.slice(dn, dn + 3);
    const day = PLAN[dn - 1] || PLAN[0];
    const caught = todays.every(isDone) && !earlier.length;
    const total = PLAN.flatMap((d) => d.tasks).length;
    const done = PLAN.flatMap((d) => d.tasks).filter(isDone).length;
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Day ${dn} · ${esc(day.title)}</span><h2>${caught ? "You're caught up for today" : "Today's mission"}</h2><p>Each item takes you straight to the right place. Tick it off when you're done. Your progress saves to your account.</p></div>
      <ul class="wr-tasks">${todays.map((t) => taskRow(t)).join("")}</ul>
      ${earlier.length ? `<h3 class="wr-sub">Catch up from earlier</h3><ul class="wr-tasks">${earlier.map((t) => taskRow(t)).join("")}</ul>` : ""}
      ${caught ? `<p class="wr-note">Nothing left on today's list. Answer your messages within a few hours and offer two tour times.</p>` : ""}
    </div>
    <div class="wr-panel"><h3>Coming up</h3><div class="wr-up">${next.length ? next.map((d) => `<div><strong>Day ${d.d}</strong><span>${esc(d.title)}</span><small>${d.tasks.map((t) => esc(t.t)).slice(0, 2).join(" · ")}</small></div>`).join("") : "<p>You're at the end of the plan. Keep posting and replying. Open the 30-day view for a second pass.</p>"}</div>
      <p><button class="btn btn-ghost" type="button" data-toggle-plan>${showPlan ? "Hide" : "Show"} the full 30-day plan (${done} of ${total} done)</button></p>
      ${showPlan ? `<div class="wr-plan">${PLAN.map((d) => `<details${d.d === dn ? " open" : ""}><summary><strong>Day ${d.d}: ${esc(d.title)}</strong><span>${d.tasks.filter(isDone).length}/${d.tasks.length}</span></summary><ul class="wr-tasks">${d.tasks.map((t) => taskRow(t)).join("")}</ul></details>`).join("")}</div>` : ""}
    </div>`;
  };

  // ---------- messages ----------
  const messagesView = () => `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Inbox</span><h2>Messages from students (${data.leads.length})</h2></div>${data.leads.length ? data.leads.map((x) => `<article class="sl-lead${x.flagged ? " flagged" : ""}"><header><strong>${esc(x.name)}</strong><time>${new Date(x.created_at).toLocaleString()}</time></header>${x.flagged ? '<p class="sl-warn">Careful: this message uses wording common in rental scams. Don\'t send money or keys, and meet in person first.</p>' : ""}<p>${esc(x.message).replace(/\n/g, "<br>")}</p><p><a href="mailto:${esc(x.email)}?subject=${encodeURIComponent("Re: " + l.title)}">${esc(x.email)}</a>${x.phone ? " · " + esc(x.phone) : ""}</p><p><button class="btn btn-ghost" type="button" data-copy="reply">Copy a reply</button> <button class="btn btn-ghost" type="button" data-copy="followup">Copy a follow-up</button></p></article>`).join("") : `<p>No messages yet. Open Platforms to post in a new place, or Lead Finder to message students who are looking right now.</p>`}</div>`;

  // ---------- platforms ----------
  const KINDS = [["all", "All"], ["rental", "Rental sites"], ["social", "Social and groups"], ["campus", "Campus"], ["roommates", "Roommates and short-term"]];
  let platKind = "all";
  const platformsView = () => {
    const list = plats.filter((p) => platKind === "all" || p.kind === platKind);
    const p = sub && plats.find((x) => x.id === sub);
    const posted = postedCount();
    const card = (x) => `<button class="wr-plat-chip${doneSet.has("p_" + x.id) ? " done" : ""}${p && p.id === x.id ? " on" : ""}" type="button" data-plat="${x.id}"><strong>${esc(x.name)}</strong><span>${esc(x.tag)}</span><em>${doneSet.has("p_" + x.id) ? "Posted ✓" : "Not posted"}</em></button>`;
    const boost = data.boost && data.boost.groups ? data.boost.groups : 0;
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">${posted} of ${plats.length} places posted</span><h2>Platforms</h2><p>Every site has its own page with why we recommend it and a link to ${esc(c.city)}. Pick one, post, and tick it off. We already shared your listing ${boost ? "to " + boost + " Facebook group" + (boost === 1 ? "" : "s") + " in your city" : "to the Facebook groups in your city"} from the AstroPro page, so this list is everything else.</p></div>
      <div class="wr-chips">${KINDS.map(([v, t]) => `<button type="button" class="wr-chip${platKind === v ? " on" : ""}" data-kind="${v}">${t}</button>`).join("")}</div>
      <div class="wr-plat-grid">${list.map(card).join("")}</div></div>
      ${p ? platformDetail(p) : `<div class="wr-panel wr-hint"><p>Select a platform above to see why we recommend it and how to post.</p></div>`}`;
  };
  const platformDetail = (p) => {
    const done = doneSet.has("p_" + p.id);
    return `<div class="wr-panel wr-plat" id="wrPlat"><header><div><span class="wr-eyebrow">${esc(p.tag)}</span><h3>${esc(p.name)}</h3></div><label class="wr-check wr-posted"><input type="checkbox" data-posted="${p.id}"${done ? " checked" : ""}><span>I posted here</span></label></header>
      <p><strong>Why we recommend it:</strong> ${esc(p.why)}</p><ol>${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <p class="wr-actions"><button class="btn btn-primary" type="button" data-open="${p.id}">Copy my post and open ${esc(p.name)} for ${esc(c.city)} ↗</button>${p.look ? `<a class="btn btn-ghost" href="${esc(p.look)}" target="_blank" rel="noopener">${esc(p.lookLabel)} ↗</a>` : ""}<button class="btn btn-ghost" type="button" data-copy="${p.copy}">Copy the text only</button></p>
      <p class="sl-msg ok" data-open-msg hidden></p>
      ${l.photos ? `<div class="sl-photos"><p><strong>Your photos</strong> (save them to upload):</p>${Array.from({ length: l.photos }, (_, i) => `<a href="/api/sublease/photo/${esc(l.id)}/${i}" download="listing-photo-${i + 1}.jpg"><img alt="Photo ${i + 1}" src="/api/sublease/photo/${esc(l.id)}/${i}" width="96" height="72"><span>Save</span></a>`).join("")}</div>` : ""}
      <p class="fineprint">Sites change their rules and fees, so check each one before you post. Only post if your landlord has approved.</p></div>`;
  };

  // ---------- marketing ----------
  const copyCard = (key, label, text) => `<div class="sl-kit"><div class="sl-kit-head"><h3>${esc(label)}</h3><button class="btn btn-ghost" type="button" data-copy="${key}">Copy</button></div><textarea class="sl-kit-edit" data-kit="${key}" rows="${Math.min(16, String(text).split("\n").length + 1)}" aria-label="${esc(label)} (you can edit it before copying)">${esc(edits[key] ?? text)}</textarea></div>`;
  const marketingView = () => {
    const tabs = [["flyers", "Flyers and images"], ["posts", "Post templates"], ["share", "Share links"], ["print", "Print and hang"]];
    let body = "";
    if (mktTab === "flyers") body = `<p>We build these from your listing and photos. Download them, print the flyer, and post the story image.</p><div class="wr-flyers"><figure><div class="wr-canvas" data-flyer="flyer"><p>Building your flyer…</p></div><figcaption><strong>Flyer, 8.5 x 11</strong><span>Print it or send it as an image.</span><button class="btn btn-primary" type="button" data-dl="flyer">Download PNG</button> <button class="btn btn-ghost" type="button" data-print="flyer">Print it</button></figcaption></figure><figure><div class="wr-canvas story" data-flyer="story"><p>Building your story image…</p></div><figcaption><strong>Story, 1080 x 1920</strong><span>For Instagram, Facebook and TikTok stories.</span><button class="btn btn-primary" type="button" data-dl="story">Download PNG</button></figcaption></figure><figure><div class="wr-canvas square" data-flyer="square"><p>Building your post image…</p></div><figcaption><strong>Square post, 1080 x 1080</strong><span>For feed posts, GroupMe and texts.</span><button class="btn btn-primary" type="button" data-dl="square">Download PNG</button></figcaption></figure></div>`;
    if (mktTab === "posts") body = `<p>Posts written from your listing. Tap a box to edit it, then copy.</p>${copyCard("fb", "Facebook post", k.fb)}${copyCard("long", "Marketplace, Craigslist and listing sites", k.long)}${copyCard("reddit", "Reddit post", k.reddit)}${copyCard("short", "Short post for Instagram, GroupMe and texts", k.short)}${copyCard("bump", "'Still available' bump comment", k.bump)}${copyCard("reply", "Reply to new messages", k.reply)}${copyCard("followup", "Follow-up after a tour or no reply", k.followup)}`;
    if (mktTab === "share") body = `<p>The more places your link lands, the more views you get. It shows your photo, price and title when shared.</p>${shareBar(k.url, l.title + " | " + money(l.rent) + "/mo")}<div class="sl-share"><input readonly aria-label="Your public listing link" value="${esc(k.url)}"><button class="btn btn-ghost" type="button" data-copy="url">Copy link</button></div><p class="fineprint">${data.views || 0} view${data.views === 1 ? "" : "s"} of your public page so far.</p>`;
    if (mktTab === "print") body = `<ol class="wr-steps"><li><strong>Print 10 to 20 flyers.</strong> A campus print shop or library does it for a few dollars. Color is worth it.</li><li><strong>Hang them where students look.</strong> Campus bulletin boards, laundromats, coffee shops, gyms, apartment-complex boards and near the housing office. Ask first where a sign-off is needed.</li><li><strong>Make tear-offs.</strong> Cut vertical strips at the bottom with your listing link so people can grab one.</li><li><strong>Replace them every week.</strong> Fresh paper gets noticed.</li><li><strong>Take a photo of each board</strong> and post it on your story with the link.</li></ol><p><button class="btn btn-primary" type="button" data-nav="marketing" data-mkt="flyers">Get my flyer</button></p>`;
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Marketing center</span><h2>Flyers, images and posts</h2></div><div class="wr-chips">${tabs.map(([v, t]) => `<button type="button" class="wr-chip${mktTab === v ? " on" : ""}" data-mkt="${v}">${t}</button>`).join("")}</div>${body}</div>`;
  };

  // ---------- landlord ----------
  const landlordView = () => {
    const manual = doneSet.has("ll_manual");
    const ll = data.landlord;
    const on = !!(ll && ll.active);
    const have = !!ll;
    const live = ["live", "paused"].includes(l.status);
    const tpls = llTemplates(l, k);
    const confirmed = doneSet.has("ll_confirmed");
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Landlord center</span><h2>Landlord accountability</h2><p>Landlords fill units fast and forget about relet lists. Keep yours accountable. Many states expect a landlord to make reasonable efforts to re-rent a unit when a tenant leaves early. Check your lease and your state's rules, and keep every email as a record.</p></div>
      <div class="wr-mode" role="group" aria-label="Who sends the emails"><button type="button" class="wr-mode-btn${manual ? "" : " on"}" data-mode="auto"><strong>Automatic</strong><span>We email your landlord for you, every week</span></button><button type="button" class="wr-mode-btn${manual ? " on" : ""}" data-mode="manual"><strong>Manual</strong><span>You send the emails yourself</span></button></div>
      <label class="wr-check wr-confirm"><input type="checkbox" data-task="ll_confirmed"${confirmed ? " checked" : ""}><span>My landlord confirmed I'm on the relet list</span></label>
      ${manual ? `<p class="wr-note">Manual mode: your weekly check-ins are paused. Copy any template below, or open it in your email app.</p>` : ""}
      ${!manual && on ? `<div class="callout sl-ll-on"><p><strong>Weekly check-ins are on</strong> for <strong>${esc(ll.email)}</strong>. ${ll.sent} sent${ll.lastSent ? ", last on " + new Date(ll.lastSent).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}. Replies go to ${esc(data.ownerEmail || "you")}.</p><p><button class="btn btn-ghost" type="button" data-ll-stop>Stop the check-ins</button> <button class="btn btn-ghost" type="button" data-ll-change>Change landlord</button></p></div>` : ""}
      ${!manual && live ? `<form id="slLLForm" class="sl-form callout" novalidate${on ? " hidden" : ""}><div class="field"><label for="ll_email">Your landlord or leasing office email</label><input id="ll_email" name="landlordEmail" type="email" autocomplete="off" placeholder="leasing@yourbuilding.com" value="${esc(have ? ll.email : "")}" required></div><div class="field"><label for="ll_name">Their name (optional)</label><input id="ll_name" name="landlordName" type="text" maxlength="80" placeholder="Ms. Garcia"></div><div class="field"><label for="ll_prop">Your building or unit (optional)</label><input id="ll_prop" name="property" type="text" maxlength="120" value="${esc(l.area)}"></div><div class="field"><label for="ll_note">Add a personal line (optional)</label><input id="ll_note" name="note" type="text" maxlength="300" placeholder="I'm moving out May 15 and can show the unit anytime."></div><p><button class="btn btn-primary" type="submit">Email my landlord now and every week</button></p><p class="sl-msg" id="slLLMsg" hidden></p><p class="fineprint">Your landlord gets a stop link in every email.</p></form>` : ""}
      ${!live && !manual ? '<p class="fineprint">Automatic check-ins start once your listing is live.</p>' : ""}
    </div>
    <div class="wr-panel"><h3>Templates</h3><p>${manual ? "Copy a template or open it in your email app." : have ? "Pick a template and we send it to your landlord now, in your name. Replies come to you." : "Add your landlord's email above, then pick a template to send it now. Or copy any of them."}</p>
      <div class="wr-tpls">${tpls.map((t) => `<article class="wr-tpl"><header><div><h4>${esc(t.name)}</h4><small>${esc(t.when)}</small></div></header><textarea class="sl-kit-edit" data-kit="ll_${t.id}" rows="${Math.min(14, t.body.split("\n").length + 1)}" aria-label="${esc(t.name)} (you can edit it before sending)">${esc(edits["ll_" + t.id] ?? t.body)}</textarea><p class="wr-actions"><button class="btn btn-ghost" type="button" data-copy="ll_${t.id}">Copy</button><a class="btn btn-ghost" data-mailto="${t.id}" href="#">Open in my email app</a>${!manual && have && live ? `<button class="btn btn-primary" type="button" data-llsend="${t.id}">Send to my landlord now</button>` : ""}</p><p class="sl-msg" data-llmsg="${t.id}" hidden></p></article>`).join("")}</div></div>`;
  };

  // ---------- lead finder ----------
  const leadsView = () => {
    const g = k.groupUrl;
    const q1 = ["looking for housing", "need a sublease", "looking for apartment", "looking for a roommate", "need a place for spring"];
    const sch = l.school || c.city;
    const gs = (q) => (g ? g.replace(/\/?$/, "/") + "search/?q=" + encodeURIComponent(q) : "https://www.facebook.com/search/posts/?q=" + encodeURIComponent(q + " " + c.city));
    const rows = [
      ["Your city's Facebook group", q1.map((q) => [q, gs(q)])],
      ["Facebook posts about " + c.city, q1.slice(0, 3).map((q) => [q, "https://www.facebook.com/search/posts/?q=" + encodeURIComponent(q + " " + c.city)])],
      ["Reddit", ["looking for housing", "sublease wanted", "need a roommate"].map((q) => [q, "https://www.reddit.com/search/?q=" + encodeURIComponent(q + " " + sch) + "&sort=new"])],
      ["X (Twitter)", ["need a sublease", "looking for apartment"].map((q) => [q, "https://x.com/search?f=live&q=" + encodeURIComponent(q + " " + c.city)])],
      ["Instagram", [[sch + " housing", "https://www.instagram.com/explore/search/keyword/?q=" + encodeURIComponent(sch + " housing")], [sch + " roommates", "https://www.instagram.com/explore/search/keyword/?q=" + encodeURIComponent(sch + " roommates")]]],
    ];
    const n = leadCount();
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Lead Finder</span><h2>Find students who need a place right now</h2><p>These are ready-made searches for ${esc(c.city)}. Open one, look for posts from people asking for housing, then comment or message them with the reply below. Facebook doesn't let outside tools read group posts, so we open the right search for you instead.</p></div>
      <div class="wr-finder">${rows.map(([t, links]) => `<div class="wr-find"><h4>${esc(t)}</h4><p>${links.map(([q, u]) => `<a class="wr-find-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(q)} ↗</a>`).join("")}</p></div>`).join("")}</div>
      <div class="wr-tally"><div><strong>${n}</strong><span>students contacted</span></div><button class="btn btn-primary" type="button" data-lf="+">I contacted someone</button><button class="btn btn-ghost" type="button" data-lf="-"${n ? "" : " disabled"}>Undo</button></div></div>
    <div class="wr-panel"><h3>Reply templates</h3>${copyCard("lf_comment", "Comment under their post", `Hi ${"!"} I have a ${l.bedrooms === 0 ? "studio" : l.bedrooms + "-bedroom"} near ${sch} at ${money(l.rent)}/mo, available ${dateText(l.startDate)}. Photos and details here: ${k.url}`)}${copyCard("lf_dm", "Direct message", `Hi! I saw you're looking for a place. I'm leaving mine early: ${k.url}. It's ${money(l.rent)}/mo and ${l.furnished === "yes" ? "furnished" : "available"} ${dateText(l.startDate)} to ${dateText(l.endDate)}. Want to tour this week, in person or on video?`)}${copyCard("lf_tour", "Tour invite", k.reply)}<p class="fineprint">Be friendly, never spammy, and follow each group's rules. Use the person's name when you can.</p></div>`;
  };

  // ---------- help ----------
  const helpView = () => {
    const tabs = [["tips", "Tips and tricks"], ["tour", "Tour, sign and hand over"], ["scams", "Scam safety"], ["faq", "FAQ"]];
    let body = "";
    if (helpTab === "tips") body = `<div class="wr-do"><div><h4>Do</h4><ul>${HELP.dos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div class="no"><h4>Don't</h4><ul>${HELP.donts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div><p class="wr-note"><strong>Found someone?</strong> Open <button class="btn btn-ghost" type="button" data-nav="listing">My Listing</button> and tap Mark as filled.</p>`;
    if (helpTab === "tour") {
      const total = TSH.reduce((a, g) => a + g.items.length, 0), done = TSH.reduce((a, g) => a + g.items.filter(([i]) => doneSet.has(i)).length, 0);
      body = `<p class="wr-note">${done} of ${total} done</p>${TSH.map((g) => `<div class="sl-tsh"><h4>${esc(g.title)}</h4><ul class="wr-tasks">${g.items.map(([i, t]) => taskRow({ id: i, t })).join("")}</ul></div>`).join("")}`;
    }
    if (helpTab === "scams") body = `<h4>Red flags</h4><ul class="wr-flags">${HELP.scams.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="wr-note">When in doubt, stop replying and message us at <a href="mailto:support@astroprostudentresourcecenter.com">support@astroprostudentresourcecenter.com</a>.</p>`;
    if (helpTab === "faq") body = HELP.faq.map(([q, a]) => `<details class="wr-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
    return `<div class="wr-panel"><div class="wr-ph"><span class="wr-eyebrow">Help Center</span><h2>Tips, tours and answers</h2></div><div class="wr-chips">${tabs.map(([v, t]) => `<button type="button" class="wr-chip${helpTab === v ? " on" : ""}" data-help="${v}">${t}</button>`).join("")}</div>${body}</div>`;
  };

  // ---------- my listing ----------
  const listingView = () => {
    const live = l.status === "live";
    const paid = !!data.paidAt;
    const msLeft = data.expiresAt ? new Date(data.expiresAt).getTime() - Date.now() : 0;
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
    const canRenew = live && !data.renewed && msLeft > 0 && msLeft <= 7 * 86400000;
    return `${canRenew ? `<div class="wr-panel"><h3>Your listing ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</h3><p>Still need someone? Keep it live 30 more days, free. One time per listing.</p><p><button class="btn btn-primary" type="button" data-renew>Keep my listing live 30 more days</button> <span class="sl-msg" id="slRenewMsg" hidden></span></p></div>` : ""}
      <div class="wr-panel sl-actions"><div class="wr-ph"><span class="wr-eyebrow">My listing</span><h2>Manage your listing</h2><p>${esc(l.title)} · ${money(l.rent)}/mo · ${l.status === "live" && data.expiresAt ? "live until " + new Date(data.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : esc(l.status)}</p></div>
      <p class="wr-actions"><a class="btn btn-ghost" href="sublease-listing.html?id=${esc(l.id)}">View public page</a><button class="btn btn-ghost" data-edit type="button">Edit listing</button>${live ? '<button class="btn btn-ghost" data-status="paused" type="button">Pause listing</button>' : ""}${l.status === "paused" ? '<button class="btn btn-ghost" data-status="live" type="button">Turn back on</button>' : ""}${["live", "paused"].includes(l.status) ? '<button class="btn btn-primary" data-status="filled" type="button">Mark as filled</button>' : ""}<button class="btn btn-ghost sl-danger" data-delete type="button">Delete listing</button></p><p class="sl-msg" id="slActMsg" hidden></p></div>
      <div class="wr-panel"><h3>Share your listing</h3>${shareBar(k.url, l.title + " | " + money(l.rent) + "/mo")}<div class="sl-share"><input readonly aria-label="Your public listing link" value="${esc(k.url)}"><button class="btn btn-ghost" type="button" data-copy="url">Copy link</button></div></div>
      <div class="wr-panel"><h3>Your account</h3><p>Signed in as <strong>${esc(data.ownerEmail || "you")}</strong></p><p class="wr-actions"><button class="btn btn-ghost" type="button" data-copy-private>Copy my private link</button><button class="btn btn-ghost" type="button" data-signout>Sign out</button></p><p class="fineprint">Tip: add this page to your phone's home screen to use it like an app. In your browser menu, choose Add to Home Screen or Install.</p></div>`;
  };

  // ---------- chrome around the center ----------
  const banners = () => {
    const pending = !data.paidAt && ["pending_payment", "expired"].includes(l.status);
    let out = "";
    if (l.status === "filled") out += `<div class="callout sl-win"><h2>Congrats, you found someone! 🎉</h2>${data.outcome ? "<p>Thanks for telling us. You're all set.</p>" : `<form id="slOutForm" class="sl-form"><p>One quick question to help the next student.</p><div class="field"><label for="out_via">Where did you find them?</label><select id="out_via" name="foundVia"><option value="astropro">Through my AstroPro listing or message</option><option value="elsewhere">Somewhere else (Facebook, a friend, my landlord...)</option></select></div><div class="field"><label for="out_quote">Anything you'd tell the next student? (optional)</label><textarea id="out_quote" name="quote" rows="3" maxlength="600" placeholder="What worked, what didn't..."></textarea></div><label class="checkbox-label"><input type="checkbox" name="shareOk"><span>You can share my comment (first name only) on the site.</span></label><p><button class="btn btn-primary" type="submit">Send</button></p><p class="sl-msg" id="slOutMsg" hidden></p></form>`}</div>`;
    if (pending) {
      const pb = h.payBase;
      const u = new URL("https://www.paypal.com/cgi-bin/webscr");
      u.searchParams.set("cmd", "_xclick"); u.searchParams.set("business", pb.business);
      u.searchParams.set("item_name", "Sublease War Room listing — " + l.marketName); u.searchParams.set("item_number", l.id);
      u.searchParams.set("amount", Number(pb.price).toFixed(2)); u.searchParams.set("currency_code", "USD"); u.searchParams.set("no_shipping", "1");
      u.searchParams.set("notify_url", location.origin + "/api/sublease/paypal-ipn");
      u.searchParams.set("return", location.origin + "/sublease-manage.html#" + id + "." + saved);
      out += `<div class="callout"><h2>${l.status === "expired" ? "Bring your listing back" : "Publish your listing"}</h2><p>${l.status === "expired" ? "Your listing ended." : "Your listing is saved but not live yet."} Pay the one-time listing fee and it goes live for 60 days. Your reference code is <code>${esc(l.id)}</code>.</p><p><a class="btn btn-primary" href="${u.href}" rel="noopener">Pay $${esc(pb.price)} with PayPal</a></p></div>`;
    }
    return out;
  };
  const badge = (v) => {
    if (v === "messages") return data.leads.length;
    if (v === "today") { const dn = dayNum(); const n = PLAN.filter((d) => d.d <= dn).flatMap((d) => d.tasks).filter((t) => !isDone(t)).length; return n; }
    return 0;
  };
  const GROUPS = [["1", "Start here", ["today"]], ["2", "Get it seen", ["platforms", "marketing", "leads"]], ["3", "Handle interest", ["messages", "landlord"]], ["4", "Close and manage", ["help", "listing"]]];
  const nav = () => `<nav class="wr-nav" aria-label="War Room centers">${GROUPS.map(([n, t, vs]) => `<p class="wr-nav-h"><i>${n}</i>${t}</p>${vs.map((v) => { const label = NAV.find((x) => x[0] === v)[1]; return `<button type="button" class="wr-nav-btn${view === v ? " on" : ""}" data-nav="${v}"${view === v ? ' aria-current="page"' : ""}>${icon(v)}<span>${label}</span>${badge(v) ? `<b>${badge(v)}</b>` : ""}</button>`; }).join("")}`).join("")}</nav>`;

  const center = () => ({ today: todayView, messages: messagesView, platforms: platformsView, marketing: marketingView, landlord: landlordView, leads: leadsView, help: helpView, listing: listingView }[view] || todayView)();

  // ---------- flyers (drawn on a canvas from the listing) ----------
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const rr = (x, a, b, w, hh, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + hh, r); x.arcTo(a + w, b + hh, a, b + hh, r); x.arcTo(a, b + hh, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
  const cover = (x, img, a, b, w, hh, r) => { x.save(); rr(x, a, b, w, hh, r); x.clip(); const s = Math.max(w / img.width, hh / img.height); x.drawImage(img, a + (w - img.width * s) / 2, b + (hh - img.height * s) / 2, img.width * s, img.height * s); x.restore(); };
  const wrapText = (x, text, a, b, maxW, lh, maxLines) => {
    const words = String(text).split(/\s+/); let line = "", lines = [];
    for (const w of words) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); let last = lines[maxLines - 1]; while (x.measureText(last + "…").width > maxW && last.length) last = last.slice(0, -1); lines[maxLines - 1] = last.trimEnd() + "…"; }
    lines.forEach((t, i) => x.fillText(t, a, b + i * lh));
    return b + lines.length * lh;
  };
  const clip = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };
  const drawFlyer = async (kind) => {
    if (flyers[kind]) return flyers[kind];
    try { await Promise.all([document.fonts.load("800 40px Sora"), document.fonts.load("500 20px 'Work Sans'"), document.fonts.load("700 20px 'Work Sans'")]); } catch {}
    const logo = await loadImg("/brand/astropro-student-logo.png");
    const photos = (await Promise.all(Array.from({ length: Math.min(l.photos || 0, 4) }, (_, i) => loadImg("/api/sublease/photo/" + l.id + "/" + i)))).filter(Boolean);
    const [W, H] = kind === "flyer" ? [1275, 1650] : kind === "story" ? [1080, 1920] : [1080, 1080];
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const NAVY = "#172447", ORANGE = "#E77B25", IVORY = "#FBFAF6", GREY = "#4A5470";
    const bed = l.bedrooms === 0 ? "Studio" : l.bedrooms + " bed / " + l.bathrooms + " bath";
    const where = clip(l.area, 62) + " · " + c.city + (c.st ? ", " + c.st : "");
    const kindText = ({ sublease: "SUBLEASE", relet: "LEASE TAKEOVER", assignment: "LEASE TAKEOVER" }[l.type] || "SUBLEASE");
    const pin = (a, b, s, col) => { x.save(); x.translate(a, b); x.scale(s, s); x.strokeStyle = col; x.lineWidth = 2.4; x.lineCap = x.lineJoin = "round"; x.beginPath(); x.moveTo(12, 22); x.bezierCurveTo(12, 22, 19, 15.8, 19, 10); x.arc(12, 10, 7, 0, Math.PI, true); x.bezierCurveTo(5, 15.8, 12, 22, 12, 22); x.stroke(); x.beginPath(); x.arc(12, 10, 2.6, 0, 7); x.stroke(); x.restore(); };
    const priceTag = (a, b, s) => { const t = money(l.rent); x.font = "800 " + 64 * s + "px Sora, sans-serif"; const w1 = x.measureText(t).width; x.font = "600 " + 28 * s + "px 'Work Sans', sans-serif"; const w2 = x.measureText("/month").width; const w = w1 + w2 + 56 * s, hh = 100 * s; if (a < 0) a = W - w + a; x.fillStyle = ORANGE; rr(x, a, b, w, hh, 18 * s); x.fill(); x.fillStyle = NAVY; x.textBaseline = "alphabetic"; x.font = "800 " + 64 * s + "px Sora, sans-serif"; x.fillText(t, a + 28 * s, b + 72 * s); x.font = "600 " + 28 * s + "px 'Work Sans', sans-serif"; x.fillText("/month", a + 28 * s + w1 + 4 * s, b + 72 * s); };
    const heroFallback = (a, b, w, hh, r) => { x.fillStyle = NAVY; rr(x, a, b, w, hh, r); x.fill(); x.fillStyle = "#FBFAF6"; x.font = "800 56px Sora, sans-serif"; x.textAlign = "center"; x.fillText(c.city.toUpperCase(), a + w / 2, b + hh / 2 + 18); x.textAlign = "left"; };
    const hero = (a, b, w, hh, r) => (photos[0] ? cover(x, photos[0], a, b, w, hh, r) : heroFallback(a, b, w, hh, r));
    const url = "astroprostudentresourcecenter.com";
    x.fillStyle = kind === "story" ? NAVY : IVORY; x.fillRect(0, 0, W, H);
    if (kind === "flyer") {
      if (logo) x.drawImage(logo, 60, 36, 330, 110);
      x.fillStyle = NAVY; rr(x, W - 60 - 330, 62, 330, 62, 31); x.fill(); x.fillStyle = IVORY; x.font = "600 26px 'Work Sans', sans-serif"; x.textAlign = "center"; x.fillText(kindText, W - 60 - 165, 103); x.textAlign = "left";
      x.fillStyle = ORANGE; x.fillRect(0, 166, W, 8);
      hero(0, 174, W, 500, 0); priceTag(60, 624, 1);
      x.fillStyle = NAVY; x.font = "800 58px Sora, sans-serif"; let y = wrapText(x, l.title, 60, 800, W - 120, 68, 2);
      pin(52, y + 6, 1.7, ORANGE); x.fillStyle = NAVY; x.font = "600 34px 'Work Sans', sans-serif"; x.fillText(clip(where, 52), 106, y + 40);
      x.fillStyle = GREY; x.font = "500 28px 'Work Sans', sans-serif"; x.fillText("Near " + clip(l.school || c.city, 48), 60, y + 88);
      const facts = [["LAYOUT", bed], ["MOVE-IN", dateText(l.startDate)], ["FURNISHED", { yes: "Yes", no: "No", partly: "Partly" }[l.furnished] || "—"], ["UTILITIES", { yes: "Included", some: "Some included", no: "Not included" }[l.utilities] || "—"]];
      const fy = y + 125, fw = (W - 120 - 36) / 4;
      facts.forEach(([a, b], i) => { const fx = 60 + i * (fw + 12); x.fillStyle = "#fff"; rr(x, fx, fy, fw, 108, 16); x.fill(); x.strokeStyle = "#E3E0D6"; x.lineWidth = 2; x.stroke(); x.fillStyle = GREY; x.font = "600 20px 'Work Sans', sans-serif"; x.fillText(a, fx + 18, fy + 38); x.fillStyle = NAVY; x.font = "800 27px Sora, sans-serif"; x.fillText(clip(b, 14), fx + 18, fy + 82); });
      const py = fy + 140, ph = 1560 - py - 20;
      const perks = [l.furnished === "yes" && "Fully furnished", l.utilities === "yes" && "Utilities included", l.permission === "approved" && "Landlord approved", l.deposit ? money(l.deposit) + " deposit" : "No deposit", "Tours in person or on video"].filter(Boolean);
      x.fillStyle = NAVY; x.font = "800 30px Sora, sans-serif"; x.fillText("Why you'll love it", 60, py + 36);
      x.font = "500 28px 'Work Sans', sans-serif"; x.fillStyle = "#33405F"; perks.slice(0, 5).forEach((p, i) => { x.fillStyle = ORANGE; x.beginPath(); x.arc(74, py + 82 + i * 44 - 8, 8, 0, 7); x.fill(); x.fillStyle = "#33405F"; x.fillText(p, 98, py + 82 + i * 44); });
      const extra = photos.slice(1, 3);
      extra.forEach((im, i) => cover(x, im, W - 60 - (extra.length - i) * 276 + (extra.length - i - 1) * 16, py, 260, Math.min(ph, 220), 16));
      x.fillStyle = NAVY; x.fillRect(0, 1560, W, 90);
      x.fillStyle = IVORY; x.font = "800 34px Sora, sans-serif"; x.fillText("Message me to book a tour", 60, 1618);
      x.fillStyle = ORANGE; rr(x, W - 60 - 560, 1578, 560, 56, 14); x.fill(); x.fillStyle = NAVY; x.font = "700 24px 'Work Sans', sans-serif"; x.textAlign = "center"; x.fillText(url, W - 60 - 280, 1614); x.textAlign = "left";
    } else if (kind === "story") {
      x.fillStyle = IVORY; rr(x, 64, 150, 520, 150, 30); x.fill(); if (logo) x.drawImage(logo, 84, 160, 480, 130);
      x.fillStyle = IVORY; x.font = "800 88px Sora, sans-serif"; let y = wrapText(x, "Need a place near " + clip(l.school || c.city, 26) + "?", 64, 420, W - 128, 96, 2);
      x.fillStyle = ORANGE; y = wrapText(x, "Take over my lease.", 64, y + 6, W - 128, 96, 1);
      hero(64, y + 30, W - 128, 560, 30); priceTag(-64, y + 30 + 560 - 56, 1.2);
      const ly = y + 30 + 560 + 86;
      x.fillStyle = IVORY; rr(x, 64, ly, W - 128, 120, 60); x.fill(); pin(96, ly + 30, 2.4, NAVY); x.fillStyle = NAVY; x.font = "700 38px 'Work Sans', sans-serif"; x.fillText(clip(l.area, 34), 170, ly + 56); x.font = "500 32px 'Work Sans', sans-serif"; x.fillText(c.city + (c.st ? ", " + c.st : ""), 170, ly + 98);
      x.fillStyle = IVORY; x.font = "500 40px 'Work Sans', sans-serif"; const ty = wrapText(x, bed + " · " + dateText(l.startDate) + " to " + dateText(l.endDate) + (l.furnished === "yes" ? " · Furnished" : "") + (l.utilities === "yes" ? " · Utilities included" : ""), 64, ly + 190, W - 128, 54, 3);
      x.fillStyle = ORANGE; rr(x, 64, 1690, W - 128, 150, 28); x.fill(); x.fillStyle = NAVY; x.textAlign = "center"; x.font = "800 48px Sora, sans-serif"; x.fillText("Tours this week. Message me.", W / 2, 1758); x.font = "700 30px 'Work Sans', sans-serif"; x.fillText(url, W / 2, 1808); x.textAlign = "left";
    } else {
      hero(0, 0, W, 520, 0); priceTag(48, 470, 1);
      x.fillStyle = NAVY; x.font = "800 52px Sora, sans-serif"; let y = wrapText(x, l.title, 48, 640, W - 96, 60, 2);
      pin(40, y + 2, 1.5, ORANGE); x.fillStyle = NAVY; x.font = "600 30px 'Work Sans', sans-serif"; x.fillText(clip(where, 54), 90, y + 32);
      x.fillStyle = GREY; x.font = "500 28px 'Work Sans', sans-serif"; x.fillText(bed + " · " + dateText(l.startDate) + " to " + dateText(l.endDate), 48, y + 80);
      x.fillStyle = NAVY; x.fillRect(0, H - 110, W, 110); x.fillStyle = IVORY; x.font = "800 32px Sora, sans-serif"; x.fillText("Message me to book a tour", 48, H - 50);
      x.fillStyle = ORANGE; x.font = "700 24px 'Work Sans', sans-serif"; x.textAlign = "right"; x.fillText(url, W - 48, H - 50); x.textAlign = "left";
      if (logo) { x.fillStyle = IVORY; rr(x, W - 48 - 250, 36, 250, 84, 16); x.fill(); x.drawImage(logo, W - 48 - 238, 42, 226, 72); }
    }
    flyers[kind] = cv;
    return cv;
  };
  const paintFlyers = async () => {
    for (const box of $$("[data-flyer]", dash)) {
      const kind = box.dataset.flyer;
      try {
        const cv = await drawFlyer(kind);
        const img = new Image(); img.alt = kind + " preview"; img.src = cv.toDataURL("image/png"); img.className = "wr-flyer-img";
        box.replaceChildren(img);
      } catch { box.textContent = "We couldn't build this image. Try again."; }
    }
  };
  const download = async (kind) => {
    const cv = await drawFlyer(kind);
    cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "my-sublease-" + kind + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  };
  const printFlyer = async (kind) => {
    const cv = await drawFlyer(kind);
    cv.toBlob((b) => { const u = URL.createObjectURL(b); const w = window.open(u, "_blank"); if (!w) { say($("#slActMsg"), "Allow pop-ups to print, or download the image and print it."); } });
  };

  // ---------- paint ----------
  const paint = () => {
    dash.innerHTML = `<div class="wr">${commandCenter()}${banners()}<div class="wr-shell">${nav()}<main class="wr-main" id="wrMain" tabindex="-1">${center()}</main></div></div>`;
    $$("[data-w]", dash).forEach((e) => { e.style.width = Math.max(0, Math.min(100, Number(e.dataset.w))) + "%"; });
    $$("[data-ring]", dash).forEach((e) => e.style.setProperty("--pd", Math.max(0, Math.min(100, Number(e.dataset.ring))) + "%"));
    wireShare(dash);
    if (view === "marketing" && mktTab === "flyers") paintFlyers();
    const cc = $(".wr-cc", dash), mn = $(".wr-mini", dash);
    if (cc && mn) { const upd = () => { mn.hidden = cc.getBoundingClientRect().bottom > 0; }; if (scrollFn) window.removeEventListener("scroll", scrollFn); scrollFn = upd; window.addEventListener("scroll", upd, { passive: true }); upd(); }
  };
  const go = (to, scroll = true) => {
    if (to.startsWith("plat:")) { view = "platforms"; sub = to.slice(5); platKind = "all"; }
    else if (to === "ll") view = "landlord";
    else if (to === "mkt:flyer") { view = "marketing"; mktTab = "flyers"; }
    else if (to === "mkt:posts") { view = "marketing"; mktTab = "posts"; }
    else if (to === "leads") view = "leads";
    else if (to === "msgs") view = "messages";
    else if (to.startsWith("help:")) { view = "help"; helpTab = to.slice(5); }
    else if (to === "listing:edit") { view = "listing"; }
    else if (to === "listing:share") { view = "listing"; }
    store("astropro.wr.view." + id, view);
    paint();
    if (to === "listing:edit") $("[data-edit]", dash)?.click();
    if (scroll) { const m = $("#wrMain", dash); (to.startsWith("plat:") ? $("#wrPlat", dash) || m : m)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  // ---------- events (one delegated listener) ----------
  const keyText = (key) => edits[key] ?? texts[key] ?? "";
  dash.addEventListener("click", async (ev) => {
    const t = ev.target.closest("button, a, summary");
    if (!t || !dash.contains(t)) return;
    const d = t.dataset;
    if (d.nav) { view = d.nav; sub = null; if (d.mkt) mktTab = d.mkt; store("astropro.wr.view." + id, view); paint(); $("#wrMain", dash)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (d.top !== undefined) return window.scrollTo({ top: 0, behavior: "smooth" });
    if (d.go) return go(d.go);
    if (d.kind) { platKind = d.kind; sub = null; paint(); return; }
    if (d.plat) { sub = d.plat; paint(); $("#wrPlat", dash)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (d.mkt) { mktTab = d.mkt; paint(); return; }
    if (d.help) { helpTab = d.help; paint(); return; }
    if (d.mode) { d.mode === "manual" ? doneSet.add("ll_manual") : doneSet.delete("ll_manual"); persist(); paint(); return; }
    if (d.togglePlan !== undefined) { showPlan = !showPlan; paint(); return; }
    if (d.dl) return download(d.dl);
    if (d.print) return printFlyer(d.print);
    if (d.lf) { if (d.lf === "+") { for (let i = 1; i <= 150; i++) if (!doneSet.has("lf" + i)) { doneSet.add("lf" + i); break; } } else { for (let i = 150; i >= 1; i--) if (doneSet.has("lf" + i)) { doneSet.delete("lf" + i); break; } } persist(); paint(); return; }
    if (d.open) {
      const p = plats.find((x) => x.id === d.open); if (!p) return;
      pingShare(k.url);
      const copied = copyText(keyText(p.copy));
      window.open(p.url, "_blank", "noopener");
      const m = $("[data-open-msg]", dash);
      copied.then((ok) => say(m, ok ? "Copied! Paste it into the page that just opened, add your photos, and post. Then tick 'I posted here'." : "Couldn't copy automatically. Tap Copy the text only, then paste it into the site.", ok));
      return;
    }
    if (d.copy) { const ok = await copyText(d.copy === "url" ? k.url : keyText(d.copy)); t.textContent = ok ? "Copied" : "Select and copy"; return; }
    if (t.matches("[data-mailto]")) { ev.preventDefault(); const tpl = llTemplates(l, k).find((x) => x.id === d.mailto); const body = edits["ll_" + d.mailto] ?? tpl.body; location.href = "mailto:?subject=" + encodeURIComponent(tpl.subject) + "&body=" + encodeURIComponent(body); return; }
    if (d.llsend) {
      const tpl = llTemplates(l, k).find((x) => x.id === d.llsend); const msg = $(`[data-llmsg="${d.llsend}"]`, dash); t.disabled = true;
      try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "landlord-send", subject: tpl.subject, text: edits["ll_" + d.llsend] ?? tpl.body }) }); say(msg, "Sent to your landlord. Replies come to you.", true); setTimeout(async () => { await load(); paint(); }, 1500); } catch (e) { t.disabled = false; say(msg, e.message); }
      return;
    }
    if (t.matches("[data-ll-change]")) { const f = $("#slLLForm", dash); if (f) f.hidden = false; return; }
    if (t.matches("[data-ll-stop]")) { try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "landlord-stop" }) }); await load(); paint(); } catch {} return; }
    if (t.matches("[data-signout]")) { store("astropro.sublease." + id, undefined); store("astropro.sublease.last", undefined); location.replace("sublease-manage.html?signedout=1"); return; }
    if (t.matches("[data-copy-private]")) { const ok = await copyText(location.origin + "/sublease-manage.html#" + id + "." + saved); t.textContent = ok ? "Link copied" : "Copy from the address bar"; return; }
    if (t.matches("[data-renew]")) { t.disabled = true; try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "renew" }) }); await load(); paint(); } catch (e) { t.disabled = false; say($("#slRenewMsg"), e.message); } return; }
    if (t.matches("[data-status]")) { try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ status: d.status }) }); await load(); paint(); } catch (e) { say($("#slActMsg"), e.message); } return; }
    if (t.matches("[data-delete]")) {
      if (!t.dataset.sure) { t.dataset.sure = "1"; t.textContent = "Click again to delete forever"; return; }
      try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "delete" }) }); store("astropro.sublease." + id, undefined); store("astropro.sublease.last", undefined); dash.innerHTML = `<div class="empty-state"><h2>Your listing was deleted.</h2><p>It's gone from the site, along with its photos and messages.</p><p><a class="btn btn-primary" href="sublease-war-room.html">Start a new listing</a></p></div>`; } catch (e) { say($("#slActMsg"), e.message); }
      return;
    }
    if (t.matches("[data-edit]")) editForm(t);
  });
  dash.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.task) { el.checked ? doneSet.add(el.dataset.task) : doneSet.delete(el.dataset.task); persist(); paint(); }
    if (el.dataset.posted) { el.checked ? doneSet.add("p_" + el.dataset.posted) : doneSet.delete("p_" + el.dataset.posted); persist(); paint(); $("#wrPlat", dash)?.scrollIntoView({ block: "nearest" }); }
  });
  dash.addEventListener("input", (ev) => { const t = ev.target; if (t.dataset && t.dataset.kit) edits[t.dataset.kit] = t.value; });
  dash.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (f.id === "slLLForm") {
      ev.preventDefault(); const b = $("button[type=submit]", f); b.disabled = true;
      try { const r = await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "landlord", ...Object.fromEntries(new FormData(f).entries()) }) }); say($("#slLLMsg"), r.sentNow ? "Sent! Your landlord has your first check-in. We'll follow up weekly." : "Saved. Your first check-in goes out within the hour.", true); doneSet.delete("ll_manual"); setTimeout(async () => { await load(); paint(); }, 1600); } catch (e) { b.disabled = false; say($("#slLLMsg"), e.message); }
    }
    if (f.id === "slOutForm") {
      ev.preventDefault(); const v = Object.fromEntries(new FormData(f).entries());
      try { await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "outcome", foundVia: v.foundVia, quote: v.quote, shareOk: v.shareOk === "on" }) }); await load(); paint(); } catch (e) { say($("#slOutMsg"), e.message); }
    }
  });
  const editForm = (btn) => {
    if ($("#slEditForm")) return;
    const f = (name, label, val, type = "text", extra = "") => `<div class="field"><label for="ed_${name}">${label}</label><input id="ed_${name}" name="${name}" type="${type}" value="${esc(val ?? "")}" ${extra}></div>`;
    const sel = (name, label, val, opts) => `<div class="field"><label for="ed_${name}">${label}</label><select id="ed_${name}" name="${name}">${opts.map(([v, t]) => `<option value="${v}"${v === val ? " selected" : ""}>${t}</option>`).join("")}</select></div>`;
    const form = document.createElement("form");
    form.id = "slEditForm"; form.className = "sl-form callout"; form.noValidate = true;
    form.innerHTML = `<h3>Edit your listing</h3>${f("title", "Title", l.title, "text", 'maxlength="120"')}${f("area", "Neighborhood or building", l.area, "text", 'maxlength="150"')}${f("rent", "Monthly rent ($)", l.rent, "number", 'min="1"')}${f("deposit", "Deposit ($, optional)", l.deposit || "", "number", 'min="0"')}${f("startDate", "Move-in", l.startDate, "date")}${f("endDate", "Move-out", l.endDate, "date")}${f("bedrooms", "Bedrooms", l.bedrooms, "number", 'min="0"')}${f("bathrooms", "Bathrooms", l.bathrooms, "number", 'min="0.5" step="0.5"')}${sel("furnished", "Furnished", l.furnished, [["yes", "Yes"], ["no", "No"], ["partly", "Partly"]])}${sel("utilities", "Utilities", l.utilities, [["yes", "Included"], ["some", "Some included"], ["no", "Not included"]])}<div class="field"><label for="ed_photos">Replace photos (optional, up to 4)</label><input id="ed_photos" type="file" accept="image/*" multiple><p class="fineprint">Choosing new photos replaces all your current ones.</p></div><div class="field"><label for="ed_description">Description</label><textarea id="ed_description" name="description" rows="8" maxlength="2000">${esc(l.description)}</textarea></div><p class="sl-msg" id="slEditMsg" role="alert" hidden></p><button class="btn btn-primary" type="submit">Save changes</button> <button class="btn btn-ghost" type="button" data-edit-cancel>Cancel</button>`;
    btn.closest(".wr-panel").appendChild(form);
    $("[data-edit-cancel]", form).addEventListener("click", () => form.remove());
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); e.stopPropagation();
      const fields = Object.fromEntries(new FormData(form).entries());
      try {
        const files = [...($("#ed_photos", form)?.files || [])].slice(0, 4);
        if (files.length) { say($("#slEditMsg"), "Saving your photos..."); const sh = []; for (const x of files) sh.push(await shrink(x)); await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "photos", photos: sh }) }); }
        await api("/manage/" + id, { method: "POST", headers, body: JSON.stringify({ action: "edit", fields }) });
        Object.keys(flyers).forEach((x) => delete flyers[x]);
        await load(); paint();
      } catch (err) { say($("#slEditMsg"), err.message); }
    });
  };

  if (await load()) paint();
}
