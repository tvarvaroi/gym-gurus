# Open Wearables Deployment Runbook

> Sprint 4 BATCH 5. Last updated: 2026-05-07.

This runbook covers the operational lifecycle of the self-hosted Open Wearables service that bridges GymGurus to provider OAuth flows (Whoop, Oura, Garmin, Strava, Withings). It pairs with `_brain/notes/decisions.md` BATCH 4 D2 (separate Railway project topology) and D4 (token encryption key management).

---

## Service Identity

**Open Wearables** is an MIT-licensed self-hosted service that handles:

- Provider OAuth flows (5 providers in Sprint 4 + 4.5)
- Provider token storage + refresh
- Webhook fan-out from providers → GymGurus (HMAC-signed)
- Per-user sync orchestration

Architecture: Open Wearables runs as a **separate Railway project** (`open-wearables`), distinct from `gym-gurus`. Separate Postgres for OW's OAuth state + token storage. Coupling between the two services is two env vars only — no shared database.

Why separate (load-bearing): GymGurus deploys 5x/day during active development. Co-located deployment would bounce OW on every GymGurus push, dropping in-flight webhooks and breaking OAuth state for users mid-flow. See decisions.md BATCH 4 D2.

---

## Deployment URLs

| Environment | GymGurus                                      | Open Wearables                                                              |
| ----------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Dev         | `https://gym-gurus-staging.up.railway.app`    | `https://open-wearables-staging.up.railway.app` _(populate post-deploy)_    |
| Prod        | `https://gym-gurus-production.up.railway.app` | `https://open-wearables-production.up.railway.app` _(populate post-deploy)_ |

Update this section after first Railway deploy with the actual URLs.

---

## Initial Provisioning (one-time)

### Step 1 — Generate cryptographic secrets (locally)

```bash
# Run these on a trusted local machine. Do NOT echo to logs or check into git.
openssl rand -hex 32   # WEARABLE_TOKEN_ENCRYPTION_KEY  (32 bytes, AES-256-GCM)
openssl rand -hex 32   # OPEN_WEARABLES_INTERNAL_TOKEN  (32 bytes, bearer auth)
openssl rand -hex 32   # OPEN_WEARABLES_WEBHOOK_SECRET  (32 bytes, HMAC-SHA256)
```

Save these to a password manager. They are never written to disk except as Railway env vars.

### Step 2 — Provision Open Wearables Railway project

1. Railway dashboard → New Project → Empty Project. Name: `open-wearables`.
2. Add Postgres plugin (separate from GymGurus's Postgres).
3. Clone Open Wearables repo: <upstream MIT URL>. Verify license at clone time (re-run during BATCH 12 audit per the BATCH 5 checklist).
4. Connect repo to Railway service. Configure build + start commands per upstream docs.
5. Set env vars on Open Wearables service:
   - `DATABASE_URL` = OW's Postgres URL (auto-injected by Railway plugin)
   - `INTERNAL_TOKEN` = the `OPEN_WEARABLES_INTERNAL_TOKEN` value from Step 1
   - `WEBHOOK_SECRET` = the `OPEN_WEARABLES_WEBHOOK_SECRET` value from Step 1
   - `WEBHOOK_TARGET_BASE` = `https://gym-gurus-{environment}.up.railway.app/webhooks/wearables`
   - Provider OAuth credentials (per Step 3 below)
6. Deploy.

### Step 3 — Register provider OAuth apps

Per BATCH 4 D1, Sprint 4 ships Whoop + Oura. Register dev + prod apps separately (or multiple callback URLs on one app, depending on provider).

#### Whoop (developer.whoop.com)

1. Create developer account
2. Create app for **dev**: callback URL = `https://open-wearables-staging.up.railway.app/oauth/callback/whoop`
3. Capture `WHOOP_CLIENT_ID_DEV` + `WHOOP_CLIENT_SECRET_DEV`
4. Create separate app for **prod**: callback URL = `https://open-wearables-production.up.railway.app/oauth/callback/whoop`
5. Capture `WHOOP_CLIENT_ID_PROD` + `WHOOP_CLIENT_SECRET_PROD`
6. Set both pairs as env vars on the corresponding Open Wearables Railway environment.

#### Oura (cloud.ouraring.com)

1. Cloud OAuth (NOT the older personal access token flow)
2. Create app: callback URLs = both staging + production OW URLs (Oura allows multiple URLs per app)
3. Capture `OURA_CLIENT_ID` + `OURA_CLIENT_SECRET`
4. Set on Open Wearables Railway env.

#### Garmin (Sprint 4.5 — submit application Sprint 4 day 1)

Garmin's developer program requires manual approval (3-7 days). Submit the application on Sprint 4 BATCH 5 day 1 so the queue runs in parallel. If approval lands during Sprint 4.5 BATCH 1 — perfect. If later, Sprint 4.5 has Strava + Withings to occupy early batches.

### Step 4 — Configure GymGurus env vars

On the GymGurus Railway service (both dev + prod environments), set:

```
WEARABLE_TOKEN_ENCRYPTION_KEY    # the value from Step 1 (32 bytes hex)
OPEN_WEARABLES_BASE_URL          # https://open-wearables-{env}.up.railway.app
OPEN_WEARABLES_INTERNAL_TOKEN    # the value from Step 1
OPEN_WEARABLES_WEBHOOK_SECRET    # the value from Step 1
```

### Step 5 — Verify end-to-end

1. Connect Whoop on dev as the test user (see Sprint 4 BATCH 5 E2E checklist)
2. Verify `wearable_connections` row transitions disconnected → connected
3. Wait for first webhook (Whoop docs: 5-10 min after connect)
4. Verify `sleep_sessions` row created
5. Verify `wearable_first_sync_complete` notification dispatched
6. Open `/biometrics?tab=trends` — sleep data renders

---

## Token Encryption Key Rotation

Per BATCH 4 D4: env var key + idempotent + resumable rotation script + probe-decrypt-verify pre-rotation gate. Rotation cadence: every 6 months OR on suspected compromise.

### Rotation Procedure

#### Phase 1 — Pre-rotation prep (no app downtime)

1. **Generate new key** locally:

   ```bash
   openssl rand -hex 32
   ```

2. **Set new key on GymGurus Railway** as `WEARABLE_TOKEN_ENCRYPTION_KEY_NEW`:
   - Add via Railway dashboard or CLI
   - Do NOT remove or change the existing `WEARABLE_TOKEN_ENCRYPTION_KEY` yet — app still uses it for normal encrypt/decrypt

3. **Pick the next version label.** If current envelope version is `v1`, target is `v2`. If `v2`, target is `v3`. Etc.

#### Phase 2 — Bulk re-encrypt (no app downtime)

The rotation script is idempotent + resumable. Mid-script crash is safe — re-running picks up rows still on the old version.

```bash
# From the GymGurus repo, with both env vars present:
railway run -- npx tsx scripts/rotate-wearable-tokens.ts v2
```

The script:

1. Validates both keys (64-char hex)
2. Refuses if old + new are identical
3. Production-host fail-safe (refuses non-Railway hosts unless `--allow-non-railway`)
4. **Probe-decrypt-verify** with the new key (synthetic plaintext, no real-data touch)
5. 3-second confirmation pause
6. Iterates `wearable_connections` rows where envelope version differs from target
7. Per-row: decrypt with old key → encrypt with new key + target version → atomic UPDATE
8. Final report: rows scanned, already-target, rotated this run, errors

#### Phase 3 — Verify rotation completion

```sql
-- Should return 0
SELECT COUNT(*) FROM wearable_connections
 WHERE access_token_encrypted IS NOT NULL
   AND substring(access_token_encrypted FROM 1 FOR 3) != 'v2:';

-- Should return 0
SELECT COUNT(*) FROM wearable_connections
 WHERE refresh_token_encrypted IS NOT NULL
   AND substring(refresh_token_encrypted FROM 1 FOR 3) != 'v2:';
```

If either query returns >0, run the script again. The remaining rows will be the failures from the previous run.

#### Phase 4 — Cutover (~30s downtime)

1. Stop the GymGurus app (Railway service → restart paused, or scale to 0 briefly)
2. Update Railway env vars on GymGurus:
   - Replace `WEARABLE_TOKEN_ENCRYPTION_KEY` value with the new key (the value currently in `..._NEW`)
   - Remove `WEARABLE_TOKEN_ENCRYPTION_KEY_NEW`
3. Update `server/services/tokenEncryption.ts`:
   - Bump `CURRENT_ENVELOPE_VERSION` constant from `'v1'` → `'v2'` (matching the rotation target)
4. Commit + push the code change. Railway re-deploys.
5. Restart app.

Total cutover downtime: ~30 seconds.

#### Phase 5 — Post-cutover verification

1. Connect a test wearable on dev to verify new tokens encrypt with v2:

   ```sql
   SELECT substring(access_token_encrypted FROM 1 FOR 3) FROM wearable_connections WHERE id = '<test-conn>';
   -- expect 'v2:'
   ```

2. Trigger a sync to confirm decrypt path works on the new key.
3. Update `MEMORY.md` with the rotation completion (date, target version, total rows rotated).

### Recovery from mid-rotation crash

If `rotate-wearable-tokens.ts` crashes mid-batch (network blip, OOM, manual Ctrl-C):

- **State of DB:** mixed — some rows on old version, some on target version. Both are decryptable: target rows with new key, old rows with old key. App still functions because old key is still in `WEARABLE_TOKEN_ENCRYPTION_KEY`.
- **Recovery:** re-run the rotation script. The script's WHERE clause filters by envelope version, so it only re-rotates the still-on-old-version rows. Idempotent.
- **Do NOT** start Phase 4 (cutover) until Phase 3 verification queries return 0. Cutting over with mixed-version rows would break decryption for the not-yet-rotated rows (app would only have the new key).

### Zero-downtime rotation (Sprint 5+ enhancement)

The current Phase 4 cutover requires ~30 seconds of app downtime to swap env vars + redeploy code. Sprint 4 v1 accepts this trade-off (low traffic, infrequent rotation).

For zero-downtime rotation in Sprint 5+:

1. Refactor `tokenEncryption.ts` to look up keys by envelope version: `WEARABLE_TOKEN_ENCRYPTION_KEY_V1`, `WEARABLE_TOKEN_ENCRYPTION_KEY_V2`, etc.
2. `decryptToken` reads version from envelope, looks up corresponding env var
3. `encryptToken` reads `CURRENT_ENVELOPE_VERSION` constant + uses corresponding env var
4. Rotation: add new key env var, run rotation script, deploy code with bumped CURRENT_ENVELOPE_VERSION (no downtime — old key stays available for decrypt of any not-yet-migrated rows; once all rows are new version, remove old key env var)

This is deferred because Sprint 4 v1 has low rotation cadence (every 6 months) and brief downtime is acceptable.

---

## Webhook Signature Secret Rotation

Cadence: when `OPEN_WEARABLES_WEBHOOK_SECRET` is suspected compromised.

1. Generate new secret: `openssl rand -hex 32`
2. Update on Open Wearables Railway env (it signs outbound webhooks)
3. Update on GymGurus Railway env (it verifies inbound webhooks)
4. Brief in-flight webhook drop window: webhooks signed with the old secret will fail verification on GymGurus during the rotation window. OW's retry logic will replay them after; idempotency layer (UNIQUE on `(user_id, source, source_record_id)`) dedupes.

Acceptable trade-off for v1 because secret rotation is rare. For frequent rotation, support a transition period where both old + new secrets are tried (HMAC verify against both, accept either) — Sprint 5+ enhancement.

---

## Internal Token Rotation

`OPEN_WEARABLES_INTERNAL_TOKEN` authenticates GymGurus → Open Wearables internal API calls (initiateOAuth, getConnectionStatus, triggerSync, revokeConnection).

Rotation is similar to webhook secret:

1. Generate new token: `openssl rand -hex 32`
2. Update on both Railway projects simultaneously
3. Brief window where in-flight requests may fail. GymGurus retries are not yet implemented for these calls (Sprint 5+ enhancement); for now, pick a low-traffic window.

---

## Deploy Procedures

### Open Wearables service

1. Push to OW upstream main (or your fork)
2. Railway auto-deploys the OW service
3. Monitor Railway logs for boot success
4. Sanity check: `curl -H "Authorization: Bearer $TOKEN" $OW_URL/health` should return 200

### GymGurus service

1. Standard `git push origin main`
2. Railway auto-deploys
3. Watch for boot success in Railway logs (especially `[wearableSyncMonitor] starting, interval=...`)

---

## Log Access

Railway dashboard → project → service → Logs tab. Filter by:

- `[wearableSyncMonitor]` — cron tick logs
- `connection-status webhook` — provider-side disconnects/revokes
- `sleep webhook ingest failed` / `vitals` / `activity` — ingest failures
- `wearable_expired dispatch failed` — fire-and-forget notification failures (these are warnings, not errors — webhook still 200'd)

For deeper debugging, both services log structured JSON to stdout. Pipe Railway logs to your log aggregator if needed.

---

## Webhook Delivery Debugging

If webhooks are not arriving at GymGurus:

1. **Open Wearables side:** check OW logs for outbound webhook attempts. If absent, OW isn't sending — check OW's provider integration.
2. **Network:** Open Wearables → GymGurus is HTTPS over the public internet. Both Railway services are public; no VPC. Network failures are rare but possible.
3. **HMAC verification:** if GymGurus logs show `401 invalid signature`, the secret on the two services is out of sync. Most likely after a partial rotation.
4. **Timestamp window:** if logs show `401 stale timestamp`, OW's clock is drifting. Both Railway environments use NTP; if drift exceeds 5 minutes the webhook fails. Restart OW to resync.
5. **Idempotency dedup:** repeat deliveries return `{ok: true, deduped: true}` — that's expected, not a bug. The first delivery already ingested.

---

## Provider OAuth App Management

For each provider, the OAuth app config is environment-specific. Document per-provider here as Sprint 4/4.5 ships them:

### Whoop (BATCH 5)

- Dev app: `<owner>/whoop-dev` — callback URL `https://open-wearables-staging.up.railway.app/oauth/callback/whoop`
- Prod app: `<owner>/whoop-prod` — callback URL `https://open-wearables-production.up.railway.app/oauth/callback/whoop`

### Oura (BATCH 6)

_Populate when registered._

### Garmin / Strava / Withings (Sprint 4.5)

_Populate as Sprint 4.5 ships each._

---

## Restart Procedures

### Open Wearables service restart

Railway dashboard → service → Restart. ~30 second startup. Webhooks already in flight from providers MAY drop; provider retries handle it.

### GymGurus service restart

Standard Railway restart. webhookSyncMonitor cron pauses + resumes on next tick. Active OAuth flows mid-redirect (user clicked Whoop "connect" but hasn't been redirected back yet) may break — provider redirects to GymGurus oauth-callback, but GymGurus is mid-restart, returns 502. User retries by clicking "connect" again.

---

## Related Notes

- `_brain/notes/decisions.md` — BATCH 4 D2 (separate project rationale), D4 (encryption key management)
- `_brain/notes/gotchas.md` — Postgres alias case-folding, fire-and-forget pattern
- `server/services/tokenEncryption.ts` — current envelope version + encrypt/decrypt API
- `scripts/rotate-wearable-tokens.ts` — bulk re-encryption script
