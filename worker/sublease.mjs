// Sublease War Room API. Self-contained; index.mjs passes in its shared helpers.
const ID = /^[a-z0-9]{12}$/;
const MARKET = /^[a-z0-9-]{2,60}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const PHOTO = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO = 450000;
const LIVE_DAYS = 60;
const EVENTS = ["view","calc_used","preview_open","cta_click","pay_click","form_open","form_submit"];
export const PAYPAL_DEFAULT_BUSINESS = "michael.squinn8989@gmail.com";
export const PAYPAL_DEFAULT_PRICE = 39;
// Decide whether a verified PayPal IPN pays for a listing. Pure so it can be tested.
export function ipnDecision(p, { business, price }) {
  const get = (k) => (p.get(k) || "").trim();
  if (get("payment_status") !== "Completed") return { ok: false, why: "not completed" };
  if (get("receiver_email").toLowerCase() !== business.toLowerCase() && get("business").toLowerCase() !== business.toLowerCase())
    return { ok: false, why: "wrong receiver" };
  if (get("mc_currency") !== "USD") return { ok: false, why: "wrong currency" };
  if (!(Number(get("mc_gross")) >= price)) return { ok: false, why: "amount too low" };
  const id = get("item_number");
  if (!ID.test(id)) return { ok: false, why: "no listing" };
  const txn = get("txn_id");
  if (!txn || txn.length > 40) return { ok: false, why: "no txn" };
  return { ok: true, id, txn };
}
export const PERMISSION = ["approved", "pending", "not-asked", "not-allowed"];
const SCAM =
  /(wire transfer|western union|gift ?card|bitcoin|crypto|cash ?app|venmo first|zelle first|send (the )?deposit|out of the (country|state)|overseas|mail (you )?the keys|ship the keys|before (seeing|viewing)|without (seeing|viewing)|paypal friends)/i;

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const long = (v, max) =>
  typeof v === "string"
    ? v.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max)
    : "";
const rand = (bytes) =>
  [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const slugId = () =>
  [...crypto.getRandomValues(new Uint8Array(12))]
    .map((x) => "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36])
    .join("");
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });

export function validateListing(raw, opts = {}) {
  if (!raw || typeof raw !== "object") throw fail("Send listing details.");
  const out = {
    market: clean(raw.market, 60).toLowerCase(),
    marketName: clean(raw.marketName, 150),
    school: clean(raw.school, 150),
    area: clean(raw.area, 150),
    title: clean(raw.title, 120),
    description: long(raw.description, 2000),
    ownerName: clean(raw.ownerName, 100),
    ownerEmail: clean(raw.ownerEmail, 254).toLowerCase(),
    ownerPhone: clean(raw.ownerPhone, 40),
    permission: clean(raw.permission, 20),
    furnished: clean(raw.furnished, 10),
    utilities: clean(raw.utilities, 10),
    startDate: clean(raw.startDate, 10),
    endDate: clean(raw.endDate, 10),
    rent: Math.round(Number(raw.rent)),
    deposit: raw.deposit === "" || raw.deposit == null ? 0 : Math.round(Number(raw.deposit)),
    bedrooms: Math.round(Number(raw.bedrooms)),
    bathrooms: Number(raw.bathrooms),
    type: clean(raw.type, 12),
  };
  if (!MARKET.test(out.market) || !out.marketName)
    throw fail("Choose your campus market.");
  if (!out.area) throw fail("Add the neighborhood or building name.");
  if (!out.title) throw fail("Add a short title for your listing.");
  if (out.description.length < 20)
    throw fail("Describe your place in at least a couple of sentences.");
  if (!out.ownerName) throw fail("Add your name.");
  if (!EMAIL.test(out.ownerEmail)) throw fail("Add a valid email address.");
  if (!["sublease", "relet", "assignment"].includes(out.type))
    throw fail("Choose sublease, relet or lease assignment.");
  if (!PERMISSION.includes(out.permission))
    throw fail("Tell us where you are with landlord permission.");
  if (out.permission === "not-allowed")
    throw fail(
      "Your lease says subleasing isn't allowed. Ask your landlord about a relet or lease-break program before you list.",
    );
  if (!["yes", "no", "partly"].includes(out.furnished))
    throw fail("Say whether the place is furnished.");
  if (!["yes", "no", "some"].includes(out.utilities))
    throw fail("Say whether utilities are included.");
  if (!DATE.test(out.startDate) || !DATE.test(out.endDate))
    throw fail("Choose move-in and move-out dates.");
  if (out.endDate <= out.startDate)
    throw fail("Move-out must be after move-in.");
  if (!Number.isFinite(out.rent) || out.rent < 1 || out.rent > 20000)
    throw fail("Enter the monthly rent.");
  if (!Number.isFinite(out.deposit) || out.deposit < 0 || out.deposit > 20000)
    throw fail("Enter a valid deposit, or leave it blank.");
  if (!Number.isInteger(out.bedrooms) || out.bedrooms < 0 || out.bedrooms > 10)
    throw fail("Enter the number of bedrooms (0 for a studio).");
  if (!Number.isFinite(out.bathrooms) || out.bathrooms < 0.5 || out.bathrooms > 10)
    throw fail("Enter the number of bathrooms.");
  if (opts.keepPhotos) return { data: out, photos: [] };
  const photos = Array.isArray(raw.photos) ? raw.photos.slice(0, 4) : [];
  for (const p of photos)
    if (typeof p !== "string" || !PHOTO.test(p) || p.length > MAX_PHOTO)
      throw fail("Photos must be JPEG images under about 330 KB each.");
  if (!photos.length) throw fail("Add at least one photo of the place.");
  if (raw.consent !== true)
    throw fail("Please confirm you have the right to list this place.");
  return { data: out, photos };
}

export function validateLead(raw) {
  const out = {
    listingId: clean(raw?.listingId, 12),
    name: clean(raw?.name, 100),
    email: clean(raw?.email, 254).toLowerCase(),
    phone: clean(raw?.phone, 40),
    message: long(raw?.message, 1500),
  };
  if (!ID.test(out.listingId)) throw fail("That listing was not found.", 404);
  if (!out.name) throw fail("Add your name.");
  if (!EMAIL.test(out.email)) throw fail("Add a valid email address.");
  if (out.message.length < 5) throw fail("Add a short message.");
  out.flagged = SCAM.test(out.message) ? 1 : 0;
  return out;
}

const publicListing = (row, photoCount) => {
  const d = JSON.parse(row.data_json);
  return {
    id: row.id,
    status: row.status,
    market: row.market,
    marketName: row.market_name,
    school: d.school,
    area: d.area,
    title: d.title,
    description: d.description,
    type: d.type,
    rent: d.rent,
    deposit: d.deposit,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    furnished: d.furnished,
    utilities: d.utilities,
    startDate: d.startDate,
    endDate: d.endDate,
    permission: d.permission,
    photos: photoCount,
    createdAt: row.created_at,
  };
};

async function ownerRow(request, env, h, id) {
  const token = request.headers.get("x-manage-token") || "";
  if (!ID.test(id) || token.length < 32) return null;
  const row = await env.DB.prepare("SELECT * FROM sublease_listings WHERE id=?")
    .bind(id)
    .first();
  if (!row) return null;
  return (await h.digest(token)) === row.token_hash ? row : null;
}
const photoCounts = async (env, ids) => {
  if (!ids.length) return {};
  const { results } = await env.DB.prepare(
    `SELECT listing_id, COUNT(*) c FROM sublease_photos WHERE listing_id IN (${ids.map(() => "?").join(",")}) GROUP BY listing_id`,
  )
    .bind(...ids)
    .all();
  return Object.fromEntries(results.map((r) => [r.listing_id, r.c]));
};

export async function handleSublease(request, env, path, h) {
  const { json } = h;
  if (!env.DB)
    return json({ error: "The Sublease War Room is temporarily unavailable." }, 503);
  const now = new Date().toISOString();
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);

  // PayPal Instant Payment Notification: verified server-to-server, then extends the listing.
  if (path === "/api/sublease/paypal-ipn" && request.method === "POST") {
    const raw = await request.text();
    if (raw.length > 8000) return new Response("too large", { status: 413 });
    const mark = (name) =>
      env.DB.prepare("INSERT INTO sublease_events (day,name,n) VALUES (?,?,1) ON CONFLICT(day,name) DO UPDATE SET n=n+1").bind(now.slice(0, 10), name).run().catch(() => null);
    await mark("ipn_received");
    const verify = await (h.fetch || fetch)("https://ipnpb.paypal.com/cgi-bin/webscr", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "AstroPro-IPN" },
      body: "cmd=_notify-validate&" + raw,
    }).catch(() => null);
    if (!verify || (await verify.text()).trim() !== "VERIFIED") {
      await mark("ipn_unverified");
      return new Response("ignored");
    }
    const d = ipnDecision(new URLSearchParams(raw), {
      business: env.PAYPAL_BUSINESS_EMAIL || PAYPAL_DEFAULT_BUSINESS,
      price: Number(env.SUBLEASE_PRICE || PAYPAL_DEFAULT_PRICE),
    });
    if (!d.ok) {
      await mark("ipn_rejected");
      return new Response("ignored");
    }
    const expires = new Date(Date.now() + LIVE_DAYS * 86400000).toISOString();
    const r = await env.DB.prepare(
      "UPDATE sublease_listings SET status=CASE WHEN status='filled' THEN status ELSE 'live' END, paid_at=?, expires_at=?, txn_id=?, updated_at=? WHERE id=? AND txn_id IS NULL",
    )
      .bind(now, expires, d.txn, now, d.id)
      .run()
      .catch(() => null);
    let hit = r?.meta?.changes === 1 ? d.id : null;
    if (!hit) {
      const r2 = await env.DB.prepare(
        "UPDATE sublease_listings SET status=CASE WHEN status='filled' THEN status ELSE 'live' END, paid_at=?, expires_at=?, txn_id=?, updated_at=? WHERE pay_code=? AND txn_id IS NULL",
      )
        .bind(now, expires, d.txn, now, d.id)
        .run()
        .catch(() => null);
      if (r2?.meta?.changes === 1) hit = d.id;
    }
    if (hit) {
      await mark("ipn_listing_live");
      await h.notify?.("Sublease War Room payment received (" + d.id + ")", "PayPal payment " + d.txn + " confirmed for listing " + d.id + ". It is live for " + LIVE_DAYS + " days.");
    } else {
      const exists = await env.DB.prepare("SELECT 1 x FROM sublease_listings WHERE id=? OR pay_code=?").bind(d.id, d.id).first().catch(() => null);
      if (!exists) {
        const c = await env.DB.prepare("INSERT OR IGNORE INTO sublease_credits (code,txn_id,paid_at) VALUES (?,?,?)")
          .bind(d.id, d.txn, now)
          .run()
          .catch(() => null);
        if (c?.meta?.changes === 1) await mark("ipn_credited");
        if (c?.meta?.changes === 1) {
          const it = await env.DB.prepare("SELECT email FROM sublease_intents WHERE code=?").bind(d.id).first().catch(() => null);
          const link = SITE(env) + "/sublease-war-room.html?code=" + d.id + "#start";
          const sent = it?.email ? await sendStudent(h, it.email, "Payment received: finish your Sublease War Room listing", ["Thank you! Your $39 onboarding payment went through.", "Next step: fill out your listing (about 5 minutes). We'll build your ready-to-post ads and your private dashboard right after."], "Fill out my listing", link) : false;
          await h.notify?.(
            "Sublease War Room payment received" + (it?.email ? " from " + it.email : ""),
            "PayPal payment " + d.txn + " confirmed (pay code " + d.id + ")." + (it?.email ? "\nStudent: " + it.email + (sent ? " (we emailed them the form link)" : " (we could NOT email them, send them this link: " + link + ")") : "\nWe have no email for this payer. Form link: " + link) + "\n\nThey can now fill out the onboarding form.",
          );
        }
      }
    }
    return new Response("ok");
  }

  // Anonymous funnel counts (no personal data): one counter per day and step.
  if (path === "/api/sublease/event" && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Not allowed." }, 403);
    const raw = await h.readJson(request).catch(() => ({}));
    if (!EVENTS.includes(raw.name)) return json({ error: "Unknown event." }, 400);
    await env.DB.prepare("INSERT INTO sublease_events (day,name,n) VALUES (?,?,1) ON CONFLICT(day,name) DO UPDATE SET n=n+1")
      .bind(now.slice(0, 10), raw.name)
      .run()
      .catch(() => null);
    return json({ ok: true });
  }

  // Owner taps this link (from an alert email) after seeing the payment in PayPal: records the payment and emails the student their form link.
  if (path === "/api/sublease/owner-unlock" && request.method === "GET") {
    const code = clean(new URL(request.url).searchParams.get("code"), 20).toLowerCase(),
      t = clean(new URL(request.url).searchParams.get("t"), 64);
    const page = (msg, status = 200) => new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;max-width:480px;margin:48px auto;padding:0 20px;color:#172447"><h2>' + htmlEsc(msg[0]) + "</h2><p>" + htmlEsc(msg[1]) + "</p>", { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
    if (!ID.test(code) || !t || t !== (await unlockToken(env, code))) return page(["Link not valid", "This unlock link is wrong or expired."], 403);
    const it = await env.DB.prepare("SELECT email FROM sublease_intents WHERE code=?").bind(code).first();
    await env.DB.prepare("INSERT OR IGNORE INTO sublease_credits (code,txn_id,paid_at) VALUES (?,?,?)").bind(code, "MANUAL-" + code, now).run();
    const link = SITE(env) + "/sublease-war-room.html?code=" + code + "#start";
    const sent = it?.email ? await sendStudent(h, it.email, "Payment received: finish your Sublease War Room listing", ["Thank you! Your $39 onboarding payment went through.", "Next step: fill out your listing (about 5 minutes). We'll build your ready-to-post ads and your private dashboard right after."], "Fill out my listing", link) : false;
    return page(["Unlocked", it?.email ? (sent ? "Their form is unlocked and we emailed " + it.email + " the link." : "Their form is unlocked, but the email could not be sent. Send them: " + link) : "Their form is unlocked. We have no email for them. Link: " + link]);
  }

  // Checkout started: capture the email so the form link can always reach the student.
  if (path === "/api/sublease/intent" && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Not allowed." }, 403);
    const raw = await h.readJson(request).catch(() => ({}));
    const code = clean(raw.code, 20).toLowerCase(),
      email = clean(raw.email, 254).toLowerCase();
    if (!ID.test(code) || !EMAIL_RE.test(email)) return json({ error: "Enter a valid email so we can send your link." }, 400);
    if (!(await h.quota(env.DB, "sublease-intent:" + ip + ":" + day, 20, Date.now() + 86400000)))
      return json({ error: "Too many attempts. Try again tomorrow." }, 429);
    const existing = await env.DB.prepare("SELECT 1 x FROM sublease_intents WHERE code=?").bind(code).first();
    await env.DB.prepare("INSERT INTO sublease_intents (code,email,created_at) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET email=excluded.email").bind(code, email, now).run();
    if (!existing)
      await h.notify?.(
        "Sublease War Room: " + email + " is heading to PayPal",
        "A student entered " + email + " and clicked Pay.\nPay code: " + code + "\n\nYou will get a payment email if PayPal confirms it. If you see a $39 payment in PayPal with item number " + code + " and no payment email follows, tap this to unlock their form and email them the link:\n" + (await unlockUrl(env, code)),
      );
    return json({ ok: true });
  }

  // Sign in by email: we send a fresh private link for each listing (or the form link if they paid but never filled it).
  if (path === "/api/sublease/signin" && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Not allowed." }, 403);
    const raw = await h.readJson(request).catch(() => ({}));
    const email = clean(raw.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ error: "Enter the email you used for your listing." }, 400);
    if (!(await h.quota(env.DB, "sublease-signin:" + ip + ":" + day, 8, Date.now() + 86400000)) || !(await h.quota(env.DB, "sublease-signin-e:" + email + ":" + day, 4, Date.now() + 86400000)))
      return json({ error: "Too many sign-in requests. Try again tomorrow." }, 429);
    const origin = SITE(env);
    const { results: rows } = await env.DB.prepare("SELECT id, json_extract(data_json,'$.title') title FROM sublease_listings WHERE owner_email=? ORDER BY created_at DESC LIMIT 5").bind(email).all();
    const links = [];
    for (const r of rows) {
      const token = rand(24);
      await env.DB.prepare("UPDATE sublease_listings SET token_hash=? WHERE id=?").bind(await h.digest(token), r.id).run();
      links.push({ title: r.title, url: origin + "/sublease-manage.html#" + r.id + "." + token });
    }
    let emailed = false,
      found = links.length > 0;
    if (links.length) {
      emailed = await sendStudent(h, email, "Your Sublease War Room sign-in link", ["Here is your private link to your Sublease War Room" + (links.length > 1 ? " (your most recent listing first; the others are below)." : "."), "Anyone with this link can open your dashboard, so don't forward it. Opening a new link signs out older ones.", ...links.slice(1).map((l) => l.title + ": " + l.url)], "Open my Sublease War Room", links[0].url);
    } else {
      const it = await env.DB.prepare("SELECT i.code FROM sublease_intents i JOIN sublease_credits c ON c.code=i.code WHERE i.email=? AND c.listing_id IS NULL ORDER BY i.created_at DESC LIMIT 1").bind(email).first();
      if (it) found = true;
      if (it) emailed = await sendStudent(h, email, "Finish your Sublease War Room listing", ["Your payment is in and your form is ready."], "Finish my listing", origin + "/sublease-war-room.html?code=" + it.code + "#start");
    }
    if (found && !emailed)
      await h.notify?.("Sublease War Room sign-in request (email could not be sent)", "A student asked for a sign-in link: " + email + (links.length ? "\n\nSend them this link:\n" + links[0].url : "\n\nNo listing found for that email."));
    await bump(env, "signin_request");
    return json({ ok: true });
  }

  // Admin: list and activate (after payment is confirmed).
  if (path.startsWith("/api/admin/sublease")) {
    if (!(await h.authorize(request, env)))
      return json({ error: "Private access key required." }, 401, {
        "www-authenticate": "Bearer",
      });
    if (path === "/api/admin/sublease/list" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id,status,market_name,owner_email,created_at,paid_at,expires_at,json_extract(data_json,'$.title') title FROM sublease_listings ORDER BY created_at DESC LIMIT 100",
      ).all();
      return json({ items: results });
    }
    if (path === "/api/admin/sublease/stats" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT day,name,n FROM sublease_events WHERE day >= date('now','-30 day') ORDER BY day DESC").all();
      const byDay = {};
      for (const r of results) (byDay[r.day] ||= {})[r.name] = r.n;
      return json({ events: EVENTS, days: byDay });
    }
    if (path === "/api/admin/sublease/activate" && request.method === "POST") {
      const body = await h.readJson(request);
      const id = clean(body.id, 12);
      if (!ID.test(id)) return json({ error: "Invalid listing id." }, 400);
      const expires = new Date(Date.now() + LIVE_DAYS * 86400000).toISOString();
      const r = await env.DB.prepare(
        "UPDATE sublease_listings SET status='live', paid_at=COALESCE(paid_at,?), expires_at=?, updated_at=? WHERE id=?",
      )
        .bind(now, expires, now, id)
        .run();
      return json({ ok: r.meta.changes === 1, expiresAt: expires });
    }
    return json({ error: "Endpoint not found." }, 404);
  }

  // Public photo
  let m = path.match(/^\/api\/sublease\/photo\/([a-z0-9]{12})\/(\d)$/);
  if (m && request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT p.data FROM sublease_photos p JOIN sublease_listings l ON l.id=p.listing_id WHERE p.listing_id=? AND p.n=? AND l.status IN ('live','filled','paused','expired')",
    )
      .bind(m[1], Number(m[2]))
      .first();
    if (!row) return new Response("Not found", { status: 404 });
    const bin = Uint8Array.from(atob(row.data.split(",")[1]), (c) => c.charCodeAt(0));
    return new Response(bin, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  // Student-created markets (schools we did not list). Only live listings count.
  if (path === "/api/sublease/markets" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT market, MAX(market_name) name, MAX(json_extract(data_json,'$.school')) school, COUNT(*) n FROM sublease_listings WHERE status='live' AND market LIKE 'c-%' AND (expires_at IS NULL OR expires_at > ?) GROUP BY market ORDER BY name LIMIT 200",
    ).bind(now).all();
    return json({ items: results.map((r) => ({ id: r.market, name: r.name, school: r.school, n: r.n })) });
  }

  // Public browse
  if (path === "/api/sublease/listings" && request.method === "GET") {
    const market = clean(new URL(request.url).searchParams.get("market") || "", 60);
    const args = [now];
    let sql =
      "SELECT * FROM sublease_listings WHERE status='live' AND (expires_at IS NULL OR expires_at > ?)";
    if (market) {
      if (!MARKET.test(market)) return json({ error: "Invalid market." }, 400);
      sql += " AND market=?";
      args.push(market);
    }
    sql += " ORDER BY created_at DESC LIMIT 60";
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    const counts = await photoCounts(env, results.map((r) => r.id));
    return json({ items: results.map((r) => publicListing(r, counts[r.id] || 0)) });
  }

  m = path.match(/^\/api\/sublease\/listings\/([a-z0-9]{12})$/);
  if (m && request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT * FROM sublease_listings WHERE id=? AND (status='filled' OR (status='live' AND (expires_at IS NULL OR expires_at > ?)))",
    )
      .bind(m[1], now)
      .first();
    if (!row) return json({ error: "That listing is no longer available." }, 404);
    await env.DB.prepare("UPDATE sublease_listings SET views=views+1 WHERE id=?").bind(row.id).run().catch(() => {});
    const counts = await photoCounts(env, [row.id]);
    return json({ listing: publicListing(row, counts[row.id] || 0) });
  }

  m = path.match(/^\/api\/sublease\/credit\/([a-z0-9]{12})$/);
  if (m && request.method === "GET") {
    const c = await env.DB.prepare("SELECT listing_id FROM sublease_credits WHERE code=?").bind(m[1]).first();
    return json({ paid: !!c, used: !!(c && c.listing_id) });
  }

  // Everything below mutates or reads private data.
  if (path === "/api/sublease/listings" && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Send this from the Sublease War Room." }, 403);
    const raw = await h.readJson(request);
    if (typeof raw.website === "string" && raw.website.trim())
      return json({ error: "We could not accept that request." }, 400);
    const { data, photos } = validateListing(raw);
    if (!(await h.quota(env.DB, "sublease-new:" + ip + ":" + day, 6, Date.now() + 86400000)))
      return json({ error: "Too many listings from this connection today." }, 429);
    const id = slugId(),
      token = rand(24);
    let paidCredit = null,
      payCode = null;
    if (typeof raw.payCode === "string" && raw.payCode) {
      if (!ID.test(raw.payCode)) throw fail("That payment code is not valid.");
      const used = await env.DB.prepare("SELECT 1 x FROM sublease_listings WHERE pay_code=? OR id=?").bind(raw.payCode, raw.payCode).first();
      if (used) throw fail("That payment was already used.", 409);
      const c = await env.DB.prepare("SELECT txn_id, listing_id FROM sublease_credits WHERE code=?").bind(raw.payCode).first();
      if (c && c.listing_id) throw fail("That payment was already used.", 409);
      if (c) {
        const claim = await env.DB.prepare("UPDATE sublease_credits SET listing_id=? WHERE code=? AND listing_id IS NULL").bind(id, raw.payCode).run();
        if (claim?.meta?.changes !== 1) throw fail("That payment was already used.", 409);
        paidCredit = c;
      } else {
        payCode = raw.payCode; // payment still being confirmed: the listing goes live the moment it is
      }
    }
    const expiresAt = paidCredit ? new Date(Date.now() + LIVE_DAYS * 86400000).toISOString() : null;
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO sublease_listings (id,token_hash,status,market,market_name,owner_email,data_json,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).bind(id, await h.digest(token), paidCredit ? "live" : "pending_payment", data.market, data.marketName, data.ownerEmail, JSON.stringify(data), now, now, expiresAt),
      ...(paidCredit ? [env.DB.prepare("UPDATE sublease_listings SET paid_at=?, txn_id=? WHERE id=?").bind(now, paidCredit.txn_id, id)] : payCode ? [env.DB.prepare("UPDATE sublease_listings SET pay_code=? WHERE id=?").bind(payCode, id)] : []),
      ...photos.map((p, i) =>
        env.DB.prepare("INSERT INTO sublease_photos (listing_id,n,data) VALUES (?,?,?)").bind(id, i, p),
      ),
    ]);
    await h.notify?.(
      (data.market.startsWith("c-") ? "NEW MARKET: " : "") + "New Sublease War Room listing — " + data.marketName + " (" + id + ")",
      "A student created a listing.\nReference: " + id + "\nMarket: " + data.marketName + "\nTitle: " + data.title + "\nRent: $" + data.rent + "/mo\nOwner: " + data.ownerName + " <" + data.ownerEmail + ">" + (paidCredit ? "\n\nPaid in advance. It is live for " + LIVE_DAYS + " days." : "\n\nIt is waiting for payment. A PayPal payment with item number " + id + " makes it live for " + LIVE_DAYS + " days automatically."),
    );
    const manageUrl = SITE(env) + "/sublease-manage.html#" + id + "." + token;
    const emailed = await sendStudent(
      h,
      data.ownerEmail,
      paidCredit ? "Your Sublease War Room is live" : "Your Sublease War Room listing is saved",
      [paidCredit ? "Your listing is live and your dashboard is ready. Your ready-to-post ads, platform checklist and message inbox are all inside." : "Your listing is saved. It goes live as soon as your payment is confirmed.", "This is your private link. Keep this email, because it's how you get back in. To get back in on any device, go to " + SITE(env) + "/sublease-manage.html, enter this email and we send you a fresh link. No password needed."],
      "Open my Sublease War Room",
      manageUrl,
    );
    return json({ ok: true, id, manageToken: token, live: !!paidCredit, emailed }, 201);
  }

  if (path === "/api/sublease/leads" && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Send this from the listing page." }, 403);
    const raw = await h.readJson(request);
    if (typeof raw.website === "string" && raw.website.trim())
      return json({ error: "We could not accept that request." }, 400);
    const lead = validateLead(raw);
    if (!(await h.quota(env.DB, "sublease-lead:" + ip + ":" + day, 15, Date.now() + 86400000)))
      return json({ error: "Too many messages from this connection today." }, 429);
    const live = await env.DB.prepare(
      "SELECT id FROM sublease_listings WHERE id=? AND status='live' AND (expires_at IS NULL OR expires_at > ?)",
    )
      .bind(lead.listingId, now)
      .first();
    if (!live) return json({ error: "That listing is no longer taking messages." }, 404);
    await env.DB.prepare(
      "INSERT INTO sublease_leads (id,listing_id,name,email,phone,message,flagged,created_at) VALUES (?,?,?,?,?,?,?,?)",
    )
      .bind(crypto.randomUUID(), lead.listingId, lead.name, lead.email, lead.phone, lead.message, lead.flagged, now)
      .run();
    return json({ ok: true }, 201);
  }

  m = path.match(/^\/api\/sublease\/manage\/([a-z0-9]{12})$/);
  if (m && request.method === "GET") {
    const row = await ownerRow(request, env, h, m[1]);
    if (!row) return json({ error: "That management link is not valid." }, 404);
    const counts = await photoCounts(env, [row.id]);
    const { results } = await env.DB.prepare(
      "SELECT id,name,email,phone,message,flagged,created_at FROM sublease_leads WHERE listing_id=? ORDER BY created_at DESC LIMIT 200",
    )
      .bind(row.id)
      .all();
    return json({
      listing: publicListing(row, counts[row.id] || 0),
      ownerName: JSON.parse(row.data_json).ownerName,
      ownerEmail: row.owner_email,
      views: row.views || 0,
      paidAt: row.paid_at,
      expiresAt: row.expires_at,
      leads: results,
    });
  }
  if (m && request.method === "POST") {
    if (!h.isSameOrigin(request)) return json({ error: "Send this from your dashboard." }, 403);
    const row = await ownerRow(request, env, h, m[1]);
    if (!row) return json({ error: "That management link is not valid." }, 404);
    const body = await h.readJson(request);
    if (body.action === "delete") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sublease_leads WHERE listing_id=?").bind(row.id),
        env.DB.prepare("DELETE FROM sublease_photos WHERE listing_id=?").bind(row.id),
        env.DB.prepare("DELETE FROM sublease_listings WHERE id=?").bind(row.id),
      ]);
      return json({ ok: true, deleted: true });
    }
    if (body.action === "edit") {
      const cur = JSON.parse(row.data_json);
      const editable = ["title", "area", "description", "rent", "deposit", "startDate", "endDate", "bedrooms", "bathrooms", "furnished", "utilities", "type"];
      const patch = {};
      for (const k of editable) if (body.fields && k in body.fields) patch[k] = body.fields[k];
      const { data } = validateListing({ ...cur, ...patch }, { keepPhotos: true });
      // market, school, owner and permission stay as first submitted
      const merged = { ...cur, ...Object.fromEntries(editable.map((k) => [k, data[k]])) };
      await env.DB.prepare("UPDATE sublease_listings SET data_json=?, updated_at=? WHERE id=?").bind(JSON.stringify(merged), now, row.id).run();
      return json({ ok: true });
    }
    const next = clean(body.status, 10);
    const ok = { live: ["paused"], paused: ["live"], filled: [] };
    const allowed =
      next === "filled"
        ? ["live", "paused"].includes(row.status)
        : (ok[row.status] || []).includes(next) || false;
    if (!["live", "paused", "filled"].includes(next) || !allowed)
      return json({ error: "That change isn't available right now." }, 400);
    await env.DB.prepare("UPDATE sublease_listings SET status=?, updated_at=? WHERE id=?")
      .bind(next, now, row.id)
      .run();
    return json({ ok: true, status: next });
  }
  return json({ error: "Endpoint not found." }, 404);
}

const htmlEsc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Server-rendered social tags so a shared link shows the listing's photo, title and price on Facebook, texts and chat apps.
export async function listingSharePage(env, id, html, site) {
  if (!/^[a-z0-9]{12}$/.test(id || "") || !env.DB) return null;
  const row = await env.DB.prepare(
    "SELECT id, data_json FROM sublease_listings WHERE id=? AND (status='filled' OR (status='live' AND (expires_at IS NULL OR expires_at > ?)))",
  ).bind(id, new Date().toISOString()).first().catch(() => null);
  if (!row) return null;
  const d = JSON.parse(row.data_json);
  const title = (d.title || "Sublease") + " | $" + Number(d.rent).toLocaleString("en-US") + "/mo near " + (d.school || d.marketName);
  const desc = String(d.description || "").replace(/\s+/g, " ").trim().slice(0, 190) + (String(d.description || "").length > 190 ? "…" : "");
  const url = site + "/sublease-listing.html?id=" + row.id;
  const swap = (re, to) => (html = html.replace(re, () => to));
  swap(/<title>[^<]*<\/title>/, "<title>" + htmlEsc(title) + " — AstroPro</title>");
  swap(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + htmlEsc(desc) + '">');
  swap(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + htmlEsc(url) + '">');
  swap(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + htmlEsc(title) + '">');
  swap(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + htmlEsc(desc) + '">');
  swap(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + htmlEsc(url) + '">');
  swap(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + htmlEsc(site + "/api/sublease/photo/" + row.id + "/0") + '">');
  return html;
}

// Build a full housing page for a school that a student added. Returns null when no live listing backs it.
export async function customMarketPage(env, slug, template) {
  if (!/^[a-z0-9-]{2,58}$/.test(slug)) return null;
  const row = await env.DB.prepare(
    "SELECT market_name name, json_extract(data_json,'$.school') school FROM sublease_listings WHERE market=? AND status='live' AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT 1",
  ).bind("c-" + slug, Date.now()).first();
  if (!row) return null;
  const place = String(row.name || "");
  const school = String(row.school || row.name || "");
  return template
    .replace(/housing-tplmarket|c-tplmarket/g, "c-" + slug)
    .replace(/market-template\.html/g, "housing-" + slug + ".html")
    .replace(/school=TPL_SCHOOL/g, "school=" + encodeURIComponent(school))
    .replace(/TPL_SCHOOL/g, htmlEsc(school))
    .replace(/TPL_PLACE/g, htmlEsc(place));
}

// ---------- Student email, sign-in links and follow-up jobs ----------
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const SITE = (env) => env.SITE_ORIGIN || "https://astroprostudentresourcecenter.com";

// Owner-only unlock links: a signed link in your alert email marks a payment as received (for when PayPal's instant notice fails).
const ownerSecret = async (env) => {
  let row = await env.DB.prepare("SELECT v FROM sublease_secrets WHERE k='owner'").first();
  if (!row) {
    const v = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("INSERT OR IGNORE INTO sublease_secrets (k,v) VALUES ('owner',?)").bind(v).run();
    row = await env.DB.prepare("SELECT v FROM sublease_secrets WHERE k='owner'").first();
  }
  return row.v;
};
const unlockToken = async (env, code) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await ownerSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("unlock:" + code));
  return Array.from(new Uint8Array(sig).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
};
const unlockUrl = async (env, code) => SITE(env) + "/api/sublease/owner-unlock?code=" + code + "&t=" + (await unlockToken(env, code));
const mailHtml = (heading, lines, label, url, site) => {
  const base = site || "https://astroprostudentresourcecenter.com";
  return (
    '<div style="background:#f4f2ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#172447">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e2d8">' +
    '<div style="padding:22px 24px 16px;text-align:center"><a href="' + htmlEsc(base) + '"><img src="' + htmlEsc(base) + '/brand/email-logo.png" width="260" alt="AstroPro Student Resource Center" style="border:0;max-width:100%;height:auto"></a></div>' +
    '<div style="height:5px;background:#E77B25"></div>' +
    '<div style="padding:26px 28px 8px">' +
    '<div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#E77B25;font-weight:700;margin-bottom:6px">Sublease War Room</div>' +
    '<h2 style="margin:0 0 14px;font-size:22px;line-height:1.3">' + htmlEsc(heading) + "</h2>" +
    lines.map((l) => '<p style="line-height:1.6;margin:0 0 12px;font-size:15px">' + htmlEsc(l) + "</p>").join("") +
    '<p style="margin:22px 0"><a href="' + htmlEsc(url) + '" style="background:#E77B25;color:#fff;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:700;display:inline-block;font-size:15px">' + htmlEsc(label) + "</a></p>" +
    '<p style="font-size:12px;color:#667085;line-height:1.5;word-break:break-all">Button not working? Copy this link into your browser:<br>' + htmlEsc(url) + "</p>" +
    '<p style="font-size:14px;margin:18px 0 6px">Questions? Just reply to this email and a real person will help.</p>' +
    '<p style="font-size:14px;margin:0 0 20px">&mdash; The AstroPro Team</p></div>' +
    '<div style="background:#172447;color:#c9d1e6;text-align:center;padding:16px 20px;font-size:12px;line-height:1.6">AstroPro Student Resource Center<br><a href="' + htmlEsc(base) + '" style="color:#fff">astroprostudentresourcecenter.com</a></div>' +
    "</div></div>"
  );
};
const sendStudent = async (h, to, subject, lines, label, url) => {
  if (!h.mail || !EMAIL_RE.test(to || "")) return false;
  return !!(await h.mail({ to, subject, text: lines.join("\n\n") + "\n\n" + label + ": " + url + "\n\n- The AstroPro Team\nAstroPro Student Resource Center\n", html: mailHtml(subject, lines, label, url, h.site) }).catch(() => false));
};
const bump = (env, name) =>
  env.DB.prepare("INSERT INTO sublease_events (day,name,n) VALUES (?,?,1) ON CONFLICT(day,name) DO UPDATE SET n=n+1")
    .bind(new Date().toISOString().slice(0, 10), name)
    .run()
    .catch(() => null);

// Runs every 15 minutes: nudge students who paid but have not filled the form, tell the owner about stalled checkouts.
export async function runSubleaseJobs(env, h) {
  if (!env.DB) return;
  const site = SITE(env);
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  // Paid, but no listing yet
  const { results: paid } = await env.DB.prepare(
    "SELECT i.code, i.email, i.reminders, c.paid_at FROM sublease_intents i JOIN sublease_credits c ON c.code=i.code WHERE c.listing_id IS NULL AND i.reminders < 3 AND NOT EXISTS (SELECT 1 FROM sublease_listings l WHERE l.pay_code=i.code OR l.id=i.code)",
  ).all().catch(() => ({ results: [] }));
  const owed = [];
  for (const r of paid) {
    const waitMin = [20, 24 * 60, 3 * 24 * 60][r.reminders];
    if (!(r.paid_at < ago(waitMin))) continue;
    const url = site + "/sublease-war-room.html?code=" + r.code + "#start";
    const sent = await sendStudent(h, r.email, "Finish your Sublease War Room listing", ["Thanks for your payment. Your spot is saved and your form is ready.", "It takes about 5 minutes: add your place, photos and dates, and we'll build your ready-to-post ads and your private dashboard."], "Finish my listing", url);
    await env.DB.prepare("UPDATE sublease_intents SET reminders=reminders+1 WHERE code=?").bind(r.code).run().catch(() => null);
    if (r.reminders === 0) owed.push(r.email + (sent ? " (we emailed them)" : " (NOT emailed: send them " + url + ")"));
  }
  if (owed.length)
    await h.notify?.("Paid but has not filled out the form (" + owed.length + ")", "These students paid $39 and have not submitted their listing yet:\n\n" + owed.join("\n") + "\n\nA reminder goes out automatically. You can also reach out yourself.");
  // Checkout started, nothing recorded
  const { results: stalled } = await env.DB.prepare(
    "SELECT i.code, i.email, i.abandon_sent FROM sublease_intents i WHERE i.owner_alerted=0 AND i.created_at < ? AND NOT EXISTS (SELECT 1 FROM sublease_credits c WHERE c.code=i.code) AND NOT EXISTS (SELECT 1 FROM sublease_listings l WHERE l.pay_code=i.code OR l.id=i.code)",
  ).bind(ago(30)).all().catch(() => ({ results: [] }));
  if (stalled.length) {
    for (const r of stalled) {
      await env.DB.prepare("UPDATE sublease_intents SET owner_alerted=1 WHERE code=?").bind(r.code).run().catch(() => null);
      await sendStudent(h, r.email, "Still need help subleasing?", ["You started checkout for the Sublease War Room but didn't finish.", "When you're ready, pick up where you left off. Your listing goes in front of thousands of students and we give you the ready-to-post ads and every place to post."], "Back to the Sublease War Room", site + "/sublease-war-room.html?code=" + r.code + "#start");
    }
    await h.notify?.("Checkout started, no payment recorded (" + stalled.length + ")", "These people entered their email and clicked Pay, but no payment has been recorded after 30 minutes:\n\n" + (await Promise.all(stalled.map(async (r) => r.email + "  (code " + r.code + ")\nIf they paid, tap to unlock and email them: " + (await unlockUrl(env, r.code))))).join("\n\n") + "\n\nIf any of them paid in PayPal (item number = the code), the payment notification may have failed. Tap the link under their name to unlock the form and email them.");
  }
}
