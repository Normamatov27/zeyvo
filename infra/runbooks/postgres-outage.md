# Runbook: Postgres Outage

## Impact
- All API endpoints fail (backend cannot serve requests)
- Active queue state is lost for in-flight requests
- Completed ticket data is safe (persisted before the outage)

## Diagnosis

```bash
docker exec zeyvo-postgres pg_isready -U zeyvo -d zeyvo
# Expected: /var/run/postgresql:5432 - accepting connections

docker ps | grep zeyvo-postgres
docker logs zeyvo-postgres --tail=200
docker stats zeyvo-postgres --no-stream

# Check disk (most common cause on single droplet)
df -h /var/lib/docker
```

## Remediation

### Case A: Container crashed (OOM or disk full)
```bash
# Check disk first — never restart Postgres on a full disk
df -h /var/lib/docker
# If disk >95%: free space before restarting (see below)

docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d postgres
sleep 10
docker exec zeyvo-postgres pg_isready -U zeyvo -d zeyvo
```

### Case B: Disk full
```bash
# Check what's consuming disk
du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -10

# Postgres WAL and old table bloat are common causes
# DO NOT delete Postgres data files directly

# Option 1: Expand the droplet volume via DO console (safest, ~5min)
# Option 2: Remove unused Docker images
docker image prune -a --filter "until=168h"

# After freeing space, restart Postgres
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d postgres
```

### Case C: Postgres in recovery mode (crash recovery)
```bash
docker logs zeyvo-postgres --tail=100 | grep -iE "(recovery|checkpoint|redo)"
# Postgres will complete crash recovery automatically — wait up to 5 minutes
# Do NOT restart during recovery; it restarts the recovery from scratch
```

### Case D: Connection exhaustion (too many connections)
```bash
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT count(*) AS total,
       state,
       wait_event_type,
       wait_event
FROM pg_stat_activity
GROUP BY state, wait_event_type, wait_event
ORDER BY total DESC;"

# Kill idle connections
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes'
  AND pid <> pg_backend_pid();"
```

## Data recovery (last resort)
See `backup-restore.md`. Do not proceed without backing up current state first.

## Escalation
- Postgres down >2 minutes: page engineering immediately
- Any data corruption suspected: escalate before taking any action

## Verify
```bash
docker exec zeyvo-postgres pg_isready -U zeyvo -d zeyvo
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "SELECT count(*) FROM app.ticket WHERE DATE(joined_at) = CURRENT_DATE;"
curl -sf https://zeyvo.tech/api/actuator/health
```
