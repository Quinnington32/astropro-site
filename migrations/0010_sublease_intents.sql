-- Who started checkout, so we can follow up and email the form link
CREATE TABLE IF NOT EXISTS sublease_intents (
  code TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  owner_alerted INTEGER NOT NULL DEFAULT 0,
  abandon_sent INTEGER NOT NULL DEFAULT 0,
  reminders INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sublease_intents_email ON sublease_intents (email);
