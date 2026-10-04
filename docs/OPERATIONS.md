# Operations

## Database and quota

`supabase/migrations/20261004000000_qindeel_content_and_limits.sql` creates:

- `content_items`: lesson records with `pending`/`approved`/`retired` status. Anonymous clients can read approved rows only. Changing a row's payload, hash, release or kind clears its approval.
- `runtime_keys`: SHA-256 digests of internal credentials. Service role only.
- `request_buckets` and `consume_request(p_client_hash)`: atomic limits of 20 requests per minute and 150 per day per client hash, and 2000 per day globally. Keys contain a day-rotated HMAC, never an IP address or user text.

`supabase/functions/platform-quota` authenticates a server-to-server key (checked against `runtime_keys`) and calls `consume_request`. Create your own Supabase project; do not reuse the original repository's project. Seed content with `npm run db:seed:generate` and apply `supabase/seed.sql`.

None of this has been exercised against a live Supabase project in this repository. Verify the quota (including concurrent requests) and the row-level-security behaviour on your project before relying on it.

## Deployment

`scripts/deploy.ps1` stores no account data. Set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for your own Vercel project (root directory `apps/qindeel`), then run it from the repository root after tests and the build pass. Set server variables from `apps/qindeel/.env.example` in Vercel's protected configuration, never in source files.

## Secret rotation

Generate a new random internal token, add only its SHA-256 digest to `runtime_keys`, update `INTERNAL_API_TOKEN` on the server, verify requests, then revoke the old digest. Never expose a service-role key to the browser.

## Health and incidents

`/api/health` reports process status and whether configuration is present. It does not prove that Supabase or an AI provider is reachable. Do not log request bodies or names. Provider failures fall back to prepared explanations and original scene illustrations.
