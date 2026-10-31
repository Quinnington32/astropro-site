# Student Resource Center operating guide

Public site: https://students.goastropro.com/  
Compatibility entry: https://goastropro.com/studentresourcecenter/  
Private review inbox: https://students.goastropro.com/admin.html

## Daily review

1. Open the private inbox using the private access key. Obtain it from the deployment owner through a secure channel. It is deliberately absent from email, GitHub, URLs, and this guide.
2. Choose **Requests**, filter **Review status → New**, then choose a request type if needed. Filters apply to the database query, including older pages. Use **Load older records** until it disappears when checking a complete view.
3. Read each request, verify the official source where relevant, and follow up manually from the team mailbox. The inbox does not send email or automatically enroll people in a CRM, newsletter, or mentor match.
4. Mark a request **Reviewed** once someone has taken responsibility; mark it **Resolved** when the requested follow-up is finished. Refresh to reapply filters. **Mark new** reopens a mistakenly closed request. A status change does not send a message.
5. For access, correction, or deletion requests, verify identity before disclosing or changing personal information. Locate the exact record in the dedicated Cloudflare D1 database and make only the verified, authorized change. Keep personal information out of GitHub issues and release reports.
6. Lock the inbox when finished. It also locks after 15 minutes without activity and on page navigation. Pending responses cannot restore private records after locking.

Check the **Do-not-contact preferences** view before any optional marketing outreach. This view is paginated independently and does not stop at 500 entries. A preference is specific to the Student Resource Center; the unsubscribe link in a separate AstroPro/HighLevel email handles that separate list. Replies a person specifically requested are distinct from optional marketing. The resource center does not currently send either automatically.

The deployment owner's checkout can also read the private inbox:

```sh
npm run inbox
npm run inbox -- --preferences
```

These commands print private records. Run them in a private terminal and do not paste their output into a public channel. The ignored `.dev.vars` file holds the local key; a fresh clone does not include it.

## Content upkeep

Review sponsor deadlines and application windows before promoting a resource and at least monthly during application seasons. Use the official provider as the authority. The published career programs are discovery links, not a live openings feed. Map-only housing entries are unverified research shortcuts.

Edit structured records in `src/data/`, guides in `src/content/`, and page composition in `scripts/build.mjs`. Preserve stable resource IDs so saved lists keep working. Record the source, review date, and the specific verified information. Withhold entries whose current offer cannot be substantiated. Do not infer eligibility, award availability, partnerships, property suitability, prices, rankings, or review scores.

```sh
git pull --ff-only
npm ci
npm run check
npm run links
```

External 403/418/5xx and network failures require follow-up; they are not proof a destination is permanently dead. A successful response is not proof a scholarship is currently open. The release directory records the latest source-review scope and link-check limitations.

## Publishing and recovery

GitHub Actions checks pull requests and main pushes. It does not automatically deploy production. The deployment owner publishes the checked build with the existing Cloudflare Workers/Routes-authorized identity:

```sh
npm run check
npx wrangler deploy
node scripts/verify-live.mjs
```

On the deployment owner's Mac, use the existing `default` profile for Workers/routes and `amos-setup` for D1 management. Other team members should use their own authorized Cloudflare login rather than copy an account credential. Apply only new, reviewed migrations before a release that requires them. The launch-hardening release requires no schema change.

The live verifier is read-only by default except for one intentionally invalid, rejected request. `--exercise-forms` creates five clearly identified synthetic requests, verifies their receipts/retries and review status, and leaves them resolved. Remove only those exact synthetic IDs/preferences afterward using the release report. Never clear the inbox or use a broad email-domain match to clean up a test.

For an application regression, roll back to a verified previous Worker version from the release receipt:

```sh
npx wrangler rollback <previous-version-id>
```

Preserve D1 data and communication preferences during a code rollback. The dedicated database is `astropro-student-resource-center`; do not operate on other AstroPro databases. Use Cloudflare's D1 recovery controls for a separately verified data incident and confirm the intended recovery point before restoring.

## First checks when something fails

- **Public page 404:** verify the canonical URL and whether the page exists in the generated build. The compatibility path and old GitHub Pages entry redirect to the canonical site.
- **Inbox 401:** confirm the private key, then reopen the inbox. Never put a key in a URL or send it in a troubleshooting email.
- **Health 503 or form 503:** check Worker logs, the `DB` binding, and applied migrations. The health check queries storage rather than only checking whether a binding name exists. Error responses omit database internals and visitor details.
- **Uncertain form receipt:** retry the same details in the same tab. The stable request ID prevents duplicates. Do not tell a visitor a request was received without its confirmed receipt.
- **Form 429:** per-email, network, or global limits were reached. Wait as instructed or handle the person's request directly; avoid repeatedly resubmitting it.
- **No email notification:** this is expected. The private inbox is the delivery destination, and staff follow-up is manual.

Form submissions expire after 90 days through the daily cron. Communication preferences are retained separately. Review the inbox regularly so requests are handled before expiry.
