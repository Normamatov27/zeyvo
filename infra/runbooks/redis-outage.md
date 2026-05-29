# Runbook: Redis Outage

## Impact
- Rate limiting fails (requests are blocked or pass through depending on filter behavior)
- Session/cache reads fail if anything is Redis-backed
- WS STOMP handshakes may fail (rate-limit filter runs on every request)

## Diagnosis

```bash
docker exec zeyvo-redis redis-cli ping
# Expected: PONG
# If "Error connecting": Redis is down

docker ps | grep zeyvo-redis
docker logs zeyvo-redis --tail=100
docker stats zeyvo-redis --no-stream
```

## Remediation

### Case A: Redis container crashed
```bash
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d redis
sleep 5
docker exec zeyvo-redis redis-cli ping
```

### Case B: Redis OOM
```bash
docker exec zeyvo-redis redis-cli info memory | grep used_memory_human
# If near maxmemory, Redis may be evicting keys or refusing writes
# Check eviction policy:
docker exec zeyvo-redis redis-cli config get maxmemory-policy
# For rate limiting, "noeviction" is safest — failing loudly beats silent bypass
# If OOM: increase droplet RAM or reduce maxmemory-reserved
```

### Case C: Redis data corruption (AOF/RDB error)
```bash
docker logs zeyvo-redis --tail=100 | grep -iE "(error|corrupt|WARN)"
# If AOF is corrupted:
docker exec zeyvo-redis redis-cli debug sleep 0
# As last resort: delete /data/appendonly.aof and restart (rate-limit buckets are regenerated automatically)
```

## Rate limiter behavior during outage

`RateLimitFilter` is `@ConditionalOnProperty(name = "zeyvo.rate-limit.enabled", havingValue = "true")`.
If the Redis connection is unavailable, `Bucket4j` will throw on `proxyManager.builder().build(...)`.

**Current behavior:** the exception propagates as a 500. This is a latent bug — the filter should catch `RedisException` and either:
- Pass through (allow all — fail open, abuse risk), or
- Reject all (fail closed — DoS risk)

**Interim mitigation while Redis is down:**
```bash
# Temporarily disable rate limiting (fail open) by setting the property to false
# This requires restarting the backend with a config override
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml \
  exec backend env ZEYVO_RATE_LIMIT_ENABLED=false echo "not supported inline"
# Instead: set in .env and restart
echo "ZEYVO_RATE_LIMIT_ENABLED=false" >> /opt/zeyvo/.env
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d backend
```

Restore Redis, then re-enable rate limiting:
```bash
sed -i 's/ZEYVO_RATE_LIMIT_ENABLED=false//' /opt/zeyvo/.env
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d backend
```

## Escalation
- Redis outage >5 minutes: page engineering
- Rate-limit disabled for >30 minutes: apply nginx-level limits as backstop (already active at 60r/m global)

## Verify
```bash
docker exec zeyvo-redis redis-cli ping
docker exec zeyvo-redis redis-cli info stats | grep total_commands_processed
curl -sf https://zeyvo.tech/api/actuator/health
```
