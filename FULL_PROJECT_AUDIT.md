# Zeyvo Full Project Audit

Date: 2026-05-28

Verdict: Zeyvo is not production-ready. It is a visually ambitious prototype with some serious backend foundations, but the current product would be reckless to launch for clinics, salons, or diagnostic centers that depend on reliable customer flow. The most severe problems are authorization failures, tenant-isolation gaps, broken customer identity propagation, incorrect queue state transitions, misleading operational analytics, and deployment configuration that does not line up with the actual infrastructure.

This is not "enterprise-grade operational infrastructure" yet. It is a broad MVP with premium visual intent and unsafe operational internals.

## Audit Scope

Reviewed areas:

- Root monorepo structure, package setup, and infra folders.
- Next.js app under `apps/web`.
- Shared UI package under `packages/ui`.
- Spring Boot backend modules under `backend`.
- Flyway migrations under `backend/app/src/main/resources/db/migration`.
- Nginx, Docker Compose, GitHub Actions, and backup scripts under `infra`.
- Queue, appointment, chat, device, notification, analytics, auth, and platform flows.

Verification note: attempted to run `pnpm --filter web typecheck` and `.\gradlew.bat test`, but the Windows sandbox runner failed before launching the processes with `CreateProcessAsUserW failed: 1312`. No successful build or test run was completed during this audit.

## Executive Summary

Zeyvo has the skeleton of a serious SaaS product: modular backend, Flyway migrations, JWT auth, Telegram integration, queue events, schedulers, dashboards, and a wide customer/admin surface. That breadth is also the problem. The system currently presents itself as operational software before the core invariants are safe.

The queue engine is not reliable enough for real operations. Ticket ownership is broken in critical customer endpoints because controllers ask Spring for `@AuthenticationPrincipal Principal`, while the JWT filter stores the principal as a `String`. Appointment ownership has the same class of bug. Several admin actions have no role guard. Some endpoints treat a client-provided boolean as proof that the user is an admin. WebSocket subscriptions do not enforce branch/tenant authorization. Device registration is effectively open to authenticated users. Chat admin access is not scoped on message/reply/close endpoints.

The UI looks expensive in places, but the operational product does not yet feel like Stripe, Linear, Vercel, or Apple. It feels like a polished demo with handcrafted screens, inconsistent product rules, desktop-only admin, too much inline styling, incomplete i18n, shallow loading/error states, and analytics that imply more accuracy than the backend can support.

## Scores

- Production readiness: 2/10
- SaaS quality: 5/10
- Enterprise readiness: 2/10
- UX quality: 5.5/10
- Architecture quality: 5/10
- Security posture: 2/10
- Queue correctness: 3/10
- Operational practicality: 4/10

These scores are not low because the project is empty. They are low because the product is trying to be operational infrastructure while violating basic trust, authorization, and state-machine rules.

## P0 Launch Blockers

1. Customer identity is broken in ticket and appointment controllers.
   - `JwtAuthFilter` sets the authentication principal to a user-id `String`.
   - `TicketController` and `AppointmentController` inject `@AuthenticationPrincipal Principal`.
   - Result: endpoints either treat logged-in users as anonymous or throw null-pointer failures.
   - Impact: authenticated tickets can be created as anonymous, "my tickets" can be empty, duplicate active-ticket prevention is bypassed, and cancellation/confirmation ownership checks collapse.

2. Unauthorized users can perform sensitive queue and appointment actions.
   - `TicketController.transfer` has no role/tenant guard.
   - `TicketController.rate` has no ownership guard.
   - `TicketController.get` exposes ticket detail by UUID.
   - `AppointmentController.confirm`, `check-in`, `start`, and `no-show` lack role checks.
   - `AppointmentController.cancel` trusts `?admin=true`.

3. Tenant isolation is inconsistent.
   - Queue actions often rely on branch IDs without validating caller organization.
   - WebSocket subscription logic does not authorize branch topics.
   - Chat admin message/reply/close endpoints are not conversation-org scoped.
   - Device list/register endpoints are authenticated but not role/tenant scoped.

4. Queue state transitions are not operationally correct.
   - `startServing()` exists but the queue flow does not actually use it.
   - `markServed()` computes service duration from `servingAt`, which is usually null.
   - `callNext()` can auto no-show a called ticket if an operator clicks next too early.
   - `markServed()` does not verify that the ticket belongs to the selected window.
   - Transfer-to-window is a UI fiction because `callNext()` ignores the assigned window.

5. Ticket creation trusts client-provided service metadata.
   - `TakeTicketRequest` accepts `branchId`, `serviceId`, and `serviceCode`.
   - `TicketService.takeTicket()` does not strongly prove that service belongs to branch/org and is active.
   - Ticket numbering and service semantics can be spoofed or corrupted.

6. Platform payment metrics are broken.
   - `PlatformController.metricsPlans()` references `pr.organization_id` and `pr.approved_at`.
   - The schema uses `org_id` and `reviewed_at`.
   - `metricsPayments()` references `amount_uzs`, while the schema uses `amount` plus `currency`.
   - Result: platform metrics endpoints will fail at runtime.

7. Deployment configuration is inconsistent.
   - Compose image names use `zeyvo-backend:${IMAGE_TAG}` / `zeyvo-web:${IMAGE_TAG}`.
   - GitHub Actions pushes GHCR images.
   - Nginx, CORS, runbook, and environment defaults disagree between `zeyvo.tech`, `zeyvo.app`, and `api.zeyvo.app`.
   - A serious operator would not know what domain is canonical.

8. Frontend token handling is unsafe.
   - Refresh token is returned in response body and stored in localStorage.
   - XSS becomes long-lived account takeover.
   - The httpOnly cookie exists, but the localStorage token undermines it.

## Project Structure Audit

### Strengths

- The backend is split into recognizable modules: `auth`, `queue`, `tenant`, `analytics`, `notification`, `realtime`, `adapter`, and `common-web`.
- Flyway migrations exist and show intent to manage schema evolution.
- The frontend is a Next.js app with a separate `packages/ui`, which is the right direction for a SaaS monorepo.
- Infra is not ignored. There is Docker Compose, Nginx, backup scripting, and a deployment workflow.
- Queue domain concepts are represented explicitly: tickets, services, branches, windows, appointment providers, waitlists, events, schedulers.

### Weaknesses

- The monorepo is messy. Marketing/ad artifacts, logs, generated images, old audit files, and app code live side by side.
- The frontend has a shared UI package, but most screens bypass it with inline styles and one-off components.
- Backend modules are not clean bounded contexts. Controllers reach into `EntityManager` and write native SQL directly across modules.
- There is no consistent authorization abstraction. Every controller improvises tenant and role checks.
- There is no central queue state-machine policy. Ticket transitions are scattered across services, controllers, schedulers, and UI assumptions.
- Native SQL is used heavily without a repository/query layer that documents ownership, locking, and tenant constraints.
- The `ad` Remotion project in the same repo makes the product repo look less serious unless it is intentionally separated as marketing tooling.

### Structural Debt

- Too many product areas exist before the core queue invariant is reliable: queue, appointments, analytics, predictions, chat, payments, Telegram, hardware adapters, onboarding, platform admin.
- The codebase has "surface-area bloat": many screens and endpoints, not enough proof that each one is correct.
- UI architecture is screen-driven rather than system-driven. It will get slower to change as the product grows.
- Backend security is annotation-by-memory. That is how tenant data leaks happen.

## UI/UX Audit

Zeyvo has a strong visual ambition, but visual ambition is not the same as operational UX maturity.

### What Feels Premium

- Dark visual system, glassy surfaces, mono labels, animated landing visuals, and dashboard density show care.
- Ticket tracking screen has a clear ticket number, ETA, timeline, and call-to-action areas.
- Signage and kiosk screens understand that queue systems need dedicated physical-mode surfaces.
- Admin navigation has the beginning of a role-aware SaaS shell.

### What Feels Like a Student Project

- Admin is explicitly blocked below 900px. Real clinics use tablets, small laptops, shared counters, and phones. Desktop-only admin is not acceptable.
- UI strings are hard-coded across many pages despite `next-intl` being present.
- Many pages are built with massive inline style objects. This blocks consistent polish and makes the design system fake.
- Empty/error/loading states are uneven and often not operationally specific.
- The landing page uses simulated business metrics that do not appear backed by real data. That damages enterprise trust.
- Several flows assume happy-path usage instead of receptionist pressure, angry customers, branch outages, staff handovers, or payment disputes.

### Visual Hierarchy Problems

- The marketing site is more cinematic than credible. It sells an idea better than it sells operational reliability.
- Dashboards show many metrics but do not separate "action now" from "interesting later".
- Queue admin needs a control-room layout. It currently behaves like a dashboard plus buttons.
- Critical operator actions are not visually separated enough from secondary actions.
- Mobile customer flows are better than admin, but trust cues are missing: last updated, branch open status, grace period, and what to do if called late.

## Product Logic Audit

The product is trying to serve customers, receptionists, managers, super admins, Telegram users, kiosk users, signage viewers, and device integrations. That is correct for the vision, but the current implementation does not define the operational contract tightly enough.

Missing core product decisions:

- What exactly happens when a customer is late?
- How many times can a ticket be called before no-show?
- Can staff manually restore a no-show?
- Can a ticket be paused?
- Can a receptionist reorder tickets?
- Can VIP/urgent/elderly/patient categories override FIFO?
- Can a branch temporarily stop new remote tickets while serving existing tickets?
- What happens when Telegram/SMS delivery fails?
- Who owns a customer when they belong to multiple organizations?
- How does a branch reconcile walk-ins, remote joins, appointments, and emergency overrides?

Without these policies, the UI can look polished while real operations break.

## Queue Flow Audit

### Queue Joining

The backend validates broad branch availability, but it does not enforce enough service/branch/org integrity. The client sends too much trusted data.

Risks:

- Cross-branch service mismatch.
- Inactive service use.
- Spoofed service code.
- Anonymous ticket creation for authenticated users due to principal mismatch.
- Duplicate active-ticket prevention bypassed for authenticated users treated as anonymous.

### Queue Tracking

The customer ticket page is the strongest consumer feature, but the trust model is weak.

Problems:

- ETA is heuristic and overconfident.
- No "last updated" trust signal.
- No visible stale/offline state.
- No clear no-show grace period.
- Browser notification permission is requested too late.
- Position semantics are not translated into reassuring copy like "you are next".

### Queue Calling

The operator workflow has dangerous assumptions.

Problems:

- `callNext()` can no-show an existing called ticket.
- `markServed()` does not validate selected window ownership.
- `currentlyServing` in the admin UI can fall back to `active[0]`, making the selected window and shown ticket diverge.
- `SERVING` state is mostly bypassed.
- Service duration analytics will be wrong.

### Cancellation

Cancellation is unsafe.

Problems:

- Principal mismatch makes customer ownership unreliable.
- Anonymous/admin path in `TicketService.cancel()` is too dangerous when controllers can accidentally pass null.
- Appointment cancel accepts `admin=true` from the client.

### Transfer

Transfer is not real transfer.

The UI suggests a ticket can be moved to a specific window. The backend sets `windowId` and priority, but the next-ticket selector ignores `windowId`. This is operationally misleading.

## Customer Psychology Audit

Queue products are psychological products. The user is anxious, uncertain, and worried about losing their place.

Current trust gaps:

- ETA is shown as if it is reliable, but the underlying estimator is primitive.
- The customer is not told what affects ETA.
- There is no confidence range.
- No "last updated" timestamp.
- No branch status signal: open, delayed, paused, overloaded, emergency mode.
- No clear instructions for late arrival or missed call.
- No fallback notification channel.
- No reassurance that leaving the building is safe until a specific threshold.

What Zeyvo needs:

- "Updated 20 seconds ago."
- "You are next. Stay nearby."
- "Expected call: 12:30-12:40."
- "Branch is running 14 minutes behind schedule."
- "If you arrive within 5 minutes of being called, staff can still restore you."
- "Notifications enabled on Telegram. SMS fallback unavailable."

Right now the product reduces some waiting anxiety but creates new anxiety through overconfident numbers and underspecified rules.

## Dashboard Audit

The dashboard has ambition but not enough operational discipline.

Useful metrics:

- Waiting now.
- Average wait.
- No-show rate.
- SLA breach count.
- Open windows.
- Staff load.
- Appointment check-ins.
- Tickets served today.

Weak or missing metrics:

- Wait-time percentiles, not just averages.
- Queue abandonment/cancellation reasons.
- No-show recovery rate.
- Remote vs kiosk vs walk-in conversion.
- Staff/window throughput.
- Service-specific bottlenecks.
- Peak-hour staffing recommendations.
- Branch delayed/paused status.
- Notification delivery success.
- Forecast accuracy.

Useless or premature areas:

- Prediction UI before the queue data model is correct.
- Platform revenue metrics while payment schema/query code is broken.
- Marketing-style stats that make claims without operational backing.

## Frontend Engineering Audit

### Strengths

- Next.js app structure is understandable.
- React Query, Zustand, STOMP, Recharts, Radix, lucide, and next-intl are reasonable choices.
- Customer app, Telegram app, admin app, platform app, kiosk, and signage are separated by route groups.
- `apiFetch` has timeout and refresh retry logic.

### Problems

- Refresh tokens in localStorage are a major security flaw.
- `middleware.ts` checks only a refresh cookie, while the frontend auth store depends on localStorage. Navigation protection and actual auth state can disagree.
- STOMP client is a singleton with token/auth state problems. If it connects unauthenticated first, later authenticated subscriptions can reuse the wrong connection.
- Inline styles dominate. This kills reuse, theming discipline, and responsive consistency.
- Shared UI primitives are too thin for the product surface.
- Admin is not responsive.
- Many interactive elements lack consistent keyboard/focus/ARIA behavior.
- Polling is layered on top of WebSockets without a clear stale-data strategy.
- API calls often swallow errors, especially dashboards and polling loops.

## Backend Engineering Audit

### Strengths

- Java 21 and Spring Boot are appropriate for operational SaaS.
- Flyway migrations are present.
- Transaction annotations exist around critical operations.
- `SKIP LOCKED` and advisory locks show awareness of concurrency.
- ShedLock exists for scheduled jobs.
- JWT access tokens and refresh rotation exist.
- Rate limiting exists, even if not production-grade.

### Problems

- Authorization is inconsistent and often missing.
- Tenant validation is repeated by hand and easy to forget.
- Controllers contain native SQL and business logic.
- Queue state machine is not centralized.
- Appointment and queue systems are not reconciled cleanly.
- WebSocket authorization is weak.
- Events are asynchronous without durable outbox semantics.
- Analytics depends on fields that are never populated correctly.
- Redis is present but not used to solve the actual horizontal-scaling problems.

## Database Audit

### Strengths

- Schema is explicit and reasonably normalized for the first iteration.
- Ticket indexes exist for branch/status/joined-time access patterns.
- Separate `analytics` schema exists.
- Partial and composite indexes are used in places.

### Problems

- `analytics.ticket_event.service_id` is non-null, but cancellation/no-show/expired analytics can pass null.
- `operating_hours` allows only one interval per day. Real clinics need breaks, lunch, multiple shifts, holidays, exceptions.
- Day-of-week semantics are inconsistent between operating hours and provider schedules.
- Payment query code references columns that do not exist.
- Multi-tenancy relies on application checks instead of systematic query constraints.
- Device config can contain sensitive data and is returned through `DeviceResponse`.
- Appointment uniqueness and status rules need a business-policy review.

## Security Audit

Critical risks:

- Broken principal injection in ticket/appointment controllers.
- Client-controlled admin appointment cancellation.
- Missing role guards on appointment admin actions.
- Missing tenant/role guards on ticket transfer and device endpoints.
- WebSocket subscriptions do not enforce branch ownership.
- Chat admin endpoints leak cross-org conversations by UUID.
- Refresh token stored in localStorage.
- In-memory rate limiting is not distributed.
- Public branch/ticket/signage surfaces expose operational data too broadly.

Security posture: not acceptable for production.

## Performance Audit

Main risks:

- Polling is excessive across ticket, queue, overview, analytics, and signage screens.
- WebSocket simple broker is in-memory and not horizontally scalable.
- Analytics and dashboard queries use correlated subqueries and repeated per-branch calls.
- Schedulers scan queue state repeatedly.
- React screens are large and style-heavy.
- Recharts and dashboard pages can become heavy as data grows.
- Device fan-out is async but not durable.

The product will probably behave acceptably in a demo. It is not designed for thousands of concurrent queue watchers across many branches.

## Production Readiness Audit

Not production-ready.

Blocking gaps:

- Build/test execution was not verified in this audit due sandbox process launch failure.
- CI builds Docker images with tests skipped in backend Dockerfile.
- Compose image names do not match GHCR push names.
- Domain configuration is inconsistent.
- Health endpoint details are public in prod.
- No real distributed rate limiting.
- No structured logging with reliable correlation IDs.
- No Sentry/OpenTelemetry/tracing.
- Backups exist but restore/PITR/RPO/RTO are not proven.
- No incident playbooks for queue outage, SMS/Telegram outage, branch pause, or corrupt ticket state.
- No canary/blue-green deployment.

## Enterprise Readiness Audit

A serious business should not trust this yet.

Reasons:

- Authorization gaps are too severe.
- Queue operations can corrupt reality.
- Staff workflows are not designed for high-pressure counters.
- Admin mobile/tablet support is missing.
- Audit trails are incomplete for operational actions.
- Reporting is not reliable enough for owners.
- Integrations are scaffolds.
- Deployment story is inconsistent.
- The product has no visible enterprise controls: SSO, audit exports, branch-level RBAC, data retention, SLA reports, uptime status, billing maturity, admin impersonation safeguards.

## Feature Gap Analysis

Critical missing features:

- Branch pause/incident mode.
- Late-arrival and no-show recovery.
- Manual reorder with audit trail.
- Service-specific queue policies.
- Staff assignment and window ownership.
- Mobile/tablet receptionist mode.
- SLA and threshold alerts.
- Notification delivery status.
- Calendar export and appointment reminders with delivery proof.
- Org-level audit log UI.
- Role/permission management that maps to real staff responsibilities.
- Data export and retention controls.
- Operational onboarding checklist.

## What Should Be Removed Or Hidden

Remove or hide until real:

- Predictions page if it is not backed by validated forecasting.
- Fake/simulated marketing metrics.
- Transfer-to-window UI until backend semantics are true.
- Payment dashboards until schema/query mismatch is fixed.
- Desktop-only admin gate.
- Kiosk printing via unescaped `document.write`.
- Public org/branch discovery if the intended customer flow is QR/branch-specific.
- Hardware adapter claims for providers whose protocols are TODOs.
- Root-level logs and ad assets from the production repo surface.

## Highest Priority Fixes

1. Replace `@AuthenticationPrincipal Principal` usage with `Authentication` or a typed principal helper. Add tests proving customer ID propagation.
2. Build a centralized authorization/tenant guard service and apply it to every controller.
3. Lock down appointment admin actions with roles and branch/org checks.
4. Remove client-controlled `admin=true`.
5. Validate service belongs to branch/org on ticket and appointment creation.
6. Implement a real queue state machine with legal transitions and audit events.
7. Fix window ownership validation for call/serve/no-show/transfer.
8. Move refresh token handling to httpOnly cookie-only web flow.
9. Fix WebSocket subscription authorization.
10. Fix payment/platform metric schema mismatches.
11. Make admin tablet/mobile usable.
12. Fix CI/deploy image/domain configuration.

## Biggest Strengths

- The product vision is meaningful and commercially plausible.
- The repo has serious components, not just a frontend mock.
- Queue domain modeling exists.
- There is enough product surface to see the intended SaaS direction.
- Telegram integration is a strong regional distribution lever.
- Kiosk/signage concepts are correct for service businesses.
- The UI has visual ambition.
- Some backend concurrency tools are already present.

## Biggest Weaknesses

- Security and tenant isolation are not at launch quality.
- Queue correctness is not strong enough for operational reliance.
- UX polish is visual, not systemic.
- Dashboard accuracy is not trustworthy.
- Product scope is too broad for the maturity of the core engine.
- Deployment is not coherent.
- Enterprise trust features are missing.

## Final Verdict

Zeyvo should not launch publicly as an operational infrastructure product in its current state.

It can be demoed. It can be piloted only with explicit guardrails and manual supervision. It should not be sold as enterprise-grade SaaS, and it should not be placed in a clinic where staff and customers depend on it without immediate correction of the P0 issues.

The project has a real foundation. But the current implementation is pretending to be more mature than it is. The fastest path to a credible product is to stop expanding surface area, fix identity/authorization/tenant isolation, make the queue state machine correct, redesign the operator console for real reception work, and remove every feature that implies accuracy or enterprise maturity before the system can prove it.
