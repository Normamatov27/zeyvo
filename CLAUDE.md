# zeyvo — production repo guide

## What this repo is

Full-stack queue & appointment SaaS for Uzbekistan service businesses (banks, clinics, salons).
Live at **https://zeyvo.tech**.

## Repository layout

```
apps/
  web/           Next.js 15 App Router, TypeScript, next-intl, Zustand
backend/
  app/                   Spring Boot 3.4 main app (entry point, JPA, controllers)
  module-auth/           OTP auth, JWT, TG WebApp HMAC validation
  module-queue/          Ticket + service + branch domain
  module-notification/   Telegram webhook controller + DevSMS gateway
  common-web/            Rate-limit filter, CORS, error handler
infra/
  docker-compose.prod.yml
  nginx/                 nginx.conf + Let's Encrypt certs
  scripts/backup.sh      Nightly pg_dump → DO Spaces
  runbooks/DEPLOY.md     Step-by-step deploy + SSH key instructions
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, next-intl v3.26 (uz/ru/en), Zustand (auth) |
| Backend | Spring Boot 3.4, Java 21, Spring Data JPA, Spring WebSocket (STOMP) |
| DB | PostgreSQL 16, schema `app`, migrations via Flyway |
| Cache / rate-limit | Redis 7 (Bucket4j in-memory for now) |
| Auth | JWT (access 15 min / refresh 7 days), OTP via DevSMS.uz |
| TG | Telegram Bot API webhook, WebApp SDK |
| Infra | DigitalOcean Droplet, Docker Compose, nginx, Let's Encrypt |

## Environment variables (never commit)

```
SPRING_DATASOURCE_URL        jdbc:postgresql://...
SPRING_DATASOURCE_PASSWORD   ...
ZEYVO_JWT_SECRET             ...
ZEYVO_JWT_REFRESH_SECRET     ...
ZEYVO_TELEGRAM_BOT_TOKEN     ... (keep consistent — HMAC depends on this)
ZEYVO_DEVSMS_API_KEY         ...
NEXT_PUBLIC_API_URL          https://zeyvo.tech
NEXT_PUBLIC_BOT_USERNAME     zeyvo_bot
```

Stored in `/opt/zeyvo/.env.prod` on the droplet. Backend picks them up via Docker env_file.

## SSH access (read infra/runbooks/DEPLOY.md for full steps)

Key: `C:\Users\LOQ\zeyvo` (passphrase protected).
**Always**: copy → decrypt → use → delete unencrypted file afterward.
Never leave `C:\Users\LOQ\.zeyvo_deploy` on disk between sessions.

## How to deploy

Short version (see DEPLOY.md for full):
```
# 1. Build frontend
cd apps/web && npm run build

# 2. Build backend
cd backend && mvn -pl app -am package -DskipTests

# 3. SCP jars + docker-compose + .env to droplet
# 4. SSH: docker compose -f docker-compose.prod.yml up -d --build
```

Never use `--no-verify` on git commits. Never `git push --force` to main.

## Don't touch

- `infra/nginx/nginx.conf` — Let's Encrypt paths are exact; wrong edit = cert renewal failure.
- `backend/app/src/main/resources/db/migration/` — never edit existing V*.sql files, only add new ones.
- `.env.prod` on droplet — always diff before editing; it has all prod secrets.

## Active features & known state (May 2026)

- **Queue (live ticket)**: complete end-to-end.
- **Appointments**: V25 migration pending — build feature before enabling.
- **TG HMAC**: diagnostic logging added in `TelegramAuthService`. Check logs after TG auth attempts (`docker logs zeyvo-backend | grep tg-auth`).
- **Backup cron**: script exists at `infra/scripts/backup.sh`. Verify cron installed on droplet with `crontab -l`.
- **Privacy/Terms**: pages exist at `/privacy` and `/terms`. Needs legal review before enforcing.

## Runbook links

- Full deploy: `infra/runbooks/DEPLOY.md`
- Backup: `infra/scripts/backup.sh`

## AI session notes

- The design-system prototype lives in `D:\Claude\online-queue (1)` — that is NOT this repo.
- This repo is the production app. The CLAUDE.md there describes the prototype; ignore it when working here.
- Locale default: `uz`. Cookie: `NEXT_LOCALE`. Messages in `apps/web/messages/{en,ru,uz}.json`.
- All API calls from the frontend go through `apps/web/lib/api.ts` (`apiFetch` / `apiFetchAnon`) — 30 s timeout is built in.
