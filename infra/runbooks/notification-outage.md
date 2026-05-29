# Runbook: Notification Outage (Telegram / SMS)

## Symptoms
- Customers report not receiving Telegram or SMS notifications
- Staff report no confirmation messages after ticket operations
- Notification error rate alerts fire

## Diagnosis

```bash
# 1. Check backend logs for notification errors
docker logs zeyvo-backend --tail=300 | grep -iE "(telegram|sms|notification|devsms|bot)"

# 2. Test Telegram Bot API reachability
docker exec zeyvo-backend curl -sf \
  "https://api.telegram.org/bot${ZEYVO_TELEGRAM_BOT_TOKEN}/getMe" | python3 -m json.tool

# 3. Test DevSMS reachability (if SMS is failing)
# DevSMS status: check https://devsms.uz/status or contact them directly

# 4. Check if the bot token is valid
docker exec zeyvo-backend curl -sf \
  "https://api.telegram.org/bot${ZEYVO_TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool
```

## Common causes and fixes

### Cause A: Telegram Bot API blocked / token revoked
```bash
# If getMe returns {"ok":false, "error_code":401}:
# Token is invalid. Re-generate from @BotFather and update .env.prod
# Then restart backend:
docker compose -f /opt/zeyvo/infra/docker/docker-compose.prod.yml up -d backend
```

### Cause B: Webhook not registered
```bash
# Re-register the webhook
curl -X POST "https://zeyvo.tech/api/v1/integrations/telegram/register-webhook?url=https://zeyvo.tech"
# Expected: {"ok":true,...}
```

### Cause C: DevSMS API key expired or account out of balance
```bash
# Contact DevSMS support: https://devsms.uz
# Temporarily: disable SMS-channel, use Telegram only
# In .env.prod: add ZEYVO_NOTIFICATION_SMS_ENABLED=false and restart backend
```

### Cause D: Backend exception swallowing notification failures
```bash
docker logs zeyvo-backend --tail=500 | grep -E "(NotificationService|TelegramBot|ERROR)" | tail -30
# Current state: notification failures are logged but not tracked/retried (Phase 2: add DLQ)
# Customers affected during the window will not receive retried notifications until DLQ is implemented
```

## Impact on in-flight tickets
- Queue operations still work — notifications are async and do not block ticket state
- Customers who didn't receive a notification will need to be told manually or check the web/TG mini-app

## Escalation
- Outage >15 minutes: proactively notify affected branches via phone/Telegram support channel
- Telegram API outage (not our fault): monitor @Telegram on status.telegram.org

## Verify
```bash
# Send a test notification (requires a test customer phone/chat_id)
docker logs zeyvo-backend -f | grep notification &
# Then trigger a ticket join from the test account and watch logs
```
