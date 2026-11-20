-- Sublease War Room: listings, photos and leads. Kept separate from submissions
-- so the 90-day submissions cleanup never deletes a live listing.
CREATE TABLE IF NOT EXISTS sublease_listings (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment','live','paused','filled','expired')),
  market TEXT NOT NULL,
  market_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS sublease_listings_market ON sublease_listings(market, status, created_at DESC);
CREATE TABLE IF NOT EXISTS sublease_photos (
  listing_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (listing_id, n)
);
CREATE TABLE IF NOT EXISTS sublease_leads (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sublease_leads_listing ON sublease_leads(listing_id, created_at DESC);
