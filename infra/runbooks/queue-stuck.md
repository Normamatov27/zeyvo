# Runbook: Queue Stuck

## Symptoms
- Tickets remain in `WAITING` or `CALLED` for an abnormally long time
- Staff report "no tickets showing" or "call-next not working"
- Customer complains they were never served despite waiting

## Diagnosis

```bash
# 1. Check stuck WAITING tickets (waiting >30min)
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT id, branch_id, service_id, ticket_number, status, joined_at,
       EXTRACT(EPOCH FROM (now() - joined_at))/60 AS waited_min
FROM app.ticket
WHERE status = 'WAITING'
  AND joined_at < now() - interval '30 minutes'
ORDER BY joined_at ASC LIMIT 20;"

# 2. Check stuck CALLED tickets (called >10min without serving start)
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT id, window_id, ticket_number, status, called_at,
       EXTRACT(EPOCH FROM (now() - called_at))/60 AS called_min
FROM app.ticket
WHERE status = 'CALLED'
  AND called_at < now() - interval '10 minutes'
ORDER BY called_at ASC LIMIT 20;"

# 3. Check if the branch is paused
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT id, name, is_active, join_mode FROM app.branch
WHERE is_active = false OR join_mode = 'PAUSED' LIMIT 10;"

# 4. Check for open windows at the branch
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT w.id, w.name, w.is_open, b.name AS branch
FROM app.window_desk w
JOIN app.branch b ON b.id = w.branch_id
WHERE w.is_open = false LIMIT 20;"

# 5. Check backend logs for errors
docker logs zeyvo-backend --tail=200 | grep -E "(ERROR|WARN|queue|ticket)"
```

## Remediation

### Case A: Branch or windows closed
Instruct the staff manager to re-open the branch/windows via the admin console, or run:
```bash
# Re-open a specific window (use with caution — confirm with branch manager first)
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
UPDATE app.window_desk SET is_open = true WHERE id = '<window-uuid>';"
```

### Case B: Tickets legitimately stuck (staff forgot to mark served/no-show)
Notify the branch manager. They should use the admin console to mark stuck tickets.

As a last resort (only with explicit branch manager approval):
```bash
# Expire old stuck WAITING tickets (>2h with no activity)
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
UPDATE app.ticket
SET status = 'EXPIRED', updated_at = now()
WHERE status = 'WAITING'
  AND joined_at < now() - interval '2 hours'
  AND branch_id = '<branch-uuid>'
RETURNING ticket_number, id;"
```

### Case C: Backend error (500 on call-next)
```bash
docker logs zeyvo-backend --tail=500 | grep -E "(ERROR|Exception)" | tail -50
# Common: OptimisticLockException — one operator won the race, other got 500.
# Retry call-next from the admin console — it will succeed on the second attempt.
```

### Case D: Redis unavailable (rate limiter preventing ticket ops)
```bash
docker exec zeyvo-redis redis-cli ping
# If PONG: Redis is fine, check rate-limit filter logs
# If down: see redis-outage.md
```

## Escalation
- If the issue affects >1 branch: escalate to engineering immediately
- If data corruption is suspected (ticket count mismatch): take a backup before any manual fix

## Verify
```bash
# Confirm queue is moving again
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT status, COUNT(*) FROM app.ticket
WHERE branch_id = '<branch-uuid>' AND DATE(joined_at) = CURRENT_DATE
GROUP BY status;"
```
