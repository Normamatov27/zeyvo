# Runbook: WebSocket / Real-Time Outage

## Symptoms
- Customers report ticket status not updating in real time
- Staff admin console not receiving new-ticket notifications
- Browser console shows STOMP connection errors or repeated reconnect attempts

## Diagnosis

```bash
# 1. Check if the backend is up and WS endpoint is reachable
curl -sf https://zeyvo.tech/api/actuator/health | python3 -m json.tool

# 2. Check nginx is proxying WS upgrades correctly
docker logs nginx --tail=100 | grep -E "(ws|upgrade|101|502|504)"

# 3. Check backend logs for STOMP errors
docker logs zeyvo-backend --tail=200 | grep -iE "(stomp|websocket|ws|session|broker)"

# 4. Check for OOM / GC pressure (WS connections are heap-heavy)
docker stats zeyvo-backend --no-stream

# 5. Nginx WS proxy config (must have Upgrade + Connection headers)
grep -A10 "location /api/ws" /opt/zeyvo/infra/nginx/zeyvo.conf
```

## Common causes and fixes

### Cause A: Backend OOM / crash
```bash
docker ps | grep zeyvo-backend
# If "Restarting" or not present:
docker compose -f infra/docker/docker-compose.prod.yml up -d backend
# Wait for health, then verify clients reconnect (STOMP client auto-reconnects)
```

### Cause B: nginx not upgrading connections (missing headers)
nginx `zeyvo.conf` must have inside the `/api/ws` location:
```
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
```
If missing: add them and reload nginx:
```bash
docker exec nginx nginx -t && docker exec nginx nginx -s reload
```

### Cause C: Too many idle connections exhausting backend threads
```bash
docker exec zeyvo-backend curl -s http://localhost:8080/api/actuator/metrics/jvm.threads.live
# If thread count is at max (default 200), restart and add memory or reduce session idle timeout
```

### Cause D: Redis unavailable (WS auth check fails)
Rate-limit filter depends on Redis. If Redis is down and `zeyvo.rate-limit.enabled=true`,
requests (including WS handshake) will fail. See `redis-outage.md`.

## Client reconnect behavior
The STOMP client (`apps/web/lib/realtime.ts`) auto-reconnects with backoff. Once the backend is healthy, connected browsers will reconnect within ~30 seconds automatically. No action needed on the client side.

## Escalation
- If WS connections are failing for >5 minutes: page engineering
- If the issue affects the STOMP broker (future: RabbitMQ relay): see broker-specific runbook

## Verify
1. Open the customer ticket page in a browser
2. Check DevTools → Network → WS → confirm `101 Switching Protocols`
3. Have a staff member call-next → confirm the customer screen updates within 2s
