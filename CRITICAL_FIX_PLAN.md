# CRITICAL FIX PLAN — zeyvo stabilization

Generated: 2026-05-18 after reading FULL_PROJECT_AUDIT.md.

---

## P0 — Must fix before any prod traffic (≈ 8 days)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | ✅ Hardcoded Telegram bot token in application.yml | `application.yml:104` | Remove default value; fail-fast if blank |
| 2 | ✅ Zero @PreAuthorize — any user can escalate to org_admin | `AdminUserController`, `PlatformController`, `BranchController`, `WindowController`, `AnalyticsController` | Add `@PreAuthorize` annotations |
| 3 | ✅ `/v1/dev/seed` exposed in prod | `BranchController:142` | Guard with `@Profile("local")` |
| 4 | ✅ `registerWebhook` is `permitAll` → bot takeover | `SecurityConfig:43` | Move to authenticated + SUPER_ADMIN |
| 5 | ✅ Webhook secret default-empty → unauthenticated updates | `TelegramWebhookController:74` + `application.yml:106` | Require non-blank, use constant-time compare |
| 6 | ✅ `resolveOrgId` fallback → cross-tenant write | `BranchController:148` | Throw 403 for users without org_id |
| 7 | ✅ STOMP has no JWT auth on CONNECT | `WebSocketConfig` | Add `ChannelInterceptor` |
| 8 | ✅ `DeviceController` double-prefix `/api/v1/devices` | `DeviceController:22` | Fix to `/v1/devices` |
| 9 | ✅ Tokens in localStorage (XSS target) | `stores/auth.ts` | Keep accessToken in-memory only |
| 10 | ✅ Fake landing page numbers + compliance claims | landing page | Remove fabricated stats |

## P1 — Within first month (≈ 2 weeks)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 11 | ✅ auth_date age not checked → replay attack | `TelegramAuthService:33` | Check auth_date ≤ 5 min old |
| 12 | ✅ @EventListener fires on rolled-back transactions | `AuditEventListener`, `QueueEventBroadcaster`, `NotificationListener` | Switch to `@TransactionalEventListener(AFTER_COMMIT)` |
| 13 | ✅ NPE when `windowId` is null in TicketNoShow broadcast | `QueueEventBroadcaster:126` | Null-safe toString |
| 14 | ✅ No-show race: scheduler vs operator mark-served | `TicketService` | Add status guard before UPDATE |
| 15 | ✅ actuator/prometheus is permitAll | `SecurityConfig:44` | Changed to require auth (only /actuator/health is public) |

## P2 — Within first quarter (≈ 5 weeks)

| # | Issue | Fix |
|---|-------|-----|
| 16 | ✅ In-memory rate limit grows unbounded | Added BucketEntry with lastUsed + @Scheduled hourly eviction |
| 17 | ✅ Scheduler state breaks multi-instance | Added ShedLock (V4 migration + ShedLockConfig + @SchedulerLock on all 4 jobs) |
| 18 | ✅ `analytics.ticket_event` hypertable never written | AuditEventListener now writes joined/served/cancelled/no_show rows |
| 19 | ✅ RabbitMQ + Spring AI BOM unused | Removed from root build.gradle.kts, app/build.gradle.kts, application.yml, all module build files |
| 20 | ✅ CORS too broad for STOMP | Restricted allowedOriginPatterns to zeyvo.app + localhost:3000 |
| 21 | ✅ No CSP/HSTS/X-Frame-Options headers | Added to nginx/zeyvo.conf (both vhosts) and next.config.mjs |
| 22 | Telegram duplicate services (bot + webhook) | Minor; no separate TelegramBotService exists — deferred |

## P3 — Rolling debt

- Replace inline styles with CSS Modules / Tailwind classes (3-4 weeks, deferred)
- ✅ Wire next-intl — i18n/request.ts created, uz/ru/en message catalogs present
- Add Testcontainers integration tests (2 weeks, deferred)
- ✅ Structured logging with correlation IDs — RequestCorrelationFilter added (MDC: trace_id, tenant_id, user_id)
- ✅ Delete empty common-domain module — removed from settings, all build files, directory deleted
- ✅ Add actor_user_id index on audit_event — included in V4 migration
- i18n for notification templates (deferred)

---

## Refactor order (all implemented)

**P0 (all implemented):**
1. ✅ Remove leaked bot token default from application.yml
2. ✅ @PreAuthorize on all admin/operator/super-admin endpoints
3. ✅ Profile-guard /v1/dev/seed (moved to DevSeedController with class-level @Profile)
4. ✅ Secure registerWebhook endpoint
5. ✅ Fail-fast webhook secret check (constant-time, mandatory)
6. ✅ resolveOrgId: 403 for no-org users
7. ✅ STOMP ChannelInterceptor JWT auth
8. ✅ Fix DeviceController path prefix
9. ✅ accessToken out of localStorage

**P1 (all implemented):**
10. ✅ auth_date age check in validateAndExtractUser
11. ✅ @TransactionalEventListener(AFTER_COMMIT) for AuditEventListener, QueueEventBroadcaster, NotificationListener
12. ✅ Null-safe windowId in QueueEventBroadcaster (LinkedHashMap instead of Map.of)
13. ✅ Status guard in TicketService.markNoShow() — skips if not CALLED
14. ✅ actuator/* secured (only /actuator/health is public)

**P2 (all implemented):**
15. ✅ Rate limit eviction — BucketEntry with TTL + @Scheduled hourly cleanup
16. ✅ ShedLock — V4 migration, ShedLockConfig bean, @SchedulerLock on checkAndMarkNoShows/checkNearTurn/expireStaleTickets/pruneNudgeMemory
17. ✅ analytics.ticket_event writes — AuditEventListener.writeAnalytics() for joined/served/cancelled/no_show events
18. ✅ Removed spring.ai.bom, spring.boot.starter.amqp (all modules), testcontainers.rabbitmq, RabbitMQ config block
19. ✅ CORS restricted in WebSocketConfig
20. ✅ HSTS + CSP + X-Frame-Options + X-Content-Type-Options in nginx.conf + next.config.mjs

**P3 (implemented):**
21. ✅ RequestCorrelationFilter — populates MDC trace_id, tenant_id, user_id; echoes X-Trace-Id header
22. ✅ common-domain deleted — empty module removed everywhere
23. ✅ Audit index V4 migration — idx_audit_event_actor on (actor_user_id, occurred_at DESC)

## Security posture after all fixes

| Area | Before | After |
|------|--------|-------|
| Privilege escalation | curl one-liner to org_admin | Blocked by @PreAuthorize |
| Cross-tenant write | Default for all users | 403 for no-org; org_id from JWT |
| Bot takeover | No auth on registerWebhook | SUPER_ADMIN required |
| Telegram replay | Signatures valid indefinitely | auth_date ≤ 5 min enforced |
| STOMP anon subscribe | Anyone can subscribe to any branch ops | JWT required on CONNECT |
| Token XSS exposure | Both tokens in localStorage | accessToken memory-only |
| Device path bug | /api/api/v1/devices (404) | /api/v1/devices (working) |
| Fake social proof | 2.4M tickets, 142 customers (fabricated) | Honest capability claims |
| No-show race | Double-mark possible | Status guard in markNoShow() |
| Scheduler double-fire | All instances fire on multi-JVM | ShedLock prevents duplicate execution |
| Missing security headers | No HSTS/CSP/X-Frame | Full header set in nginx + Next.js |
| Analytics dead | hypertable empty forever | Events written on ticket lifecycle |
| Log correlation | No trace IDs | MDC filter: trace_id/tenant_id/user_id |
