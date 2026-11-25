CREATE TABLE IF NOT EXISTS scheduled_mail (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  lines TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  send_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS scheduled_mail_due ON scheduled_mail (sent_at, send_at);
