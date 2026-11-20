-- Count public views of a listing so owners can see how it is doing.
ALTER TABLE sublease_listings ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
