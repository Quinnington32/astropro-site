-- A listing can be submitted while its pay-first PayPal payment is still being confirmed. The payment finds it by this code.
ALTER TABLE sublease_listings ADD COLUMN pay_code TEXT;
CREATE INDEX IF NOT EXISTS sublease_listings_pay_code ON sublease_listings(pay_code) WHERE pay_code IS NOT NULL;
