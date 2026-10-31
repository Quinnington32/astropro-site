# AstroPro Student Resource Center

Free student resource directory at **https://students.goastropro.com/**. Source belongs to `Quinnington32/astropro-site`; the application is hosted independently on AstroPro’s existing Cloudflare account.

## Local development

Node 22 or newer:

```sh
npm ci
npx wrangler d1 migrations apply astropro-student-resource-center --local
npm run dev
```

The preview runs at `http://localhost:4174`. Run `npm run build` after changing source content; reload the preview after rebuilding. Both `/` and `/studentresourcecenter/` work locally.

`npm run check` builds the site, runs the real Workers/D1 tests, and audits every generated page for broken local references, labels, duplicate IDs, document landmarks, metadata, and unsafe catalog URLs. GitHub Actions runs this check on pull requests and main pushes. `npm run links` checks external destinations separately and writes `artifacts/external-links.json`; bot protection, rate limits, and network failures are reported as unverified.

## Editing content

- `src/data/scholarships.json`, `internships.json`, `discounts.json`: editable listing records. Stable IDs power saved resources. Keep an ID when updating a record.
- `src/data/housing.json`: campus markets and property source URLs. Properties have market-specific IDs. Do not invent availability, prices, review scores, rankings, or partnership status.
- `src/data/excluded.json`: inherited resources withheld because a current source or offer could not be substantiated. These are not published.
- `src/content/*.html`: guide body content; corresponding JSON contains its title and description. Use `{{scholarshipCount}}` for a live listing count.
- `src/render.mjs`: shared page, form, card, and directory templates.
- `scripts/build.mjs`: page composition and generation into ignored `dist/`.
- `src/styles/site.css` and `src/client/site.js`: shared presentation and browser interactions.
- `docs/*research*.json`: dated official-source correction evidence and limitations.

Use official sponsor/provider sources. `verifiedAt` means the source was reviewed, not that an offer will remain available. Record the source and the specific verified fields. Unknown application windows should direct visitors to the sponsor rather than repeat an estimated annual date. Known expired deadlines close automatically in the UI. Do not advertise every program as currently accepting applications.

Cards render full eligibility text. Search checks names, descriptions, categories, and available state metadata. Categories and application-window filters combine. Sorting can always restore the source order. Saved resources are browser-local, with JSON export/import; they do not create an account or mailing subscription.

## Forms and private inbox

The Worker persists organization submissions, mentor/mentee interest, data requests, and communication preferences in the dedicated D1 database. Validation runs server-side. Requests require same-origin JSON and explicit consent. A receipt is returned only after storage confirms the record. Reusing the same UUID and details returns the original receipt; reusing an ID with changed details is rejected. The browser retains an uncertain attempt in tab-scoped storage for a safe retry.

Staff review is available at `/admin.html`, protected by the `ADMIN_TOKEN` Worker secret. The page is noindex; the API requires authentication regardless of whether someone knows its URL. It supports review status and paginated requests. The key stays in memory while the inbox is open and is cleared on lock or navigation.

On the deployment owner’s Mac, the private key is in this checkout’s ignored mode-0600 `.dev.vars`. It is deliberately absent from Git, build output, URLs, screenshots, and this README. Use a private environment to install the same value on another machine. The convenient authenticated CLI reads it without putting it in a URL:

```sh
npm run inbox                 # production requests
npm run inbox -- --preferences
npm run inbox -- --local      # local development database
```

Alternatively set `ASRC_ADMIN_TOKEN` in the environment. Do not paste inbox data into public issues. To use the browser inbox, copy the private access key locally into its password field; never append it to a URL.

The inbox is the delivery destination. **No automatic email, newsletter, CRM enrollment, or mentor matching is claimed or enabled.** Reviewers handle follow-up themselves. Communication preferences apply to this resource center’s database; they do not silently alter an unrelated AstroPro/HighLevel mailing list. Before fulfilling a data access, correction, or deletion request, verify the requester’s identity. Authorized staff can make verified corrections/deletions in the Cloudflare D1 console, using parameterized queries or an exact reviewed record ID.

Short-lived hashed network/email buckets limit abuse; no raw IP is stored in the application tables. A daily scheduled handler removes form records older than 90 days and expired abuse buckets. Do-not-contact preferences persist separately. New resource submissions are never automatically published. Check the inbox regularly; storing a request does not imply it has been reviewed.

## Deployment

- Worker: `astropro-student-resource-center`
- Account: `604bc8f6fd70f62522869abae693396b`
- D1: `astropro-student-resource-center` (`c4a3ed6f-7f10-490e-9c09-d3db46448850`)
- Canonical domain: `students.goastropro.com`
- Narrow compatibility routes: `astropromarketing.com/studentresourcecenter` and its children. These redirect to the canonical domain and preserve the path/query. The existing HighLevel redirect on `goastropro.com` is left in place.

```sh
npm run check
# Apply only new, reviewed migrations using a D1-authorized Cloudflare identity:
npx wrangler d1 migrations apply astropro-student-resource-center --remote
# Publish the exact checked build using a Workers/Routes-authorized identity:
npx wrangler deploy
```

This Mac’s existing `amos-setup` profile can manage D1; its `default` profile can deploy Workers/routes. Neither credential is in the repo. The private inbox key is installed as `ADMIN_TOKEN` through Wrangler’s secret command via stdin, never command-line arguments. GitHub checks do not auto-publish production; the owner’s Cloudflare credentials remain local.

Keep deployment IDs and verification evidence in a release receipt. Validate the canonical domain, the compatibility entry path, a real synthetic submission/receipt, unauthorized inbox rejection, local downloads, and mobile layout before announcing a release. A deploy command alone is not proof the custom domain routes correctly.

Rollback uses `npx wrangler rollback <previous-version-id>` for the application. Do not drop the dedicated D1 database or delete visitor records to roll back source. Preserve the current review inbox and communication preferences.

The legacy root HTML files are redirect stubs for the original GitHub Pages deployment. The actual application is generated from `src/`; do not restore a second copy of its pages at the repository root. See [the October 31 release receipt](docs/release-2026-10-31/README.md) for verified deployment and acceptance details.
