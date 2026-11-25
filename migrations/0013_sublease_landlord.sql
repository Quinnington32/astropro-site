-- Weekly landlord accountability check-ins set up by a listing owner.
CREATE TABLE IF NOT EXISTS sublease_landlord (
  listing_id TEXT PRIMARY KEY,
  landlord_email TEXT NOT NULL,
  landlord_name TEXT,
  property TEXT,
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sent INTEGER NOT NULL DEFAULT 0,
  last_sent TEXT,
  next_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
