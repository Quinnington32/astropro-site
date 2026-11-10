import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  checkedContext,
  uploadedVersion,
  publishCheckedBuild,
  ACCOUNT,
  WORKER,
  REPOSITORY,
} from "../scripts/deploy-ci.mjs";

const commit = "a".repeat(40),
  newer = "b".repeat(40);
const version = "12345678-1234-4234-8234-123456789abc";
const env = {
  GITHUB_ACTIONS: "true",
  GITHUB_REF: "refs/heads/main",
  GITHUB_EVENT_NAME: "push",
  GITHUB_REPOSITORY: REPOSITORY,
  GITHUB_SHA: commit,
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
  CLOUDFLARE_API_TOKEN: "synthetic-test-token",
  GH_TOKEN: "synthetic-read-only-job-token",
};
const record = (extra = {}) =>
  JSON.stringify({
    type: "version-upload",
    worker_name: WORKER,
    version_id: version,
    ...extra,
  }) + "\n";
const head = (sha) => async () => Response.json({ object: { sha } });
const readManifest = async () => ({ sourceCommit: commit });

test("production context rejects pull requests, other repositories, and missing credentials", () => {
  assert.equal(checkedContext(env), commit);
  for (const change of [
    { GITHUB_EVENT_NAME: "pull_request" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_REPOSITORY: "someone/else" },
    { GITHUB_SHA: "invalid" },
    { CLOUDFLARE_ACCOUNT_ID: "wrong" },
    { CLOUDFLARE_API_TOKEN: "" },
    { GH_TOKEN: "" },
  ])
    assert.throws(() => checkedContext({ ...env, ...change }));
});

test("version output cannot promote an unrelated or ambiguous upload", () => {
  assert.equal(uploadedVersion(record()), version);
  for (const output of [
    "",
    record({ worker_name: "another-worker" }),
    record({ version_id: "--latest" }),
    record() + record(),
  ])
    assert.throws(() => uploadedVersion(output));
});

test("a stale main build cannot upload or publish", async () => {
  let calls = 0;
  const result = await publishCheckedBuild({
    env,
    fetcher: head(newer),
    readManifest,
    runWrangler: async () => {
      calls++;
    },
  });
  assert.equal(result.deployed, false);
  assert.equal(calls, 0);
});

test("mismatched source metadata and failed branch lookups block publication", async () => {
  let calls = 0;
  const runWrangler = async () => {
    calls++;
  };
  await assert.rejects(
    publishCheckedBuild({
      env,
      fetcher: head(commit),
      readManifest: async () => ({ sourceCommit: newer }),
      runWrangler,
    }),
    /built files/,
  );
  await assert.rejects(
    publishCheckedBuild({
      env,
      fetcher: async () => new Response("unavailable", { status: 503 }),
      readManifest,
      runWrangler,
    }),
    /current main commit/,
  );
  assert.equal(calls, 0);
});

test("only this run's uploaded version is promoted, with routing left alone", async () => {
  const calls = [];
  const result = await publishCheckedBuild({
    env,
    fetcher: head(commit),
    readManifest,
    runWrangler: async (args, processEnv) => {
      calls.push(args);
      if (args[1] === "upload")
        await writeFile(processEnv.WRANGLER_OUTPUT_FILE_PATH, record());
    },
  });
  assert.deepEqual(result, { deployed: true, commit, version });
  assert.deepEqual(
    calls.map((args) => args.slice(0, 2)),
    [
      ["versions", "upload"],
      ["versions", "deploy"],
    ],
  );
  assert.ok(calls[1].includes(version + "@100"));
  assert.ok(
    calls.every((args) => !args.includes("triggers") && !args.includes("d1")),
  );
});

test("main changing during upload prevents that obsolete version going live", async () => {
  let heads = 0,
    calls = 0;
  const result = await publishCheckedBuild({
    env,
    fetcher: async () =>
      Response.json({ object: { sha: ++heads === 1 ? commit : newer } }),
    readManifest,
    runWrangler: async (_args, processEnv) => {
      calls++;
      await writeFile(processEnv.WRANGLER_OUTPUT_FILE_PATH, record());
    },
  });
  assert.equal(result.deployed, false);
  assert.equal(calls, 1);
});
