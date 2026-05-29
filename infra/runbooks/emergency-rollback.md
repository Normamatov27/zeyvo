# Runbook: Emergency Rollback

## When to use
- Deploy broke a critical feature (auth, queue, WebSocket)
- Post-deploy smoke test failed and you need to revert immediately
- 5xx error rate spike after a deploy

## Prerequisites
- Know the previous healthy `IMAGE_TAG` (a git SHA, e.g. `abc1234def5678`)
- SSH access to the droplet (`C:\Users\LOQ\zeyvo` key — decrypt before use, delete after)

## Rollback steps

```bash
# 1. SSH to droplet
ssh -i ~/.zeyvo_deploy deploy@<DROPLET_IP>

# 2. Set IMAGE_TAG to the last known-good SHA
cd /opt/zeyvo
PREV_SHA=abc1234def5678   # replace with the previous good commit SHA
sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${PREV_SHA}|" .env

# 3. Pull and restart (images are already in GHCR; pull is fast)
docker compose -f infra/docker/docker-compose.prod.yml pull backend web
docker compose -f infra/docker/docker-compose.prod.yml up -d backend web

# 4. Wait for health
until docker exec zeyvo-backend wget -qO- http://localhost:8080/api/actuator/health 2>/dev/null \
    | grep -q '"status":"UP"'; do
  echo "waiting..."; sleep 3
done
echo "Backend healthy"

# 5. Verify smoke (quick)
curl -sf https://zeyvo.tech/api/actuator/health | python3 -m json.tool
curl -sf https://zeyvo.tech/api/v1/branches

# 6. Delete the unencrypted key
rm ~/.zeyvo_deploy
```

## Finding the previous healthy SHA

```bash
# From your local machine — look at recent deploys
git log --oneline main | head -20

# Or check GitHub Actions: Actions → Deploy to production → find the last green run
# Its commit SHA is the IMAGE_TAG to use
```

## Database considerations

If the new code ran a Flyway migration that the old code cannot handle:
- Rollback may not be possible without a DB restore
- Check `flyway_schema_history` before rolling back:

```bash
docker exec zeyvo-postgres psql -U zeyvo -d zeyvo -c "
SELECT version, description, installed_on, success
FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

If the last migration is new and destructive (dropped column, altered type):
- **Do not rollback** — restore from backup instead (see `backup-restore.md`)
- Assess whether a hotfix forward is faster

## Escalation
- If rollback does not restore health: escalate to engineering
- If migration rollback is needed: pull in the person who wrote the migration

## Verify
Run the full 10-step smoke test from `docs/PRODUCTION_READINESS.md`.
