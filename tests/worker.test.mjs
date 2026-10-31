import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { randomUUID, createHash } from "node:crypto";
import { validateSubmission } from "../worker/index.mjs";
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
      modules: true,
      scriptPath: "worker/index.mjs",
      compatibilityDate: "2026-10-01",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      bindings: { ADMIN_TOKEN: token },
    }),
  );
  db = await mf.getD1Database("DB");
  const schema = await readFile("migrations/0001_resource_center.sql", "utf8");
  await db.batch(
    schema
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
  );
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
  const r = await mf.dispatchFetch(origin + "/api/submissions", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "x".repeat(17000),
  });
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
    new Request("https://goastropro.com/studentresourcecenter/"),
    env,
  );
  assert.equal(home.status, 200);
  assert.equal(paths[0], "/index.html");
  const missing = await worker.fetch(
    new Request("https://goastropro.com/studentresourcecenter/not-found"),
    env,
  );
  assert.equal(missing.status, 404);
  assert.equal(paths.at(-1), "/404.html");
  assert.equal(
    (
      await worker.fetch(
        new Request("https://goastropro.com/unrelated-path"),
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
