-- Record the PayPal transaction that paid for a listing, once only.
ALTER TABLE sublease_listings ADD COLUMN txn_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sublease_listings_txn ON sublease_listings(txn_id) WHERE txn_id IS NOT NULL;
