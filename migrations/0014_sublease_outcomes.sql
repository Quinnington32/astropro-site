-- How a listing ended: did the student find someone, and through us?
CREATE TABLE IF NOT EXISTS sublease_outcomes (
  listing_id TEXT PRIMARY KEY,
  found_via TEXT NOT NULL,
  quote TEXT,
  share_ok INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
