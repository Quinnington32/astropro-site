import { test } from "node:test";
import assert from "node:assert/strict";
import { validateListing, validateLead, ipnDecision } from "../worker/sublease.mjs";
const photo = "data:image/jpeg;base64," + "A".repeat(100);
const good = () => ({
  market: "housing-madison", marketName: "Madison, WI", school: "UW", area: "Near campus",
  title: "Summer sublease", description: "A sunny two bedroom close to campus.",
  ownerName: "Sam", ownerEmail: "SAM@Example.com", permission: "approved", type: "sublease",
  furnished: "yes", utilities: "some", startDate: "2027-05-15", endDate: "2027-08-15",
  rent: "900", deposit: "", bedrooms: "2", bathrooms: "1", photos: [photo], consent: true,
});
test("accepts a valid listing and lowercases email", () => {
  const { data, photos } = validateListing(good());
  assert.equal(data.ownerEmail, "sam@example.com");
  assert.equal(data.rent, 900);
  assert.equal(photos.length, 1);
});
test("rejects when the lease bans subleasing", () => {
  assert.throws(() => validateListing({ ...good(), permission: "not-allowed" }), /isn't allowed/);
});
test("rejects bad dates, missing photo and missing consent", () => {
  assert.throws(() => validateListing({ ...good(), endDate: "2027-05-01" }), /after move-in/);
  assert.throws(() => validateListing({ ...good(), photos: [] }), /photo/);
  assert.throws(() => validateListing({ ...good(), consent: false }), /right to list/);
  assert.throws(() => validateListing({ ...good(), photos: ["data:text/html;base64,AAAA"] }), /JPEG/);
});
test("flags scam-like lead messages", () => {
  const base = { listingId: "abcdefghij12", name: "A", email: "a@b.co" };
  assert.equal(validateLead({ ...base, message: "Can I tour on Friday?" }).flagged, 0);
  assert.equal(validateLead({ ...base, message: "I am out of the country, send the deposit by Zelle" }).flagged, 1);
  assert.throws(() => validateLead({ ...base, listingId: "x", message: "hello there" }), /not found/);
});

test("PayPal IPN decision checks status, receiver, currency, amount and listing", () => {
  const opts = { business: "pay@example.com", price: 39 };
  const ok = new URLSearchParams("payment_status=Completed&receiver_email=PAY@example.com&mc_currency=USD&mc_gross=39.00&item_number=abcdefghij12&txn_id=T123");
  assert.deepEqual(ipnDecision(ok, opts), { ok: true, id: "abcdefghij12", txn: "T123" });
  for (const [k, v] of [["payment_status", "Pending"], ["receiver_email", "x@evil.com"], ["mc_currency", "EUR"], ["mc_gross", "5.00"], ["item_number", "nope"], ["txn_id", ""]]) {
    const p = new URLSearchParams(ok); p.set(k, v);
    assert.equal(ipnDecision(p, opts).ok, false, k);
  }
});
