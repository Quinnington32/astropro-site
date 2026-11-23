-- Anonymous daily funnel counts for the Sublease War Room. No personal data.
CREATE TABLE IF NOT EXISTS sublease_events (
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name)
);
