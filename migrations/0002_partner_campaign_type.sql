-- Add 'partner-campaign' to the submissions.type allow-list.
-- SQLite cannot ALTER a CHECK constraint in place, so rebuild the table.
CREATE TABLE submissions_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('listing','mentee','mentor','data-request','unsubscribe','partner-campaign')),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  payload_hash TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','resolved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO submissions_new SELECT * FROM submissions;
DROP TABLE submissions;
ALTER TABLE submissions_new RENAME TO submissions;

CREATE INDEX IF NOT EXISTS submissions_created ON submissions(created_at DESC, id DESC);
