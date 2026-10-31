import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateSession } from "../src/client/private-session.js";

test("a locked inbox never starts an authenticated request", async () => {
  let calls = 0;
  const session = createPrivateSession("https://local.test/", () => {
    calls++;
  });
  await assert.rejects(session.request("submissions"), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("locking rejects a late private response even when fetch ignores abort", async () => {
  let complete, signal;
  const session = createPrivateSession("https://local.test/", (_, options) => {
    signal = options.signal;
    return new Promise((resolve) => {
      complete = resolve;
    });
  });
  session.unlock("synthetic-test-key");
  const pending = session.request("submissions");
  session.lock();
  assert.equal(signal.aborted, true);
  complete(
    Response.json({ items: [{ email: "private-fixture@example.com" }] }),
  );
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(session.unlocked, false);
});

test("reopening cannot accept a response from the previous inbox session", async () => {
  let complete;
  const calls = [];
  const session = createPrivateSession(
    "https://local.test/",
    (url, options) => {
      calls.push({
        url: url.href,
        key: options.headers.Authorization,
        cache: options.cache,
      });
      if (calls.length === 1)
        return new Promise((resolve) => {
          complete = resolve;
        });
      return Promise.resolve(Response.json({ items: [{ id: "new-session" }] }));
    },
  );
  session.unlock("old-synthetic-key");
  const old = session.request("submissions");
  session.unlock("new-synthetic-key");
  const fresh = await session.request("preferences");
  complete(Response.json({ items: [{ id: "must-never-render" }] }));
  await assert.rejects(old, { name: "AbortError" });
  assert.deepEqual(fresh.items, [{ id: "new-session" }]);
  assert.equal(calls[1].key, "Bearer new-synthetic-key");
  assert.equal(calls[1].url, "https://local.test/api/admin/preferences");
  assert.equal(calls[1].cache, "no-store");
});

test("a timed-out inbox request fails clearly and the session can retry", async () => {
  let calls = 0;
  const session = createPrivateSession(
    "https://local.test/",
    (_, { signal }) => {
      if (++calls > 1) return Promise.resolve(Response.json({ items: [] }));
      return new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    },
    5,
  );
  session.unlock("synthetic-test-key");
  await assert.rejects(session.request("submissions"), {
    name: "TimeoutError",
  });
  assert.deepEqual(await session.request("submissions"), { items: [] });
});
