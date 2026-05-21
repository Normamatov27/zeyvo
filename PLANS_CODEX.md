# Zeyvo Plans, Pricing Strategy, and Recommendations

Date: 2026-05-21

Scope: review of the local repository plus current public pricing signals from queue-management vendors. This file is a commercial plan only. It does not change code, configuration, database schema, or runtime behavior.

## Executive Recommendation

Use the four plan codes already present in the database schema:

- `trial`
- `starter`
- `growth`
- `enterprise`

Price Zeyvo as a local-first queue and customer-flow SaaS for Uzbekistan and nearby Central Asian markets. The best pricing model is:

- Organization-level subscription.
- Included branch allowance per plan.
- Overage or upgrade when branch count, monthly ticket volume, users, or integration needs grow.
- Telegram and web queue included in all paid plans.
- SMS, hardware, custom integrations, and enterprise support charged separately.

Do not sell Zeyvo as an AI, compliance, or large-enterprise platform yet. Sell it as a practical system that removes physical waiting, gives staff a live operating panel, and gives managers branch analytics.

## Project Facts From Review

The codebase is a monorepo:

- Next.js web app with route groups for public app, auth, admin, super-admin, kiosk, signage, and Telegram mini-app flows.
- Spring Boot modular backend with auth, tenant, queue, notification, analytics, realtime, adapter, and platform modules.
- PostgreSQL schema already stores `app.organization.plan` with allowed values `trial`, `starter`, `growth`, and `enterprise`.
- Onboarding creates new organizations as `trial`.
- Seed data already models realistic early customers: bank, clinic, and telecom branches.

Monetizable capabilities already visible in the product:

- Public branch discovery.
- Remote queue joining.
- Ticket lifecycle: waiting, called, serving, served, no-show, cancelled, expired, transferred.
- Customer ticket page with ETA, queue position, QR code, cancel, confirm presence, and rating.
- Phone OTP and Telegram login flows.
- Telegram mini-app and bot-related flows.
- Kiosk flow for walk-in ticket creation.
- Signage screen for TV/display use.
- Admin live queue panel with operator actions.
- Branch, service, window, and operating-hours management.
- Staff/window management.
- Basic analytics: tickets, served, no-shows, cancellations, average wait, service time, remote share, ratings, staff/window performance, service performance.
- Super-admin platform views for tenants, audit, stats, and feature flags.
- Device adapter scaffolding for kiosks, signage, generic HTTP, and future hardware integration.

Commercial gaps:

- No billing module.
- No entitlement enforcement.
- No plan quota checks.
- No payment provider integration.
- No metering table for monthly tickets or notification usage.
- No pricing page or in-app upgrade flow.
- `organization.plan` is currently only a stored string.
- Several advanced claims should remain roadmap items until fully implemented: real AI forecasting, SSO, compliance certifications, custom hardware adapters, and formal SLA.

## Market Context

Public pricing and positioning signals checked on 2026-05-21:

| Vendor / market signal | Public signal | Pricing implication for Zeyvo |
| --- | --- | --- |
| Waitwhile | Free plan, Starter from USD 31/month, Business from USD 55/month, with location and visit limits. | Low-end cloud queue software can be inexpensive, but higher tiers monetize visit volume, analytics, roles, API, and enterprise needs. |
| Skiplino | Professional USD 299/month/location, Enterprise USD 399/month/location, custom above that. | Serious queue-management buyers accept per-location pricing when the system includes mobile queue, walk-in app, display app, reporting, and support. |
| Qminder | Business around USD 869/month and Premium around USD 1,149/month, with unlimited locations/visitors/service lines and more users/support. | Enterprise queue products price high when they include unlimited scale, analytics, security, integrations, and support. |
| Qmatic | Enterprise-focused, quote-based queue management with appointment scheduling, virtual queuing, self check-in, notifications, analytics, and customer feedback. | Large banks, government, healthcare, and telecom buyers expect sales-led pricing, rollout services, and integrations. |
| Uzbekistan hardware sellers | Local queue systems are often quote-based or sold as hardware/software kits. One public listing shows a hardware-software queue system from UZS 23,500,000 per kit. | Zeyvo should position as faster and lighter than buying a full hardware kit, while offering paid setup for displays, tablets, QR posters, and training. |

Source URLs:

- https://waitwhile.com/pricing/
- https://help.waitwhile.com/en/articles/11408401-how-much-does-waitwhile-cost
- https://www.skiplino.com/queue-management-system/
- https://www.qminder.com/pricing/
- https://www.qmatic.com/solutions/queue-management/
- https://bankomat24.uz/en/product/q-net-basic
- https://barakatexnika.gl.uz/proposal/sistema-upravleniya-ocheredyu-elektronnaya-ochered-47622/

## Recommended Public Pricing

Use UZS as the primary public currency for Uzbekistan. If USD equivalents are shown, update the exchange rate before publishing.

| Plan code | Public name | Recommended price | Best buyer | Included limits |
| --- | --- | ---: | --- | --- |
| `trial` | Trial | UZS 0 for 14 days | New self-serve signup or pilot test | 1 branch, 2 windows, 3 services, 500 tickets/month, 1 signage screen, 1 kiosk screen, 2 admin users |
| `starter` | Starter | UZS 499,000/month | One-branch clinic, salon, small service center, small bank branch | 1 branch, 5 users, 5 windows, 10 services, 3,000 tickets/month, 30-day history |
| `growth` | Growth | UZS 1,490,000/month | Multi-branch clinic, bank branch cluster, telecom service center, diagnostics chain | 3 branches, 20 users, 25 windows, 40 services, 25,000 tickets/month, 180-day history |
| `enterprise` | Enterprise | From UZS 4,900,000/month, annual contract | Bank, government, telecom, hospital network, high-volume public services | Custom branches, custom users, custom ticket volume, custom retention, custom support |

Annual pricing:

- Starter: UZS 4,990,000/year.
- Growth: UZS 14,900,000/year.
- Enterprise: custom annual invoice.

Annual plans should be framed as roughly two months free. For first pilots, give discount by extending the period, not by lowering the list price permanently.

## Plan Entitlements

### Trial

Purpose: activation, not long-term free usage.

Include:

- Public branch page.
- Remote queue join.
- Kiosk page.
- Signage page.
- Telegram login and Telegram queue path.
- Basic admin queue panel.
- Basic branch/service/window setup.
- Basic analytics.

Limit:

- 14 days.
- 500 tickets/month.
- 1 branch.
- 2 windows.
- 2 admin/operator users.
- No exports.
- No custom branding beyond organization name.
- No custom integration support.

Upgrade trigger:

- More than one branch.
- More than 500 tickets.
- Need real support or training.

### Starter

Purpose: make one physical location operational without hardware-heavy procurement.

Include:

- Everything in Trial.
- 1 production branch.
- Up to 5 users.
- Up to 5 windows.
- Up to 10 services.
- 3,000 tickets/month.
- Web remote queue.
- Kiosk mode.
- Signage mode.
- Telegram notifications and Telegram mini-app flow.
- Basic analytics: wait time, served, cancelled, no-show, remote share, ratings.
- 30-day operational history.
- Email or Telegram support during business hours.

Do not include:

- Multi-branch management.
- API/webhooks.
- Custom hardware integration.
- Custom reports.
- SSO.
- SLA.

### Growth

Purpose: monetize operations management, not just ticketing.

Include:

- Everything in Starter.
- 3 branches included.
- Up to 20 users.
- Up to 25 windows.
- Up to 40 services.
- 25,000 tickets/month.
- Staff/window performance analytics.
- Per-service analytics.
- Customer ratings.
- Operating-hours management.
- Role management.
- Audit view for 180 days.
- Basic custom branding: logo, primary color, branch display name.
- Priority support.
- Quarterly operations review for annual customers.

Recommended add-ons:

- Extra branch: UZS 350,000/month.
- Extra 10 users: UZS 150,000/month.
- Extra 10,000 tickets/month: UZS 250,000/month.
- Setup/training package: UZS 1,500,000 one-time.

### Enterprise

Purpose: sales-led contracts where integration, procurement, support, and accountability matter.

Include:

- Everything in Growth.
- Negotiated branch, user, window, service, and ticket limits.
- Custom analytics retention.
- Custom data export.
- Audit retention up to 1 year or more.
- Hardware rollout planning.
- Custom device integrations after technical discovery.
- API/webhooks after contract.
- Dedicated support channel.
- SLA only after production monitoring is mature.
- Optional private deployment or dedicated database for regulated customers.

Recommended charges:

- Minimum software fee: from UZS 4,900,000/month.
- Enterprise setup: from UZS 10,000,000 one-time.
- Custom integration: from UZS 5,000,000 per integration.
- On-site rollout/training: quote per city and branch count.
- SMS: pass-through provider cost plus margin.

Do not promise:

- SOC 2, ISO 27001, HIPAA, or bank-grade compliance unless completed.
- Real AI forecasting until backed by historical data and validated models.
- Unlimited SMS.
- Unlimited custom engineering.
- Hardware compatibility without a tested adapter.

## Packaging Strategy

The main value metric should be active branches, not seats. Branches correlate with revenue, operational complexity, support load, and customer value.

Secondary meters:

- Monthly tickets.
- Users/operators.
- Notification volume.
- Hardware/device integrations.
- Data retention.
- Support/SLA level.

Keep Telegram included. In this market, Telegram is a strategic differentiator and should reduce SMS dependency.

Charge SMS separately. SMS is a variable external cost and should not be bundled as unlimited.

Keep kiosk and signage included in all paid plans. These make Zeyvo feel like a complete queue system without forcing hardware procurement.

Put analytics in paid plans, but keep basic analytics in Starter. Growth should unlock staff, service, branch comparison, longer history, exports, and management reporting.

## Launch Pricing And Sales Motion

Recommended first 90 days:

1. Offer a 14-day self-serve trial for small businesses.
2. Offer a 30-day managed pilot for serious branch customers.
3. Charge a setup fee for managed pilots unless the customer signs an annual plan.
4. Convert successful pilots to Starter or Growth.
5. Keep Enterprise quote-only.

Pilot offer:

- UZS 0 software for 30 days.
- UZS 1,500,000 setup fee, credited back if they sign annual Growth.
- Success metrics agreed before kickoff:
  - 500+ tickets processed.
  - At least 25% remote or Telegram joins.
  - Operator panel used daily.
  - Average wait and no-show metrics captured.
  - At least one manager reviews analytics weekly.

Founding customer discount:

- Up to 30% off for 6 months.
- Only for annual commitment, public testimonial, logo permission, or product feedback calls.
- Never create custom permanent discounts that make future pricing hard to defend.

## Segment Recommendations

### Small clinics, salons, diagnostics, repair centers

Sell Starter.

Message:

- "One branch can run QR queue, Telegram notifications, kiosk, and display without buying a full queue hardware kit."

What they care about:

- Low setup cost.
- Simple staff workflow.
- Customer convenience.
- Fewer angry waiting-room conversations.

### Multi-branch clinics, banks, telecom, private education

Sell Growth.

Message:

- "See live load across branches, manage staff and windows, reduce no-shows, and understand wait-time bottlenecks."

What they care about:

- Branch visibility.
- Staff productivity.
- Queue discipline.
- Reports for management.
- Multi-branch rollout.

### Government, banks, hospitals, large telecom

Sell Enterprise.

Message:

- "Customer-flow infrastructure with rollout support, integrations, auditability, and local implementation."

What they care about:

- Procurement.
- Data ownership.
- Integration with existing systems.
- Support accountability.
- Reporting.
- Security review.

## Product Recommendations

Immediate commercial readiness:

- Add a public pricing section that matches these four plans.
- Remove or soften unsupported AI/compliance claims in marketing.
- Show "Live ETA" or "smart ETA" instead of "AI prediction" until the model exists.
- Add an in-app plan badge for org admins.
- Add a super-admin action to change `organization.plan` manually.
- Add internal documentation for what each plan allows.

Backend entitlement work:

- Add a `PlanEntitlements` service keyed by `organization.plan`.
- Enforce branch creation limits.
- Enforce user/operator limits.
- Enforce service/window limits.
- Track monthly ticket count per organization.
- Reject or warn before quota overage.
- Add plan checks to device registration and integration endpoints.
- Add audit events for plan changes and quota failures.

Database work:

- Keep `organization.plan` as the simple source of truth for MVP.
- Add billing fields only when needed:
  - `billing_status`
  - `trial_ends_at`
  - `current_period_start`
  - `current_period_end`
  - `billing_email`
  - `payment_provider`
  - `external_subscription_id`
- Add monthly usage aggregation:
  - organization id
  - month
  - ticket count
  - SMS count
  - Telegram notification count
  - active branch count

Frontend work:

- Add pricing page.
- Add plan badge in admin settings.
- Add quota warnings in branch/service/window creation flows.
- Add billing/contact-sales CTA for Growth and Enterprise.
- Add a "Book setup call" path for managed pilots.

Payment recommendation:

- Do not build full payment automation before the first paid pilots.
- Start with manual invoices and manual plan assignment.
- Add Payme/Click only after repeatable local demand.
- Add Stripe only if selling outside Uzbekistan.

## What To Avoid

Avoid these pricing mistakes:

- Free forever plan with high ticket volume.
- Unlimited SMS.
- Underpriced custom integrations.
- One-off discounts without expiration.
- Selling Enterprise before support processes exist.
- Charging mostly per user. Branches and ticket volume are better value metrics.
- Competing directly with low global SaaS prices when Zeyvo's real advantage is local language, Telegram, rollout support, and hardware-light deployment.

Avoid these product claims:

- "AI-powered" unless forecasting is real and measured.
- "SOC 2" or "ISO 27001" unless certified.
- "Bank-grade security" unless backed by an actual security program.
- "Unlimited scale" while schedulers, realtime, and rate limits still need multi-instance hardening.
- "Works with all hardware" before adapters are verified.

## Recommended Roadmap

Phase 0: before first paid pilot

- Publish honest pricing.
- Use manual invoices.
- Manually set plan values.
- Make sure production security and tenant isolation are solid.
- Remove unsupported AI/compliance claims.

Phase 1: first 1-3 paid pilots

- Add plan badge and basic quota warnings.
- Track ticket volume by organization.
- Track active branch count.
- Create a pilot scorecard from analytics.
- Charge setup fees.
- Collect proof points and testimonials.

Phase 2: after 3-10 paying organizations

- Add entitlement enforcement.
- Add billing status fields.
- Add admin plan management.
- Add invoice/payment workflow.
- Add exports for Growth.
- Add proper overage reporting.

Phase 3: after 10+ paying organizations

- Add local payment automation.
- Add robust plan analytics.
- Add plan upgrade/downgrade flows.
- Add API/webhooks as paid Growth/Enterprise capability.
- Add enterprise data-retention controls.
- Add validated forecasting only after enough historical ticket data exists.

## Final Pricing Position

Zeyvo should not be the cheapest queue app. It should be the easiest local queue system to deploy in Uzbekistan:

- Cheaper and faster than a hardware-heavy queue kit.
- More local than global SaaS.
- Practical for Telegram-first customers.
- Simple enough for one branch.
- Expandable enough for multi-branch operations.

Recommended default offer:

- Trial: 14 days free.
- Starter: UZS 499,000/month for one branch.
- Growth: UZS 1,490,000/month for up to three branches.
- Enterprise: from UZS 4,900,000/month plus setup and integration fees.

This matches the existing code's plan model, gives small customers a realistic entry point, and still leaves enough pricing room for high-value banks, clinics, telecoms, and government customers.
