import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const origin = "https://students.goastropro.com";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const results = [];
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
for (const file of [
  "assets/site.js",
  "assets/site.css",
  "assets/catalog.json",
  "assets/sora.woff2",
  "assets/work-sans.woff2",
  "resources/resume-template.pdf",
  "resources/resume-template.docx",
  "resources/cover-letter-template.pdf",
  "resources/cover-letter-template.docx",
]) {
  const r = await fetch(origin + "/" + file);
  assert.equal(r.status, 200, file);
  assert.equal(
    digest(Buffer.from(await r.arrayBuffer())),
    digest(await readFile("dist/" + file)),
    file,
  );
}
assert.equal((await fetch(origin + "/does-not-exist-asrc-check")).status, 404);
assert.equal((await fetch(origin + "/api/admin/submissions")).status, 401);
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
  origin,
  pages: results.length,
  assetByteChecks: 9,
  aliasFinal: alias.url,
  unauthorizedInboxStatus: 401,
  missingPageStatus: 404,
  receipts,
  checks: results,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/production-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(
  `Production verified: ${results.length} pages match the checked build; 9 assets/downloads match; alias, 404 and private access checks pass; ${receipts.length} form receipts confirmed.`,
);
