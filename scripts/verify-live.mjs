import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const origin = "https://students.goastropro.com";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const results = [];
const manifest = JSON.parse(await readFile("dist/build.json", "utf8"));
const liveManifest = await fetch(origin + "/build.json", {
  cache: "no-store",
  signal: AbortSignal.timeout(15000),
});
assert.equal(liveManifest.status, 200, "live release manifest");
const liveBuild = await liveManifest.json();
const expectedCommit =
  process.env.GITHUB_SHA || process.env.ASRC_EXPECTED_COMMIT;
if (expectedCommit)
  assert.equal(
    liveBuild.sourceCommit,
    expectedCommit,
    "live source commit must match the release",
  );
for (const file of (await readdir("dist")).filter((x) => x.endsWith(".html"))) {
  const response = await fetch(
    origin + "/" + (file === "index.html" ? "" : file),
    { signal: AbortSignal.timeout(15000) },
  );
  assert.equal(response.status, 200, file);
  assert.equal(
    digest(Buffer.from(await response.arrayBuffer())),
    digest(await readFile("dist/" + file)),
    file + " must match checked build",
  );
  results.push({ file, status: 200, bytesMatch: true });
}
const assetFiles = [
  "assets/site.js",
  "assets/private-session.js",
  "assets/resource-search.js",
  "assets/site.css",
  "assets/catalog.json",
  "assets/sora.woff2",
  "assets/work-sans.woff2",
  "resources/resume-template.pdf",
  "resources/resume-template.docx",
  "resources/cover-letter-template.pdf",
  "resources/cover-letter-template.docx",
  "assets/favicon.svg",
  "assets/apple-touch-icon.png",
  "assets/social-card.svg",
  "assets/social-card.png",
  ...(await readdir("dist/brand")).map((file) => "brand/" + file),
];
for (const file of assetFiles) {
  const r = await fetch(origin + "/" + file);
  assert.equal(r.status, 200, file);
  assert.equal(
    digest(Buffer.from(await r.arrayBuffer())),
    digest(await readFile("dist/" + file)),
    file,
  );
}
const brandGuide = await fetch(origin + "/brand/");
assert.equal(brandGuide.status, 200, "brand guide directory route");
assert.equal(
  digest(Buffer.from(await brandGuide.arrayBuffer())),
  digest(await readFile("dist/brand/index.html")),
  "brand guide route must match the checked guide",
);
const brandRedirect = await fetch(origin + "/brand", { redirect: "manual" });
assert.equal(brandRedirect.status, 308, "brand guide slash redirect");
assert.equal(brandRedirect.headers.get("location"), origin + "/brand/");
assert.equal((await fetch(origin + "/does-not-exist-asrc-check")).status, 404);
assert.equal((await fetch(origin + "/api/admin/submissions")).status, 401);
assert.equal((await fetch(origin + "/api/admin/preferences")).status, 401);
const health = await fetch(origin + "/api/health");
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), {
  ok: true,
  storageConfigured: true,
  service: "astropro-student-resource-center",
});
const invalidBody = await fetch(origin + "/api/submissions", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: "null",
});
assert.equal(invalidBody.status, 400);
const alias = await fetch("https://goastropro.com/studentresourcecenter/", {
  signal: AbortSignal.timeout(15000),
});
assert.equal(alias.status, 200);
assert.equal(new URL(alias.url).hostname, "students.goastropro.com");
const receipts = [];
if (process.argv.includes("--exercise-forms")) {
  const token =
    process.env.ASRC_ADMIN_TOKEN ||
    (await readFile(".dev.vars", "utf8"))
      .match(/^ADMIN_TOKEN=(.+)$/m)?.[1]
      ?.trim();
  assert.ok(token && token.length >= 32, "private staff credential required");
  const cases = [
    [
      "listing",
      {
        organization: "ASRC production acceptance fixture",
        listingType: "Scholarship",
        title: "Synthetic release verification",
        description:
          "Synthetic release verification only; not a real opportunity. No email is sent.",
        url: "https://example.com/asrc-test",
      },
    ],
    [
      "mentee",
      { name: "Synthetic release verification", field: "Synthetic test" },
    ],
    [
      "mentor",
      {
        name: "Synthetic release verification",
        field: "Synthetic test",
        availability: "One hour per month",
      },
    ],
    [
      "data-request",
      {
        requestType: "Access my information",
        description:
          "Synthetic release verification; no actual personal data request.",
      },
    ],
    ["unsubscribe", {}],
  ];
  for (const [type, fields] of cases) {
    const id = randomUUID();
    const body = {
      type,
      ...fields,
      email: `asrc-release-${id}@example.com`,
      requestId: id,
      consent: true,
    };
    const options = {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify(body),
    };
    const response = await fetch(origin + "/api/submissions", options);
    assert.equal(response.status, 201, type);
    assert.equal((await response.json()).receipt, id);
    const retry = await fetch(origin + "/api/submissions", options);
    assert.equal(retry.status, 200, type + " retry");
    assert.equal((await retry.json()).receipt, id);
    receipts.push({ id, type });
  }
  const headers = { Authorization: "Bearer " + token };
  const inbox = await fetch(origin + "/api/admin/submissions", { headers });
  assert.equal(inbox.status, 200);
  const records = (await inbox.json()).items;
  for (const { id, type } of receipts) {
    assert.ok(
      records.some((x) => x.id === id && x.type === type),
      "durable staff visibility " + type,
    );
    const updated = await fetch(origin + "/api/admin/submissions/" + id, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    assert.equal(updated.status, 200);
  }
}
const report = {
  verifiedAt: new Date().toISOString(),
  sourceCommit: liveBuild.sourceCommit || null,
  origin,
  pages: results.length,
  assetByteChecks: assetFiles.length,
  aliasFinal: alias.url,
  unauthorizedInboxStatus: 401,
  missingPageStatus: 404,
  storageReadinessStatus: 200,
  invalidBodyStatus: 400,
  receipts,
  checks: results,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/production-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(
  `Production verified: ${results.length} pages match the checked build; ${assetFiles.length} assets/downloads match; brand guide, alias, 404, storage readiness, validation and private access checks pass; ${receipts.length} form receipts confirmed.`,
);
