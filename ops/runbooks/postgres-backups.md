# Postgres backups & recovery runbook

**Owner:** Platform / on-call rotation
**Last reviewed:** Phase 1 — Trust Launch
**Related workflow:** `.github/workflows/backups.yml`

This runbook covers (1) where the daily Postgres snapshots live,
(2) how to restore one when the cluster is compromised, and
(3) the smoke checks that prove a restore is actually usable.

---

## 1. What we back up

Every Phase-1 microservice owns its own database (per
`docs/Project-Structure.md` §6). The backups job in
`.github/workflows/backups.yml` runs `pg_dump --format=custom` against
each of the six databases and uploads the gzipped artifact to S3 under
`s3://${PG_BACKUP_S3_BUCKET}/postgres/<db>/<UTC-timestamp>.sql.gz`.

| DB | Owning service | Notable tables |
|----|----------------|----------------|
| `user_db` | user-service | `users`, `email_verifications`, `staff_invites` |
| `lead_db` | lead-service | `leads`, `lead_timeline_events`, `audit_log` |
| `property_db` | property-service | `properties` |
| `crm_db` | crm-service | (Phase-1 lite — reads from `lead_db`) |
| `notif_db` | notification-service | `notification_templates`, `notification_sends` |
| `media_db` | media-service | (lands in P2) |

### Schedule

- **Daily** snapshot — `cron: '0 3 * * *'` UTC (08:30 IST), the
  quietest window for production traffic.
- **Ad-hoc** snapshot — `workflow_dispatch` from the Actions tab.
  Use this *before* destructive migrations or large data backfills.
  Pass a `label` (e.g. `pre-stage-rename`) so the artifact name is
  unambiguous.

### Retention

- **30 days** in S3 Standard-IA, enforced via the S3 lifecycle policy
  in `infra/terraform/backups/`.
- Anything older is auto-expired. If you need a long-lived archive
  (annual, audit-compliance), copy the object out of the lifecycle-
  governed prefix into `s3://${PG_BACKUP_S3_BUCKET}/archive/...`
  manually.

---

## 2. Restore procedure

### Pre-flight

1. **Page yourself** if not already on call — restores affect every
   downstream service, so coordination matters.
2. **Pick the snapshot.** S3 listing:
   ```bash
   aws s3 ls s3://${PG_BACKUP_S3_BUCKET}/postgres/<db>/ \
     | sort -k1,2 | tail -10
   ```
   The newest entry is usually the right one. For "restore to the
   minute before the incident", pick the latest snapshot that
   *predates* the incident timestamp (snapshots are ≤24h apart).
3. **Decide the target.** Restore to a *new* database first
   (`user_db_restore`) and verify before swapping. **Never** restore
   directly over a live database — you can't undo a corrupted
   `pg_restore`.

### Restore steps

```bash
# 1. Pull the snapshot.
aws s3 cp s3://${PG_BACKUP_S3_BUCKET}/postgres/user_db/20260506T030000Z.sql.gz .

# 2. Stage a clean restore target.
PGPASSWORD=$PG_PROD_PASSWORD createdb \
  -h $PG_PROD_HOST -p $PG_PROD_PORT -U $PG_PROD_USER \
  user_db_restore

# 3. Restore. --jobs=4 parallelises across cores; bump on big DBs.
gunzip -c 20260506T030000Z.sql.gz \
  | PGPASSWORD=$PG_PROD_PASSWORD pg_restore \
      -h $PG_PROD_HOST -p $PG_PROD_PORT -U $PG_PROD_USER \
      --no-owner --no-privileges --clean --if-exists \
      --jobs=4 \
      -d user_db_restore

# 4. Smoke check (see §3).

# 5. When green, rename the live + restore in a single transaction.
PGPASSWORD=$PG_PROD_PASSWORD psql \
  -h $PG_PROD_HOST -p $PG_PROD_PORT -U $PG_PROD_USER -d postgres \
  -c "BEGIN;
      ALTER DATABASE user_db RENAME TO user_db_corrupted_$(date -u +%Y%m%d);
      ALTER DATABASE user_db_restore RENAME TO user_db;
      COMMIT;"

# 6. Roll the owning service so its connection pool reconnects.
kubectl rollout restart deployment/user-service -n kiana-prod
```

### Cross-DB ordering

If multiple databases need restoring (e.g. cluster-wide outage), do
them in this order — every step verifies the previous:

1. `user_db` — auth + role data; everything else depends on user
   ids resolving.
2. `lead_db` — referenced by crm-service, notification subscribers.
3. `property_db` — referenced by web-public, admin-cockpit.
4. `notif_db`, `crm_db`, `media_db` — independent / read-only.

---

## 3. Smoke checks

After every restore, run these against the **restore target** (not
production yet) before swapping:

### Schema integrity

```bash
PGPASSWORD=$PG_PROD_PASSWORD psql \
  -h $PG_PROD_HOST -U $PG_PROD_USER -d user_db_restore \
  -c "\dt" \
  -c "SELECT COUNT(*) AS users FROM users;" \
  -c "SELECT COUNT(*) AS verified FROM users WHERE email_verified_at IS NOT NULL;"
```

Compare the row counts against the snapshot age. If `users` returns 0
on a non-empty production database, **stop** — the restore failed
silently (usually a `pg_restore` permission issue).

### Service-level

Spin up a single replica of the owning service against the restore
target:

```bash
DATABASE_URL=postgresql://...:5432/user_db_restore \
  pnpm --filter @kiana/user-service start &
curl -fsS http://localhost:4010/health/ready
curl -fsS http://localhost:4010/api/auth/me \
  -H "Authorization: Bearer ${TEST_JWT}" | jq .
```

`/health/ready` should return `200 {ok:true}`; `/api/auth/me` should
resolve a known production user. If either fails, abandon the restore
and pick an earlier snapshot.

### End-to-end

When you do the swap (§2 step 5), watch the production
`/api/auth/me` + `/api/leads` endpoints for 5 minutes. A spike in
401s usually means the JWT-signing user-row is on a different `id`
post-restore (rare — but possible if the snapshot predates a manual
data fix).

---

## 4. Common failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `pg_restore: error: could not execute query: ERROR: permission denied for schema public` | Missing `--no-owner --no-privileges` flag | Add the flags; re-run §2 step 3 |
| `pg_restore: error: connection to server failed` mid-run | Network blip or the target db was dropped | Check `pg_isready`; retry with `--exit-on-error` to fail fast |
| Restore succeeds but service can't connect | Stale connection pool on the live deployment | `kubectl rollout restart deployment/<service>` |
| Backup workflow is red but the snapshot exists | `aws s3 ls` step racy on first-write | Check the `Snapshot complete at <ts>` log line — if present, the snapshot is good |

---

## 5. Disaster-recovery exercise

Run a full restore drill once a quarter (calendar invite owned by the
on-call rotation). The drill must:

1. Pick a snapshot at random from the last 14 days.
2. Restore it to a throwaway database in production.
3. Bring up the owning service against the restore target.
4. Run the smoke checks in §3.
5. Tear down the restore target (`DROP DATABASE`) so we don't carry
   orphan dbs in production.

Document the run in `ops/runbooks/dr-drills/<YYYY-MM-DD>.md` with the
snapshot id, end-to-end time, and any deviations from this runbook.
