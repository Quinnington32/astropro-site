import { marketLinks } from "./market-links.mjs";
import { handleSublease } from "./sublease.mjs";
const PREFIX = "/studentresourcecenter";
const ALIAS_HOSTS = [
  "www.astroprostudentresourcecenter.com",
  "astroprostudentresourcecenter.org",
  "www.astroprostudentresourcecenter.org",
];
const MAX_BODY = 2500000;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const types = {
  listing: [
    "organization",
    "email",
    "listingType",
    "title",
    "description",
    "url",
  ],
  mentee: ["name", "email", "field", "graduationYear"],
  mentor: ["name", "email", "field", "availability"],
  "data-request": ["email", "requestType", "description"],
  unsubscribe: ["email"],
  "scholarship-interest": ["name", "email", "helpWith"],
  "partner-campaign": [
    "market",
    "marketName",
    "orderRef",
    "contactName",
    "email",
    "phone",
    "subject",
    "instructions",
    "url",
    "wantsFlyerDesigned",
    "flyerName",
    "flyerMime",
    "flyerBase64",
  ],
};
const required = {
  listing: [
    "organization",
    "email",
    "listingType",
    "title",
    "description",
    "url",
  ],
  mentee: ["name", "email", "field"],
  mentor: ["name", "email", "field", "availability"],
  "data-request": ["email", "requestType"],
  unsubscribe: ["email"],
  "scholarship-interest": ["email"],
  "partner-campaign": [
    "market",
    "marketName",
    "orderRef",
    "contactName",
    "email",
    "subject",
    "instructions",
  ],
};
const maxima = {
  organization: 200,
  email: 254,
  listingType: 80,
  title: 200,
  description: 4000,
  url: 1000,
  name: 200,
  field: 200,
  graduationYear: 4,
  availability: 80,
  requestType: 80,
  helpWith: 80,
  market: 60,
  marketName: 150,
  orderRef: 20,
  contactName: 200,
  phone: 40,
  subject: 200,
  instructions: 4000,
  wantsFlyerDesigned: 4,
  flyerName: 200,
  flyerMime: 40,
  flyerBase64: 2400000,
};
const choices = {
  listingType: [
    "Scholarship",
    "Job or internship",
    "Student discount",
    "Housing property",
    "School partnership",
    "Other resource",
  ],
  availability: [
    "30 minutes per month",
    "One hour per month",
    "A few hours per semester",
  ],
  helpWith: [
    "Applying to several scholarships for me",
    "Finding scholarships that fit me",
    "Writing my essays and answers",
    "Keeping track of deadlines",
    "All of the above",
  ],
  requestType: [
    "Access my information",
    "Correct my information",
    "Delete my information",
  ],
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const reviewStates = ["new", "reviewed", "resolved"];
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
async function digest(value) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function authorize(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  const a = await digest(supplied),
    b = await digest("Bearer " + env.ADMIN_TOKEN);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function readJson(request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw Object.assign(Error("Use an application/json request."), {
      status: 415,
    });
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    throw Object.assign(Error("Request is too large."), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader)
    throw Object.assign(Error("The request body is missing."), { status: 400 });
  let total = 0,
    chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
      await reader.cancel();
      throw Object.assign(Error("Request is too large."), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw Object.assign(Error("The request body is not valid JSON."), {
      status: 400,
    });
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Object.assign(Error("Please send a JSON object."), { status: 400 });
  return value;
}
export function validateSubmission(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Please send a valid request.");
  const type = input.type;
  if (typeof type !== "string" || !Object.hasOwn(types, type))
    throw Error("Choose a valid request type.");
  if (input.consent !== true)
    throw Error("Please agree to the request-specific privacy notice.");
  if (typeof input.requestId !== "string" || !UUID.test(input.requestId))
    throw Error(
      "The request identifier is invalid. Reload the form and try again.",
    );
  const payload = {};
  for (const name of types[type]) {
    const raw = input[name];
    if (raw !== undefined && typeof raw !== "string")
      throw Error("Please check the " + name + " field.");
    const value = (raw || "").trim();
    if (required[type].includes(name) && !value)
      throw Error("Please complete the " + name + " field.");
    if (value.length > maxima[name])
      throw Error("The " + name + " field is too long.");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
      throw Error("Please remove unsupported control characters.");
    payload[name] = value;
  }
  payload.email = payload.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))
    throw Error("Please enter a valid email address.");
  for (const [name, values] of Object.entries(choices))
    if (name in payload && !values.includes(payload[name]))
      throw Error("Choose a valid " + name + ".");
  if (
    payload.graduationYear &&
    !/^(19|20|21)\d{2}$/.test(payload.graduationYear)
  )
    throw Error("Enter a four-digit graduation year.");
  if (payload.url) {
    let url;
    try {
      url = new URL(payload.url);
    } catch {
      throw Error("Enter a complete official website URL.");
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw Error("Use an HTTPS website URL without login information.");
    payload.url = url.href;
  }
  if (type === "partner-campaign") {
    if (!/^housing-[a-z0-9-]+$/.test(payload.market))
      throw Error("Choose a valid market.");
    if (!/^AP-[A-Z0-9]{6}$/i.test(payload.orderRef))
      throw Error(
        "The order reference is invalid. Start again from the payment page.",
      );
    const hasFlyer = !!payload.flyerBase64;
    const wantsDesigned = payload.wantsFlyerDesigned === "yes";
    if (!hasFlyer && !wantsDesigned)
      throw Error(
        "Upload a flyer or choose to have AstroPro design one for you.",
      );
    if (hasFlyer) {
      if (
        !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(
          payload.flyerMime,
        )
      )
        throw Error("Upload a PNG, JPEG, WebP, or PDF flyer.");
      if (!payload.flyerName) throw Error("The flyer file name is missing.");
      if (!/^[A-Za-z0-9+/]+=*$/.test(payload.flyerBase64))
        throw Error("The flyer file could not be read. Try a different file.");
    }
  }
  return {
    type,
    payload,
    requestId: input.requestId.toLowerCase(),
    consentVersion: "2026-10-31",
  };
}
function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return (
    origin === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
async function quota(db, key, maximum, expires) {
  const row = await db
    .prepare(
      "INSERT INTO rate_limits (key, hits, expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits",
    )
    .bind(key, expires, maximum)
    .first();
  return !!row;
}
const NOTIFY_TO = "leasesolutions3@gmail.com";
const NOTIFY_FROM = "orders@astroprostudentresourcecenter.com";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const b64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n").trimEnd();
};
const encodeHeader = (value) =>
  (Array.from(String(value).replace(/[\r\n]+/g, " ")).join("").match(/(?:[\s\S]){1,12}/gu) || [""])
    .map(
      (part) =>
        "=?UTF-8?B?" + btoa(String.fromCharCode(...new TextEncoder().encode(part))) + "?=",
    )
    .join("\r\n ");
export function buildRawEmail({ from, to, replyTo, subject, text, html }) {
  const boundary = "asrc-" + crypto.randomUUID();
  const domain = from.split("@")[1];
  const clean = (v) => String(v).replace(/[\r\n]+/g, " ");
  return [
    "From: AstroPro Resource Center <" + clean(from) + ">",
    "To: " + clean(to),
    replyTo ? "Reply-To: " + clean(replyTo) : null,
    "Subject: " + encodeHeader(subject),
    "Date: " + new Date().toUTCString(),
    "Message-ID: <" + crypto.randomUUID() + "@" + domain + ">",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    "",
    "--" + boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(text),
    "--" + boundary,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(html),
    "--" + boundary + "--",
    "",
  ]
    .filter((l) => l !== null)
    .join("\r\n");
}
export async function notifyPartnerCampaign(env, data) {
  if (!env.EMAIL?.send) return;
  try {
    const p = data.payload;
    const flyer = p.flyerName
      ? "Uploaded (" + p.flyerName + ")"
      : p.wantsFlyerDesigned === "yes"
        ? "Asked AstroPro to design one"
        : "(none)";
    const message = {
      to: env.PARTNER_NOTIFY_TO || NOTIFY_TO,
      from: NOTIFY_FROM,
      replyTo: p.email,
      subject:
        "New partner campaign order — " + p.marketName + " (" + p.orderRef + ")",
      html:
        "<p>A property partner submitted a campaign order.</p><ul>" +
        "<li><strong>Order ref:</strong> " + esc(p.orderRef) +
        "</li><li><strong>Market:</strong> " + esc(p.marketName) +
        "</li><li><strong>Contact:</strong> " + esc(p.contactName) + " — " + esc(p.email) +
        (p.phone ? " — " + esc(p.phone) : "") +
        "</li><li><strong>Subject line:</strong> " + esc(p.subject) +
        "</li><li><strong>Link to include:</strong> " + esc(p.url || "(none provided)") +
        "</li><li><strong>Flyer:</strong> " + esc(flyer) +
        "</li></ul><p><strong>Instructions from partner:</strong><br>" +
        esc(p.instructions).replace(/\n/g, "<br>") +
        "</p><p>Check PayPal for a payment matching the order ref. Full details are in the admin inbox.</p>",
      text:
        "New partner campaign order\nOrder ref: " + p.orderRef +
        "\nMarket: " + p.marketName +
        "\nContact: " + p.contactName + " — " + p.email + (p.phone ? " — " + p.phone : "") +
        "\nSubject line: " + p.subject +
        "\nLink: " + (p.url || "(none provided)") +
        "\nFlyer: " + flyer +
        "\n\nInstructions:\n" + p.instructions,
    };
    let EmailMessage;
    try {
      ({ EmailMessage } = await import("cloudflare:email"));
    } catch {}
    await env.EMAIL.send(
      EmailMessage
        ? new EmailMessage(message.from, message.to, buildRawEmail(message))
        : message,
    );
  } catch {
    console.error("Partner campaign notification email failed");
  }
}
export async function notifyTeam(env, subject, text) {
  if (!env.EMAIL?.send) return;
  try {
    const message = {
      to: env.PARTNER_NOTIFY_TO || NOTIFY_TO,
      from: NOTIFY_FROM,
      subject,
      text,
      html: "<p>" + esc(text).replace(/\n/g, "<br>") + "</p>",
    };
    let EmailMessage;
    try {
      ({ EmailMessage } = await import("cloudflare:email"));
    } catch {}
    await env.EMAIL.send(
      EmailMessage
        ? new EmailMessage(message.from, message.to, buildRawEmail(message))
        : message,
    );
  } catch {
    console.error("Team notification email failed");
  }
}
const LABELS = {
  mentee: "Mentee request",
  mentor: "Mentor sign-up",
  listing: "Listing suggestion",
  "data-request": "Data request",
  unsubscribe: "Email preference / unsubscribe",
  "scholarship-interest": "Scholarship help sign-up",
};
export async function notifySubmission(env, data) {
  if (data.type === "partner-campaign") return notifyPartnerCampaign(env, data);
  if (!env.EMAIL?.send) return;
  try {
    const label = LABELS[data.type] || data.type;
    const rows = Object.entries(data.payload || {}).filter(
      ([k, v]) => v !== "" && v != null && !/base64/i.test(k),
    );
    const message = {
      to: env.PARTNER_NOTIFY_TO || NOTIFY_TO,
      from: NOTIFY_FROM,
      replyTo: data.payload?.email,
      subject: "New " + label + " — Student Resource Center",
      html:
        "<p>New <strong>" + esc(label) + "</strong> submitted on the Student Resource Center.</p><ul>" +
        rows.map(([k, v]) => "<li><strong>" + esc(k) + ":</strong> " + esc(v).replace(/\n/g, "<br>") + "</li>").join("") +
        "</ul><p>Also saved in the admin inbox.</p>",
      text:
        "New " + label + " submitted\n\n" +
        rows.map(([k, v]) => k + ": " + v).join("\n"),
    };
    let EmailMessage;
    try {
      ({ EmailMessage } = await import("cloudflare:email"));
    } catch {}
    await env.EMAIL.send(
      EmailMessage
        ? new EmailMessage(message.from, message.to, buildRawEmail(message))
        : message,
    );
  } catch {
    console.error("Submission notification email failed");
  }
}
async function submissions(request, env) {
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405, { allow: "POST" });
  if (!isSameOrigin(request))
    return json(
      { error: "Send this request from the Resource Center form." },
      403,
    );
  let raw;
  try {
    raw = await readJson(request);
  } catch (err) {
    return json({ error: err.message }, err.status || 400);
  }
  if (typeof raw.website === "string" && raw.website.trim())
    return json(
      {
        error:
          "We could not accept that request. Please contact us directly if you need help.",
      },
      400,
    );
  let data;
  try {
    data = validateSubmission(raw);
  } catch (err) {
    return json({ error: err.message }, 400);
  }
  if (
    request.headers.get("idempotency-key") &&
    request.headers.get("idempotency-key").toLowerCase() !== data.requestId
  )
    return json({ error: "Request identifiers do not match." }, 400);
  if (!env.DB)
    return json(
      {
        error:
          "The request service is temporarily unavailable. Your request has not been confirmed.",
      },
      503,
    );
  const payloadHash = await digest(
    JSON.stringify([data.type, data.payload, data.consentVersion]),
  );
  try {
    const existing = await env.DB.prepare(
      "SELECT id,payload_hash,created_at FROM submissions WHERE id=?",
    )
      .bind(data.requestId)
      .first();
    if (existing) {
      if (existing.payload_hash !== payloadHash)
        return json(
          {
            error:
              "This request identifier belongs to different details. Start a new request.",
          },
          409,
        );
      return json({
        receipt: existing.id,
        receivedAt: existing.created_at,
        duplicate: true,
      });
    }
    const hour = Math.floor(Date.now() / 3600000),
      expires = (hour + 2) * 3600000;
    const emailKey = await digest("email:" + data.payload.email + ":" + hour),
      ipKey = await digest(
        "network:" +
          (request.headers.get("cf-connecting-ip") || "local") +
          ":" +
          hour,
      );
    for (const [key, max] of [
      [emailKey, 8],
      [ipKey, 80],
      ["global:" + hour, 1000],
    ])
      if (!(await quota(env.DB, key, max, expires)))
        return json(
          {
            error:
              "Too many requests right now. Please try again in an hour or contact us directly.",
          },
          429,
          { "retry-after": "3600" },
        );
    const created = new Date().toISOString();
    const statements = [
      env.DB.prepare(
        "INSERT OR IGNORE INTO submissions (id,type,payload_json,payload_hash,consent_version,status,created_at,updated_at) VALUES (?,?,?,?,?,'new',?,?)",
      ).bind(
        data.requestId,
        data.type,
        JSON.stringify(data.payload),
        payloadHash,
        data.consentVersion,
        created,
        created,
      ),
    ];
    if (data.type === "unsubscribe") {
      const hash = await digest(data.payload.email);
      statements.push(
        env.DB.prepare(
          "INSERT INTO communication_preferences (email_hash,email,do_not_contact,created_at,updated_at) SELECT ?,?,1,?,? WHERE EXISTS (SELECT 1 FROM submissions WHERE id=? AND payload_hash=? AND type='unsubscribe') ON CONFLICT(email_hash) DO UPDATE SET do_not_contact=1,updated_at=excluded.updated_at",
        ).bind(
          hash,
          data.payload.email,
          created,
          created,
          data.requestId,
          payloadHash,
        ),
      );
    }
    await env.DB.batch(statements);
    const stored = await env.DB.prepare(
      "SELECT id,payload_hash,created_at FROM submissions WHERE id=?",
    )
      .bind(data.requestId)
      .first();
    if (!stored || stored.payload_hash !== payloadHash)
      return json(
        {
          error:
            "The request could not be confirmed. Please retry the same details.",
        },
        409,
      );
    await notifySubmission(env, data);
    return json({ receipt: stored.id, receivedAt: stored.created_at }, 201);
  } catch {
    console.error("Resource Center submission persistence failed");
    return json(
      {
        error:
          "We could not confirm your request. Your details are still in the form; please try again.",
      },
      503,
    );
  }
}
function decodeCursor(cursor, idPattern) {
  if (!cursor) return null;
  try {
    if (cursor.length > 240 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw Error();
    const value = JSON.parse(
      atob(cursor.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      typeof value[0] !== "string" ||
      new Date(value[0]).toISOString() !== value[0] ||
      typeof value[1] !== "string" ||
      !idPattern.test(value[1])
    )
      throw Error();
    return value;
  } catch {
    throw Object.assign(Error("Invalid pagination cursor."), { status: 400 });
  }
}
const encodeCursor = (time, id) =>
  btoa(JSON.stringify([time, id]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
async function admin(request, env, path) {
  if (!(await authorize(request, env)))
    return json({ error: "Private access key required." }, 401, {
      "www-authenticate": "Bearer",
    });
  if (!env.DB) return json({ error: "Request storage is unavailable." }, 503);
  if (path === "/api/admin/submissions" && request.method === "GET") {
    const url = new URL(request.url),
      cursor = decodeCursor(url.searchParams.get("cursor"), UUID),
      status = url.searchParams.get("status"),
      type = url.searchParams.get("type");
    if (
      (status && !reviewStates.includes(status)) ||
      (type && !Object.hasOwn(types, type))
    )
      return json({ error: "Choose a valid inbox filter." }, 400);
    let sql =
        "SELECT id,type,payload_json,status,created_at,updated_at FROM submissions",
      args = [],
      conditions = [];
    if (status) {
      conditions.push("status=?");
      args.push(status);
    }
    if (type) {
      conditions.push("type=?");
      args.push(type);
    }
    if (cursor) {
      conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
      args.push(cursor[0], cursor[0], cursor[1]);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY created_at DESC,id DESC LIMIT 51";
    const { results } = await env.DB.prepare(sql)
      .bind(...args)
      .all();
    const hasMore = results.length > 50;
    const rows = results.slice(0, 50);
    const last = rows.at(-1);
    const nextCursor = hasMore ? encodeCursor(last.created_at, last.id) : null;
    return json({
      items: rows.map(({ payload_json, ...row }) => ({
        ...row,
        payload: JSON.parse(payload_json),
      })),
      nextCursor,
    });
  }
  const match = path.match(/^\/api\/admin\/submissions\/([0-9a-f-]{36})$/i);
  if (match && request.method === "PATCH") {
    const raw = await readJson(request);
    if (!reviewStates.includes(raw.status))
      return json({ error: "Choose a valid review status." }, 400);
    const r = await env.DB.prepare(
      "UPDATE submissions SET status=?,updated_at=? WHERE id=?",
    )
      .bind(raw.status, new Date().toISOString(), match[1])
      .run();
    return r.meta.changes
      ? json({ ok: true })
      : json({ error: "Request not found." }, 404);
  }
  if (path === "/api/admin/preferences" && request.method === "GET") {
    const cursor = decodeCursor(
      new URL(request.url).searchParams.get("cursor"),
      HASH,
    );
    const { results } = await env.DB.prepare(
      "SELECT email_hash,email,do_not_contact,created_at,updated_at FROM communication_preferences" +
        (cursor
          ? " WHERE (updated_at < ? OR (updated_at = ? AND email_hash < ?))"
          : "") +
        " ORDER BY updated_at DESC,email_hash DESC LIMIT 51",
    )
      .bind(...(cursor ? [cursor[0], cursor[0], cursor[1]] : []))
      .all();
    const rows = results.slice(0, 50),
      last = rows.at(-1);
    return json({
      items: rows.map(({ email_hash, ...row }) => row),
      nextCursor:
        results.length > 50
          ? encodeCursor(last.updated_at, last.email_hash)
          : null,
    });
  }
  return json({ error: "Endpoint not found." }, 404);
}
function secure(response, isHtml = false) {
  const r = new Response(response.body, response);
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  r.headers.set("X-Frame-Options", "DENY");
  r.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  r.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://www.google.com; upgrade-insecure-requests",
  );
  if (isHtml)
    r.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return r;
}
async function bookSearch(request) {
  if (!["GET", "HEAD"].includes(request.method))
    return json({ error: "Method not allowed." }, 405, { allow: "GET, HEAD" });
  const q = (new URL(request.url).searchParams.get("q") || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  if (q.length < 2) return json({ error: "Enter a title, author, or ISBN." }, 400);
  const upstream = new URL("https://openlibrary.org/search.json");
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("limit", "10");
  upstream.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,isbn,cover_i,edition_count",
  );
  let data;
  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": "AstroProStudentResourceCenter/1.0 (leasesolutions3@gmail.com)" },
      signal: AbortSignal.timeout(6000),
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!res.ok) throw new Error("upstream");
    data = await res.json();
  } catch {
    return json({ error: "Book lookup is unavailable right now.", books: [] }, 503);
  }
  const books = (data.docs || []).slice(0, 10).map((d) => {
    const isbns = Array.isArray(d.isbn) ? d.isbn : [];
    return {
      title: String(d.title || "").slice(0, 200),
      authors: (d.author_name || []).slice(0, 3).map((a) => String(a).slice(0, 80)),
      year: Number.isInteger(d.first_publish_year) ? d.first_publish_year : null,
      editions: Number.isInteger(d.edition_count) ? d.edition_count : null,
      isbn: isbns.find((i) => /^\d{13}$/.test(i)) || isbns.find((i) => /^\d{9}[\dX]$/.test(i)) || "",
      cover: Number.isInteger(d.cover_i)
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : "",
    };
  }).filter((b) => b.title);
  return json({ books }, 200, { "cache-control": "public, max-age=3600" });
}
export async function handleRequest(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (ALIAS_HOSTS.includes(url.hostname)) {
    const target = new URL("https://astroprostudentresourcecenter.com/");
    target.pathname = path;
    target.search = url.search;
    return Response.redirect(target.href, 308);
  }
  if (path === PREFIX)
    return Response.redirect(url.origin + PREFIX + "/" + url.search, 308);
  if (path.startsWith(PREFIX + "/")) path = path.slice(PREFIX.length);
  if (path.startsWith("/api/")) {
    if (path === "/api/health" && ["GET", "HEAD"].includes(request.method)) {
      let ready = false;
      try {
        if (env.DB) {
          await env.DB.prepare("SELECT 1 FROM submissions LIMIT 1").first();
          ready = true;
        }
      } catch {}
      return json(
        {
          ok: ready,
          storageConfigured: !!env.DB,
          service: "astropro-student-resource-center",
        },
        ready ? 200 : 503,
      );
    }
    if (path === "/api/books") return bookSearch(request);
    if (path.startsWith("/api/sublease/") || path.startsWith("/api/admin/sublease/"))
      return handleSublease(request, env, path, { json, readJson, isSameOrigin, quota, digest, authorize, notify: (subject, text) => notifyTeam(env, subject, text) });
    if (path === "/api/submissions") return submissions(request, env);
    if (path.startsWith("/api/admin/")) return admin(request, env, path);
    return json({ error: "Endpoint not found." }, 404);
  }
  if (!["GET", "HEAD"].includes(request.method))
    return json({ error: "Method not allowed." }, 405, { allow: "GET, HEAD" });
  if (path === "/brand") {
    const destination = new URL(request.url);
    destination.pathname += "/";
    return Response.redirect(destination.href, 308);
  }
  const go = path.match(/^\/go\/([a-z0-9-]+)\/?$/i);
  if (go && Object.hasOwn(marketLinks, go[1].toLowerCase())) {
    const dest = new URL(request.url);
    dest.pathname =
      (url.pathname.startsWith(PREFIX) ? PREFIX : "") +
      "/" +
      marketLinks[go[1].toLowerCase()];
    return Response.redirect(dest.href, 302);
  }
  const assetURL = new URL(request.url);
  assetURL.pathname =
    path === "/"
      ? "/index.html"
      : path === "/brand/"
        ? "/brand/index.html"
        : path;
  let response = await env.ASSETS.fetch(new Request(assetURL, request));
  if (response.status === 404) {
    assetURL.pathname = "/404.html";
    const fallback = await env.ASSETS.fetch(new Request(assetURL, request));
    response = new Response(fallback.body, {
      status: 404,
      headers: fallback.headers,
    });
  }
  // Asset redirects must remain inside the mounted application.
  const location = response.headers.get("location");
  if (location) {
    const target = new URL(location, request.url);
    if (
      url.pathname.startsWith(PREFIX) &&
      !target.pathname.startsWith(PREFIX)
    ) {
      target.pathname = PREFIX + target.pathname;
      response = new Response(response.body, response);
      response.headers.set("location", target.href);
    }
  }
  return response;
}
export default {
  async fetch(request, env) {
    try {
      const response = await handleRequest(request, env);
      return secure(
        response,
        response.headers.get("content-type")?.includes("text/html"),
      );
    } catch (err) {
      if (err.status) return secure(json({ error: err.message }, err.status));
      console.error("Resource Center request failed");
      return secure(
        json(
          {
            error:
              "The service could not complete this request. Please try again.",
          },
          503,
        ),
      );
    }
  },
  async scheduled(_event, env) {
    if (!env.DB) return;
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM submissions WHERE created_at < ? AND type != 'scholarship-interest'",
      ).bind(
        new Date(Date.now() - 90 * 86400000).toISOString(),
      ),
      env.DB.prepare(
        "UPDATE sublease_listings SET status='expired' WHERE status='live' AND expires_at < ?",
      ).bind(new Date().toISOString()),
      env.DB.prepare(
        "DELETE FROM sublease_photos WHERE listing_id IN (SELECT id FROM sublease_listings WHERE status='pending_payment' AND created_at < ?)",
      ).bind(new Date(Date.now() - 14 * 86400000).toISOString()),
      env.DB.prepare(
        "DELETE FROM sublease_listings WHERE status='pending_payment' AND created_at < ?",
      ).bind(new Date(Date.now() - 14 * 86400000).toISOString()),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(
        Date.now(),
      ),
    ]);
  },
};
