CREATE TABLE highlevel_deliveries (
 submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
 contact_key TEXT NOT NULL,
 next_attempt_at INTEGER NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 contact_id TEXT,
 opportunity_id TEXT,
 synced_at TEXT,
 error_code TEXT
);
CREATE INDEX highlevel_deliveries_due ON highlevel_deliveries(next_attempt_at) WHERE synced_at IS NULL;
CREATE INDEX highlevel_deliveries_contact ON highlevel_deliveries(contact_key,lease_until) WHERE synced_at IS NULL;
