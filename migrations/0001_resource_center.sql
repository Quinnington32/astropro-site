CREATE TABLE IF NOT EXISTS submissions (
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL CHECK(type IN ('listing','mentee','mentor','data-request','unsubscribe')),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 payload_hash TEXT NOT NULL,
 consent_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','resolved')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS communication_preferences (
 email_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 do_not_contact INTEGER NOT NULL DEFAULT 1 CHECK(do_not_contact IN (0,1)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY,
 hits INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
