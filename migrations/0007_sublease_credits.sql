-- Pay first: a verified PayPal payment is stored as a credit, redeemed once when the owner submits the onboarding form.
CREATE TABLE IF NOT EXISTS sublease_credits (
  code TEXT PRIMARY KEY,
  txn_id TEXT NOT NULL UNIQUE,
  paid_at TEXT NOT NULL,
  listing_id TEXT
);
