-- Engagement tracking: shares, one-time renewal, and which follow-up emails were sent.
ALTER TABLE sublease_listings ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sublease_listings ADD COLUMN renewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sublease_listings ADD COLUMN nudge_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sublease_listings ADD COLUMN renew_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sublease_listings ADD COLUMN digest_at TEXT;
