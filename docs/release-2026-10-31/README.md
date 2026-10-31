# Student Resource Center production release — October 31, 2026

Published to **https://students.goastropro.com/**. The requested **https://goastropro.com/studentresourcecenter/** entry reaches this canonical address through the pre-existing HighLevel redirect and a narrowly scoped Worker route on `astropromarketing.com`. Both main-site roots retain their existing behavior.

Latest Cloudflare Worker version: `bf899662-fc0d-46d7-9085-c30a60a9223f`. Initial release version: `43304e77-5b2f-488b-90a3-c2f5a745807a`. Dedicated D1 database: `c4a3ed6f-7f10-490e-9c09-d3db46448850`. No existing AstroPro application database, marketing list, or mail routing was changed.

## Result

- Shared templates, styling, navigation, metadata, and structured records replace the 49 duplicated original page implementations.
- 54 generated pages (53 content pages plus a 404), 50 scholarship records, 66 career programs, 31 discount resources, and 34 housing markets with 107 property research cards. 92 properties have official property/operator links; the remaining entries clearly identify Maps searches as unverified lookups.
- Search includes full eligibility/description text. Category and application-window filters combine, source ordering restores correctly, and full card text remains readable.
- Browser-local saved lists work across pages and reloads, with export/import and explicit storage-failure messaging. No account or email subscription is implied.
- Five form types persist in private D1 storage and return real receipts. Server validation, explicit consent, same-origin checks, honeypot, per-email/network/global limits, stable retry IDs, private staff authorization, pagination, review status, and 90-day form retention are implemented.
- No fabricated partner placements, unsourced Google ratings/distances/rankings, immediate mentor matches, active/live opportunity counts, million-student reach claim, or automatic marketing enrollment. Source-supported corrections and withheld resources are recorded in the research JSON files.
- Root `index.html`, `404.html`, and `legacy-redirect.js` preserve the old GitHub Pages entry/bookmarks after source is merged. GitHub Pages remains a redirect entry, not a second API-less copy of the application.

## Verification

The initial `npm run check` passed 12 Workers/D1 tests and the generated-page audit (1,944 local links/assets, unique resource IDs, form labels, landmarks, metadata, anchors, and catalog URL validation). The hardening release below expands this to 21 tests.

`verification.json` records production acceptance: every one of the 54 HTML files matched the checked local build byte-for-byte; nine shared assets/downloads matched; five synthetic form submissions were visible in the authenticated inbox; identical retries returned the existing receipts; review status updates worked; unauthenticated inbox access returned401; unknown pages returned404; and the suggested path resolved to the canonical domain. Only those exact synthetic records/preferences were removed afterward.

Browser QA exercised mobile navigation, full-text scholarship search, corrected essay categories, empty/reset states, save/reload, export/import, original housing sort restoration, campus-resource search, and a receipt-backed local form. All 53 content pages passed a390px-wide rendering sweep; seven representative pages also passed320px. Actual physical-phone testing is separate from these browser viewport checks.

The final external check covered286 destinations with zero confirmed404/410 responses. See `external-link-summary.json` for blocked/unverified responses. A responding URL does not establish current program availability. All50 published scholarships and31 discount records have dated source reviews;20 career-program records received detailed current-source corrections, while the others remain explicitly sponsor-directed program discovery entries.

## Operation

The private review inbox is `/admin.html`; staff use the locally saved private key, or run `npm run inbox`. The key is ignored, mode0600 locally, installed as a Worker secret, and absent from the repository and public bundle. See the root README for access and deployment instructions.

The inbox is the delivery destination. Email, CRM enrollment, automatic matching, and a separate HighLevel mailing-list unsubscribe integration are not claimed or enabled. Staff must review requests and follow up; data access/correction/deletion requires identity verification and a deliberate authorized operation. An email preference here applies to this service’s own records.

## Launch hardening and partner handoff

The latest Worker version above includes these additional fixes:

- JSON primitives/arrays, malformed request identifiers, and incorrect media types return explicit client errors. Uppercase UUIDs work consistently with their idempotency headers.
- Conflicting simultaneous unsubscribe requests cannot write the losing request's communication preference.
- The health endpoint performs a real database read and returns 503 for missing or unavailable storage.
- Staff can combine status/type filters, reopen requests, and view paginated do-not-contact preferences. Preference retrieval no longer silently stops at 500 entries.
- Locking aborts pending private requests and rejects late responses. The inbox also locks after 15 minutes without activity. Requests time out with a retry path.
- The shared header wraps correctly on very narrow or zoomed layouts. All 53 content pages passed a 320 CSS-pixel browser sweep; the authenticated staff view also passed at 390, 320, and 267 CSS pixels. Keyboard opening and Escape closing of the mobile menu were verified.

`npm run check` now passes 21 tests plus the same 54-page/1,944-reference audit. `npm audit` reports zero vulnerabilities. `hardening-verification.json` records 54 production HTML byte matches, 10 asset/download byte matches, storage readiness, invalid-body 400, unauthorized private API 401, missing-page 404, compatibility routing, and five durable form receipts with safe retries. Only the exact synthetic production fixtures were removed, and their absence was verified. The 55 synthetic local browser-test fixtures were also removed while preserving the pre-existing local record.

See [the operating guide](../OPERATIONS.md) for daily review, content upkeep, deployment, and recovery procedures. This release changes no database schema.
