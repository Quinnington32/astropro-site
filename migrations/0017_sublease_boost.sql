-- AstroPro's own promotion of a listing (shares to Facebook groups in the student's city), shown in the War Room command center.
CREATE TABLE IF NOT EXISTS sublease_boost (
  listing_id TEXT PRIMARY KEY,
  groups INTEGER NOT NULL DEFAULT 0,
  last_at TEXT,
  note TEXT
);
