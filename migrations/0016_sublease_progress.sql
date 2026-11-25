CREATE TABLE IF NOT EXISTS sublease_progress (
  listing_id TEXT PRIMARY KEY,
  done TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);
