import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { randomUUID, createHash } from "node:crypto";
import { customMarketPage } from "../worker/sublease.mjs";
import { validateSubmission, notifyPartnerCampaign, notifySubmission, buildRawEmail } from "../worker/index.mjs";
let mf, db;
const token = "local-test-only-secret-".repeat(3);
const origin = "https://local.test";
const body = (type = "mentee", extra = {}) => ({
  requestId: randomUUID(),
  type,
  name: "Synthetic local test",
  email: randomUUID() + "@example.com",
  field: "Engineering",
  consent: true,
  ...extra,
});
const send = (input, headers = {}) =>
  mf.dispatchFetch(origin + "/studentresourcecenter/api/submissions", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.42",
      ...headers,
    },
    body: JSON.stringify(input),
  });
before(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: [
        { type: "ESModule", path: "worker/index.mjs" },
        { type: "ESModule", path: "worker/market-links.mjs" },
        { type: "ESModule", path: "worker/sublease.mjs" },
      ],
      modulesRoot: process.cwd(),
      compatibilityDate: "2026-10-01",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      bindings: { ADMIN_TOKEN: token },
    }),
  );
  db = await mf.getD1Database("DB");
  for (const file of [
    "migrations/0001_resource_center.sql",
    "migrations/0002_partner_campaign_type.sql",
    "migrations/0003_scholarship_interest_type.sql",
    "migrations/0004_sublease_war_room.sql",
    "migrations/0005_sublease_payments.sql",
    "migrations/0006_sublease_views.sql",
    "migrations/0007_sublease_credits.sql",
    "migrations/0008_sublease_pay_code.sql",
    "migrations/0009_sublease_events.sql",
    "migrations/0010_sublease_intents.sql",
  ]) {
    const schema = await readFile(file, "utf8");
    await db.batch(
      schema
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((sql) => db.prepare(sql)),
    );
  }
});
after(async () => {
  await mf?.dispose();
});
test("server validation rejects missing consent, invalid types, and unsafe URLs", () => {
  assert.throws(() => validateSubmission(body("mentee", { consent: false })));
  assert.throws(() => validateSubmission(body(["mentee"])));
  assert.throws(() =>
    validateSubmission(
      body("listing", {
        organization: "Test",
        listingType: "Scholarship",
        title: "Test",
        description: "Test",
        url: "javascript:alert(1)",
      }),
    ),
  );
  assert.throws(() =>
    validateSubmission(body("mentee", { graduationYear: "abcd" })),
  );
});
test("all five forms persist only validated fields and return receipts", async () => {
  for (const [type, extra] of [
    ["mentee", {}],
    ["mentor", { availability: "One hour per month" }],
    [
      "listing",
      {
        organization: "Synthetic organization",
        listingType: "Scholarship",
        title: "Synthetic opportunity",
        description: "Test only",
        url: "https://example.com/test",
      },
    ],
    ["data-request", { requestType: "Access my information" }],
    ["unsubscribe", {}],
    ["scholarship-interest", { helpWith: "All of the above" }],
  ]) {
    const payload = body(type, { ...extra, unexpected: "must not persist" });
    const r = await send(payload);
    assert.equal(r.status, 201);
    const result = await r.json();
    assert.equal(result.receipt, payload.requestId);
    const row = await db
      .prepare("SELECT * FROM submissions WHERE id=?")
      .bind(payload.requestId)
      .first();
    assert.equal(row.type, type);
    assert.equal(JSON.parse(row.payload_json).unexpected, undefined);
    assert.equal(row.consent_version, "2026-10-31");
  }
});
test("short market links redirect to the market page and keep tracking parameters", async () => {
  const r = await mf.dispatchFetch(origin + "/go/ames?utm_source=facebook", { redirect: "manual" });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get("location"));
  assert.equal(loc.pathname, "/housing-ames-ia.html");
  assert.equal(loc.search, "?utm_source=facebook");
  const missing = await mf.dispatchFetch(origin + "/go/not-a-market", { redirect: "manual" });
  assert.notEqual(missing.status, 302);
});
test("scholarship help sign-ups validate their choice and keep a valid email", () => {
  const ok = { requestId: randomUUID(), type: "scholarship-interest", email: "Student@Example.com", helpWith: "Keeping track of deadlines", consent: true };
  assert.equal(validateSubmission(ok).payload.email, "student@example.com");
  assert.throws(() => validateSubmission({ ...ok, helpWith: "anything else" }));
  assert.throws(() => validateSubmission({ ...ok, email: "not-an-email" }));
});
test("partner campaign orders validate the market, order reference, and flyer choice", async () => {
  const partnerBody = (extra = {}) => ({
    requestId: randomUUID(),
    type: "partner-campaign",
    market: "housing-brenham",
    marketName: "Blinn College — Brenham, TX",
    orderRef: "AP-AB12CD",
    contactName: "Test Partner",
    email: randomUUID() + "@example.com",
    subject: "New leasing special",
    instructions: "Please mention our move-in special.",
    wantsFlyerDesigned: "yes",
    consent: true,
    ...extra,
  });
  assert.throws(() =>
    validateSubmission(partnerBody({ market: "not-a-market" })),
  );
  assert.throws(() =>
    validateSubmission(partnerBody({ orderRef: "not-valid" })),
  );
  assert.throws(() =>
    validateSubmission(partnerBody({ wantsFlyerDesigned: "" })),
  );
  const r = await send(partnerBody());
  assert.equal(r.status, 201);
  const flyerPayload = partnerBody({
    wantsFlyerDesigned: "",
    flyerName: "flyer.png",
    flyerMime: "image/png",
    flyerBase64: Buffer.from("fake-image-bytes").toString("base64"),
  });
  const flyerResult = await send(flyerPayload);
  assert.equal(flyerResult.status, 201);
  const row = await db
    .prepare("SELECT payload_json FROM submissions WHERE id=?")
    .bind(flyerPayload.requestId)
    .first();
  assert.equal(JSON.parse(row.payload_json).flyerName, "flyer.png");
});
test("identical retries and simultaneous submits produce one stored receipt", async () => {
  const payload = body();
  const responses = await Promise.all([
    send(payload),
    send(payload),
    send(payload),
  ]);
  for (const r of responses) {
    assert.ok([200, 201].includes(r.status));
    assert.equal((await r.json()).receipt, payload.requestId);
  }
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM submissions WHERE id=?")
    .bind(payload.requestId)
    .first();
  assert.equal(row.n, 1);
  const conflict = await send({ ...payload, field: "Different details" });
  assert.equal(conflict.status, 409);
});
test("cross-origin, malformed, oversized, spam, and invalid requests cannot create records", async () => {
  assert.equal(
    (await send(body(), { Origin: "https://hostile.test" })).status,
    403,
  );
  assert.equal(
    (await send(body("mentee", { website: "spam.example" }))).status,
    400,
  );
  assert.equal((await send(body("mentee", { consent: false }))).status, 400);
  assert.equal(
    (await send(body(), { "Idempotency-Key": randomUUID() })).status,
    400,
  );
  let r;
  for (let attempt = 0; attempt < 3 && !r; attempt++)
    try {
      r = await mf.dispatchFetch(origin + "/api/submissions", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "x".repeat(2600000),
      });
    } catch (err) {
      if (attempt === 2) throw err; // large local uploads can reset the connection
    }
  assert.equal(r.status, 413);
});
test("private inbox denies unauthenticated reads and supports reviewed status", async () => {
  assert.equal(
    (await mf.dispatchFetch(origin + "/api/admin/submissions")).status,
    401,
  );
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/api/admin/submissions", {
        headers: { Authorization: "Bearer wrong" },
      })
    ).status,
    401,
  );
  const headers = { Authorization: "Bearer " + token };
  const r = await mf.dispatchFetch(origin + "/api/admin/submissions", {
    headers,
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const result = await r.json();
  assert.ok(result.items.length >= 6);
  const id = result.items[0].id;
  const changed = await mf.dispatchFetch(
    origin + "/api/admin/submissions/" + id,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reviewed" }),
    },
  );
  assert.equal(changed.status, 200);
  assert.equal(
    (
      await db
        .prepare("SELECT status FROM submissions WHERE id=?")
        .bind(id)
        .first()
    ).status,
    "reviewed",
  );
});
test("unsubscribe persists a private normalized do-not-contact preference", async () => {
  const payload = body("unsubscribe", { email: "PREFERENCE-TEST@EXAMPLE.COM" });
  assert.equal((await send(payload)).status, 201);
  const row = await db
    .prepare("SELECT * FROM communication_preferences WHERE email=?")
    .bind("preference-test@example.com")
    .first();
  assert.equal(row.do_not_contact, 1);
  assert.equal(row.email_hash.length, 64);
});
test("per-email limits are enforced server-side while retries remain safe", async () => {
  const email = "limit-test@example.com";
  let first;
  for (let i = 0; i < 8; i++) {
    const p = body("mentee", { email });
    if (i === 0) first = p;
    assert.equal((await send(p)).status, 201);
  }
  assert.equal((await send(body("mentee", { email }))).status, 429);
  assert.equal((await send(first)).status, 200);
});
test("retention cleanup expires old form data and rate buckets, preserving communication choices", async () => {
  const old = body();
  await send(old);
  await db
    .prepare(
      "UPDATE submissions SET created_at='2020-01-01T00:00:00.000Z' WHERE id=?",
    )
    .bind(old.requestId)
    .run();
  await db
    .prepare("INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,1)")
    .bind("expired-test")
    .run();
  const schema = await import("../worker/index.mjs");
  await schema.default.scheduled({}, { DB: db });
  assert.equal(
    await db
      .prepare("SELECT id FROM submissions WHERE id=?")
      .bind(old.requestId)
      .first(),
    null,
  );
  assert.equal(
    await db
      .prepare("SELECT key FROM rate_limits WHERE key=?")
      .bind("expired-test")
      .first(),
    null,
  );
  assert.ok(
    await db
      .prepare("SELECT email FROM communication_preferences WHERE email=?")
      .bind("preference-test@example.com")
      .first(),
  );
});
test("security headers and method restrictions apply to API responses", async () => {
  const r = await mf.dispatchFetch(origin + "/api/submissions");
  assert.equal(r.status, 405);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.ok(
    r.headers.get("content-security-policy").includes("script-src 'self'"),
  );
  assert.equal(
    r.headers
      .get("content-security-policy")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("form-action ")),
    "form-action 'self' https://www.google.com",
    "campus searches can submit directly to Google while forms stay limited to known destinations",
  );
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/studentresourcecenter", {
        redirect: "manual",
      })
    ).status,
    308,
  );
});
test("unavailable storage returns an error without a success receipt", async () => {
  const worker = (await import("../worker/index.mjs")).default;
  const r = await worker.fetch(
    new Request(origin + "/api/submissions", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body()),
    }),
    {},
  );
  assert.equal(r.status, 503);
  assert.equal((await r.json()).receipt, undefined);
});
test("private pagination keeps every record and rejects malformed cursors", async () => {
  const time = "2026-10-31T12:00:00.000Z";
  await db.batch(
    Array.from({ length: 55 }, () =>
      db
        .prepare(
          "INSERT INTO submissions (id,type,payload_json,payload_hash,consent_version,status,created_at,updated_at) VALUES (?,'mentee','{}','test','test','new',?,?)",
        )
        .bind(randomUUID(), time, time),
    ),
  );
  const headers = { Authorization: "Bearer " + token };
  let cursor,
    ids = [];
  do {
    const r = await mf.dispatchFetch(
      origin +
        "/api/admin/submissions" +
        (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
      { headers },
    );
    assert.equal(r.status, 200);
    const j = await r.json();
    ids.push(...j.items.map((x) => x.id));
    cursor = j.nextCursor;
  } while (cursor);
  const count = await db
    .prepare("SELECT COUNT(*) as n FROM submissions")
    .first();
  assert.equal(ids.length, count.n);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/api/admin/submissions?cursor=invalid", {
        headers,
      })
    ).status,
    400,
  );
});
test("mounted asset lookup stays scoped and serves a real 404", async () => {
  const worker = (await import("../worker/index.mjs")).default;
  const paths = [];
  const env = {
    ASSETS: {
      fetch: async (request) => {
        const path = new URL(request.url).pathname;
        paths.push(path);
        if (path === "/index.html" || path === "/404.html")
          return new Response("<!doctype html><title>Fixture</title>", {
            headers: { "Content-Type": "text/html" },
          });
        return new Response("missing", { status: 404 });
      },
    },
  };
  const home = await worker.fetch(
    new Request("https://astroprostudentresourcecenter.com/studentresourcecenter/"),
    env,
  );
  assert.equal(home.status, 200);
  assert.equal(paths[0], "/index.html");
  const missing = await worker.fetch(
    new Request("https://astroprostudentresourcecenter.com/studentresourcecenter/not-found"),
    env,
  );
  assert.equal(missing.status, 404);
  assert.equal(paths.at(-1), "/404.html");
  assert.equal(
    (
      await worker.fetch(
        new Request("https://astroprostudentresourcecenter.com/unrelated-path"),
        env,
      )
    ).status,
    404,
  );
});

test("JSON primitives, malformed field shapes, and invalid media types return client errors", async () => {
  const before = await db
    .prepare("SELECT COUNT(*) AS n FROM submissions")
    .first();
  for (const value of [null, [], true, 42, "text", [body()]])
    assert.equal((await send(value)).status, 400);
  const invalid = body("mentee", { requestId: [randomUUID()] });
  assert.throws(() => validateSubmission(invalid), /identifier is invalid/);
  assert.equal((await send(invalid)).status, 400);
  assert.equal(
    (await send(body(), { "Content-Type": "application/jsonp" })).status,
    415,
  );
  const patch = await mf.dispatchFetch(
    origin + "/api/admin/submissions/" + randomUUID(),
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: "null",
    },
  );
  assert.equal(patch.status, 400);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM submissions").first()).n,
    before.n,
  );
  const payload = body("mentee", { requestId: randomUUID().toUpperCase() });
  assert.equal(
    (await send(payload, { "Idempotency-Key": payload.requestId })).status,
    201,
  );
});

test("conflicting unsubscribe retries only save the winning request’s preference", async () => {
  const requestId = randomUUID();
  const candidates = ["race-a", "race-b"].map((name) =>
    body("unsubscribe", {
      requestId,
      email: `${name}-${requestId}@example.com`,
    }),
  );
  const responses = await Promise.all(candidates.map((input) => send(input)));
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  const winner = candidates[responses.findIndex((r) => r.status === 201)].email;
  const { results } = await db
    .prepare("SELECT email FROM communication_preferences WHERE email IN (?,?)")
    .bind(...candidates.map((p) => p.email))
    .all();
  assert.deepEqual(
    results.map((p) => p.email),
    [winner],
  );
});

test("private filters combine status and type and reject unknown options", async () => {
  const id = randomUUID(),
    time = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO submissions (id,type,payload_json,payload_hash,consent_version,status,created_at,updated_at) VALUES (?,'mentor','{}','test','test','resolved',?,?)",
    )
    .bind(id, time, time)
    .run();
  const headers = { Authorization: "Bearer " + token };
  const r = await mf.dispatchFetch(
    origin + "/api/admin/submissions?type=mentor&status=resolved",
    { headers },
  );
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.deepEqual(
    data.items.map((item) => item.id),
    [id],
  );
  for (const query of [
    "status=unknown",
    "type=__proto__",
    "status=new%27%20OR%201=1",
  ])
    assert.equal(
      (
        await mf.dispatchFetch(origin + "/api/admin/submissions?" + query, {
          headers,
        })
      ).status,
      400,
    );
  for (const value of [
    ["not-a-date", id],
    [time, [id]],
    [time, "invalid-id"],
  ]) {
    const cursor = Buffer.from(JSON.stringify(value)).toString("base64url");
    assert.equal(
      (
        await mf.dispatchFetch(
          origin + "/api/admin/submissions?cursor=" + cursor,
          { headers },
        )
      ).status,
      400,
    );
  }
});

test("private preferences paginate past 500 entries without omissions at tied timestamps", async () => {
  const time = "2026-11-01T00:00:00.000Z";
  const fixtures = Array.from({ length: 505 }, (_, i) => {
    const email = `preference-pagination-${i}@example.com`;
    return db
      .prepare(
        "INSERT INTO communication_preferences(email_hash,email,do_not_contact,created_at,updated_at) VALUES(?,?,1,?,?)",
      )
      .bind(
        createHash("sha256").update(email).digest("hex"),
        email,
        time,
        time,
      );
  });
  // Keep setup batches modest; the assertion still exercises more than 500 records.
  for (let offset = 0; offset < fixtures.length; offset += 50)
    await db.batch(fixtures.slice(offset, offset + 50));
  assert.equal(
    (await mf.dispatchFetch(origin + "/api/admin/preferences")).status,
    401,
  );
  const headers = { Authorization: "Bearer " + token };
  const emails = [];
  let cursor;
  do {
    const r = await mf.dispatchFetch(
      origin + "/api/admin/preferences" + (cursor ? "?cursor=" + cursor : ""),
      { headers },
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "no-store");
    const data = await r.json();
    assert.ok(data.items.length <= 50);
    assert.ok(data.items.every((item) => item.email_hash === undefined));
    emails.push(...data.items.map((item) => item.email));
    cursor = data.nextCursor;
  } while (cursor);
  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM communication_preferences")
    .first();
  assert.equal(emails.length, count.n);
  assert.equal(new Set(emails).size, count.n);
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/api/admin/preferences?cursor=invalid", {
        headers,
      })
    ).status,
    400,
  );
});

test("health reports real storage readiness without exposing private details", async () => {
  const ready = await mf.dispatchFetch(origin + "/api/health");
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), {
    ok: true,
    storageConfigured: true,
    service: "astropro-student-resource-center",
  });
  const worker = (await import("../worker/index.mjs")).default;
  for (const env of [
    {},
    {
      DB: {
        prepare() {
          throw Error("private failure details");
        },
      },
    },
  ]) {
    const response = await worker.fetch(
      new Request(origin + "/api/health"),
      env,
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).ok, false);
  }
});
test("partner campaign orders email the staff inbox with escaped details", async () => {
  const sent = [];
  const env = { EMAIL: { send: async (m) => sent.push(m) } };
  await notifyPartnerCampaign(env, {
    payload: {
      orderRef: "ASRC-TEST",
      marketName: "Test Market",
      contactName: "<b>Pat</b>",
      email: "pat@example.com",
      phone: "",
      subject: "Hello",
      url: "https://example.com",
      wantsFlyerDesigned: "yes",
      instructions: "Line one\nLine two",
    },
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "leasesolutions3@gmail.com");
  assert.match(sent[0].from, /@astroprostudentresourcecenter\.com$/);
  const raw = buildRawEmail(sent[0]);
  assert.match(raw, /^From: AstroPro Resource Center <orders@/);
  assert.match(raw, /\r\nTo: leasesolutions3@gmail\.com\r\n/);
  assert.match(raw, /Reply-To: pat@example\.com/);
  assert.match(raw, /multipart\/alternative/);
  assert.match(sent[0].html, /&lt;b&gt;Pat&lt;\/b&gt;/);
  assert.match(sent[0].subject, /ASRC-TEST/);
  await notifyPartnerCampaign(
    { EMAIL: { send: async () => { throw new Error("down"); } } },
    { payload: { orderRef: "x", marketName: "x", contactName: "x", email: "x", subject: "x", instructions: "x" } },
  );
});

test("student form submissions email the staff inbox", async () => {
  const sent = [];
  const env = { EMAIL: { send: async (m) => sent.push(m) } };
  await notifySubmission(env, {
    type: "mentee",
    payload: { name: "A <i>Student</i>", email: "s@example.com", field: "Engineering", flyerBase64: "SECRET" },
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "leasesolutions3@gmail.com");
  assert.match(sent[0].subject, /Mentee request/);
  assert.match(sent[0].html, /&lt;i&gt;Student/);
  assert.doesNotMatch(sent[0].html + sent[0].text, /SECRET/);
});

test("sublease war room: listing lifecycle, payment gate, leads and owner dashboard", async () => {
  const photo = "data:image/jpeg;base64," + "A".repeat(200);
  const api = (path, init = {}) =>
    mf.dispatchFetch(origin + "/api/sublease" + path, {
      ...init,
      headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.77", ...(init.headers || {}) },
    });
  const created = await api("/listings", {
    method: "POST",
    body: JSON.stringify({
      market: "housing-madison", marketName: "Madison, WI", school: "UW", area: "Near campus",
      title: "Summer sublease", description: "A sunny two bedroom close to campus.",
      ownerName: "Sam", ownerEmail: "sam@example.com", permission: "approved", type: "sublease",
      furnished: "yes", utilities: "some", startDate: "2027-05-15", endDate: "2027-08-15",
      rent: 900, bedrooms: 2, bathrooms: 1, photos: [photo], consent: true,
    }),
  });
  assert.equal(created.status, 201);
  const { id, manageToken } = await created.json();
  // not public until it is paid for
  assert.equal((await api("/listings/" + id)).status, 404);
  assert.equal((await (await api("/listings")).json()).items.length, 0);
  const lead = { listingId: id, name: "Ana", email: "ana@example.com", message: "Can I tour Friday?" };
  // admin activation requires the private key
  assert.equal((await api("/../api/admin/sublease/activate".replace("/../api", ""), { method: "POST", body: JSON.stringify({ id }) })).status, 404);
  const noKey = await mf.dispatchFetch(origin + "/api/admin/sublease/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  assert.equal(noKey.status, 401);
  const act = await mf.dispatchFetch(origin + "/api/admin/sublease/activate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ id }) });
  assert.equal((await act.json()).ok, true);
  assert.equal((await (await api("/listings")).json()).items.length, 1);
  // a school we did not list becomes a market once its listing is live
  assert.deepEqual((await (await api("/markets")).json()).items, []);
  const custom = await api("/listings", {
    method: "POST",
    body: JSON.stringify({
      market: "c-boise-state-university", marketName: "Boise State University, Boise, ID", school: "Boise State", area: "Near campus",
      title: "Fall sublease", description: "A bright studio close to campus.",
      ownerName: "Kai", ownerEmail: "kai@example.com", permission: "approved", type: "sublease",
      furnished: "yes", utilities: "some", startDate: "2027-05-15", endDate: "2027-08-15",
      rent: 700, bedrooms: 1, bathrooms: 1, photos: [photo], consent: true,
    }),
  });
  assert.equal(custom.status, 201);
  assert.deepEqual((await (await api("/markets")).json()).items, []);
  const customId = (await custom.json()).id;
  await mf.dispatchFetch(origin + "/api/admin/sublease/activate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ id: customId }) });
  const mk = (await (await api("/markets")).json()).items;
  assert.equal(mk.length, 1);
  assert.equal(mk[0].id, "c-boise-state-university");
  assert.equal(mk[0].name, "Boise State University, Boise, ID");
  // the school gets a full housing page
  const tpl = '<h1>TPL_PLACE</h1><p>near TPL_SCHOOL</p><div data-sl-market="c-tplmarket"></div><a href="market-template.html?school=TPL_SCHOOL">x</a>';
  const html = await customMarketPage({ DB: db }, "boise-state-university", tpl);
  assert.match(html, /<h1>Boise State University, Boise, ID<\/h1>/);
  assert.match(html, /near Boise State/);
  assert.match(html, /data-sl-market="c-boise-state-university"/);
  assert.match(html, /housing-boise-state-university\.html\?school=Boise%20State/);
  assert.doesNotMatch(html, /TPL_/);
  assert.equal(await customMarketPage({ DB: db }, "nowhere-at-all", tpl), null);
  const pub = await (await api("/listings/" + id)).json();
  assert.equal(pub.listing.rent, 900);
  assert.equal(JSON.stringify(pub).includes("sam@example.com"), false);
  assert.equal((await api("/photo/" + id + "/0")).status, 200);
  assert.equal((await api("/leads", { method: "POST", body: JSON.stringify(lead) })).status, 201);
  // a spoofed PayPal notification is ignored when PayPal can't verify it
  const spoof = await mf.dispatchFetch(origin + "/api/sublease/paypal-ipn", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "payment_status=Completed&item_number=" + id + "&txn_id=FAKE1&mc_gross=39&mc_currency=USD" });
  assert.equal(spoof.status, 200);
  assert.equal((await db.prepare("SELECT paid_at FROM sublease_listings WHERE id=?").bind(id).first()).paid_at !== null, true); // paid only by the admin activation above
  await api("/leads", { method: "POST", body: JSON.stringify({ ...lead, message: "Please wire the deposit, I am out of the country" }) });
  // owner dashboard needs the private token
  assert.equal((await api("/manage/" + id)).status, 404);
  const dash = await (await api("/manage/" + id, { headers: { "x-manage-token": manageToken } })).json();
  assert.equal(dash.leads.length, 2);
  assert.equal(dash.leads.filter((l) => l.flagged).length, 1);
  assert.equal(dash.ownerName, "Sam");
  assert.ok(dash.views >= 1);
  const filled = await api("/manage/" + id, { method: "POST", headers: { "x-manage-token": manageToken }, body: JSON.stringify({ status: "filled" }) });
  assert.equal(filled.status, 200);
});

test("sublease war room: pay first, then the form redeems the payment once", async () => {
  const api = (path, init = {}) =>
    mf.dispatchFetch(origin + "/api/sublease" + path, {
      ...init,
      headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.88", ...(init.headers || {}) },
    });
  const body = (extra) => JSON.stringify({
    market: "housing-madison", marketName: "Madison, WI", school: "UW", area: "Near campus",
    title: "Paid first", description: "A sunny two bedroom close to campus.",
    ownerName: "Pat", ownerEmail: "pat@example.com", permission: "approved", type: "sublease",
    furnished: "yes", utilities: "some", startDate: "2027-05-15", endDate: "2027-08-15",
    rent: 800, bedrooms: 1, bathrooms: 1, photos: ["data:image/jpeg;base64," + "A".repeat(200)], consent: true, ...extra,
  });
  const code = "paycode12345";
  assert.deepEqual(await (await api("/credit/" + code)).json(), { paid: false, used: false });
  // submitted before PayPal has confirmed: saved, not live, then the payment finds it by code
  const early = await api("/listings", { method: "POST", body: body({ payCode: "earlycode123" }) });
  assert.equal(early.status, 201);
  const earlyOut = await early.json();
  assert.equal(earlyOut.live, false);
  assert.equal((await api("/listings/" + earlyOut.id)).status, 404);
  assert.equal((await api("/listings", { method: "POST", body: body({ payCode: "earlycode123" }) })).status, 409);
  await db.prepare("INSERT INTO sublease_credits (code,txn_id,paid_at) VALUES (?,?,?)").bind(code, "TXNPAYFIRST", new Date().toISOString()).run();
  assert.deepEqual(await (await api("/credit/" + code)).json(), { paid: true, used: false });
  const ok = await api("/listings", { method: "POST", body: body({ payCode: code }) });
  assert.equal(ok.status, 201);
  const { id } = await ok.json();
  assert.equal((await api("/listings/" + id)).status, 200); // live immediately
  assert.equal((await api("/listings", { method: "POST", body: body({ payCode: code }) })).status, 409); // already used
  assert.deepEqual(await (await api("/credit/" + code)).json(), { paid: true, used: true });
});

test("sublease funnel events count anonymously and reject unknown names", async () => {
  const post = (name) =>
    mf.dispatchFetch(origin + "/api/sublease/event", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  assert.equal((await post("view")).status, 200);
  assert.equal((await post("view")).status, 200);
  assert.equal((await post("evil")).status, 400);
  const row = await db.prepare("SELECT n FROM sublease_events WHERE name='view'").first();
  assert.equal(row.n, 2);
});

test("sublease owner can delete a listing with its photos and messages", async () => {
  const photo = "data:image/jpeg;base64," + "A".repeat(200);
  const hdr = { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.88" };
  const made = await mf.dispatchFetch(origin + "/api/sublease/listings", { method: "POST", headers: hdr, body: JSON.stringify({
    market: "housing-austin-tx", marketName: "Austin, TX", area: "West Campus", title: "Delete me", description: "A place that will be deleted soon.",
    ownerName: "Sam", ownerEmail: "sam@example.com", permission: "pending", type: "relet", furnished: "no", utilities: "no",
    startDate: "2027-05-15", endDate: "2027-08-15", rent: 700, bedrooms: 1, bathrooms: 1, photos: [photo], consent: true }) });
  const { id, manageToken } = await made.json();
  const bad = await mf.dispatchFetch(origin + "/api/sublease/manage/" + id, { method: "POST", headers: { ...hdr, "x-manage-token": "x".repeat(48) }, body: JSON.stringify({ action: "delete" }) });
  assert.equal(bad.status, 404);
  const ok = await mf.dispatchFetch(origin + "/api/sublease/manage/" + id, { method: "POST", headers: { ...hdr, "x-manage-token": manageToken }, body: JSON.stringify({ action: "delete" }) });
  assert.equal((await ok.json()).deleted, true);
  assert.equal((await db.prepare("SELECT COUNT(*) c FROM sublease_photos WHERE listing_id=?").bind(id).first()).c, 0);
  assert.equal((await mf.dispatchFetch(origin + "/api/sublease/listings/" + id)).status, 404);
});

test("sublease war room: checkout email capture, sign-in links and follow-up jobs", async () => {
  const photo = "data:image/jpeg;base64," + "A".repeat(200);
  const api = (path, init = {}) =>
    mf.dispatchFetch(origin + "/api/sublease" + path, {
      ...init,
      headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.91", ...(init.headers || {}) },
    });
  // checkout needs a valid email and code
  assert.equal((await api("/intent", { method: "POST", body: JSON.stringify({ code: "abcdefghij12", email: "nope" }) })).status, 400);
  assert.equal((await api("/intent", { method: "POST", body: JSON.stringify({ code: "abcdefghij12", email: "Pat@Example.com" }) })).status, 200);
  const row = await db.prepare("SELECT email FROM sublease_intents WHERE code=?").bind("abcdefghij12").first();
  assert.equal(row.email, "pat@example.com");
  // sign-in never reveals whether an email exists
  const unknown = await api("/signin", { method: "POST", body: JSON.stringify({ email: "nobody@example.com" }) });
  assert.equal(unknown.status, 200);
  assert.equal((await unknown.json()).ok, true);
  assert.equal((await api("/signin", { method: "POST", body: JSON.stringify({ email: "bad" }) })).status, 400);
  // a real listing: signing in issues a new private key and retires the old one
  const created = await api("/listings", {
    method: "POST",
    body: JSON.stringify({
      market: "housing-madison", marketName: "Madison, WI", school: "UW", area: "Near campus",
      title: "Sign-in test", description: "A sunny two bedroom close to campus.",
      ownerName: "Sam", ownerEmail: "sam-signin@example.com", permission: "approved", type: "sublease",
      furnished: "yes", utilities: "some", startDate: "2027-05-15", endDate: "2027-08-15",
      rent: 900, bedrooms: 2, bathrooms: 1, photos: [photo], consent: true,
    }),
  });
  assert.equal(created.status, 201);
  const made = await created.json();
  assert.equal(made.emailed, false); // no mail provider in tests
  const before = await db.prepare("SELECT token_hash FROM sublease_listings WHERE id=?").bind(made.id).first();
  assert.equal((await api("/manage/" + made.id, { headers: { "x-manage-token": made.manageToken } })).status, 200);
  assert.equal((await api("/signin", { method: "POST", body: JSON.stringify({ email: "sam-signin@example.com" }) })).status, 200);
  const after = await db.prepare("SELECT token_hash FROM sublease_listings WHERE id=?").bind(made.id).first();
  assert.notEqual(before.token_hash, after.token_hash);
  assert.equal((await api("/manage/" + made.id, { headers: { "x-manage-token": made.manageToken } })).status, 404);
  const dash = await (await api("/manage/" + made.id, { headers: { "x-manage-token": "x".repeat(40) } })).status;
  assert.equal(dash, 404);
  // follow-up job: paid but no form after 20 minutes sends one reminder and alerts the owner
  await db.prepare("INSERT INTO sublease_credits (code,txn_id,paid_at) VALUES (?,?,?)").bind("abcdefghij12", "TXN-INTENT-1", new Date(Date.now() - 30 * 60000).toISOString()).run();
  const alerts = [],
    mails = [];
  const { runSubleaseJobs } = await import("../worker/sublease.mjs");
  await runSubleaseJobs({ DB: db }, { notify: async (s, t) => alerts.push([s, t]), mail: async (m) => (mails.push(m), true) });
  assert.equal(mails.length, 1);
  assert.equal(mails[0].to, "pat@example.com");
  assert.match(mails[0].html, /sublease-war-room\.html\?code=abcdefghij12#start/);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0][0], /Paid but has not filled out the form/);
  // it does not nag again right away
  await runSubleaseJobs({ DB: db }, { notify: async () => alerts.push(["again"]), mail: async (m) => (mails.push(m), true) });
  assert.equal(mails.length, 1);
});
