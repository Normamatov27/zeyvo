# zeyvo — Production Deploy Runbook

Target: single DigitalOcean droplet, Ubuntu 24.04, 8 GB RAM / 4 vCPU.

---

## 1. First-time droplet setup

```bash
# 1. Create droplet: Ubuntu 24.04, 8 GB RAM, SGP1 or FRA1 region, add your SSH key.
# SSH in as root:
ssh root@YOUR_DROPLET_IP

# 2. Harden
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban

ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable

# 3. Install Docker Engine (not Desktop)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 4. Install s3cmd for backups
apt install -y s3cmd
# Configure once with your DO Spaces credentials:
s3cmd --configure
# endpoint: sgp1.digitaloceanspaces.com (or your region)
```

---

## 2. Clone repo onto droplet

```bash
mkdir -p /opt/zeyvo && cd /opt/zeyvo
git clone https://github.com/YOUR_ORG/zeyvo.git .
```

---

## 3. Create `.env` on the droplet

Copy `.env.example` → `.env` and fill in real values:

```bash
cp .env.example .env
nano .env
```

Required values to set (everything else has a working default):

| Variable | Value |
|---|---|
| `POSTGRES_PASSWORD` | strong random string |
| `JWT_SECRET` | 32+ char random string (`openssl rand -hex 32`) |
| `TELEGRAM_BOT_TOKEN` | from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | any random string — must match what you set in Telegram |
| `TELEGRAM_BOT_USERNAME` | e.g. `zeyvo_bot` |
| `ESKIZ_EMAIL` | Eskiz.uz account email |
| `ESKIZ_PASSWORD` | Eskiz.uz account password |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `IMAGE_TAG` | `latest` |
| `SPACE_BUCKET` | your DO Spaces bucket name |

---

## 4. TLS certificate (Let's Encrypt)

```bash
apt install -y certbot
# Point your DNS A records first:
#   zeyvo.app   → droplet IP
#   api.zeyvo.app → droplet IP

certbot certonly --standalone -d zeyvo.app -d api.zeyvo.app

# Auto-renew (cron already handles this via certbot timer, verify):
systemctl status certbot.timer
```

---

## 5. First deploy

```bash
cd /opt/zeyvo

# Pull and start all services
docker compose -f infra/docker/docker-compose.prod.yml pull
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Watch logs
docker compose -f infra/docker/docker-compose.prod.yml logs -f backend
```

Flyway runs automatically on backend startup and applies all migrations.

**Smoke test:**
```bash
curl https://api.zeyvo.app/api/actuator/health
# → {"status":"UP"}

curl https://api.zeyvo.app/api/v1/branches
# → []  (empty until seed data added)
```

---

## 6. Register Telegram webhook

Run once after first deploy:

```bash
curl -X POST "https://api.zeyvo.app/api/v1/integrations/telegram/register-webhook?url=https://api.zeyvo.app"
# → Webhook registered: https://api.zeyvo.app/api/v1/integrations/telegram/webhook
```

---

## 7. Seed data (optional, for first demo branch)

```bash
# Copy the seed file to the postgres container and run it:
docker cp infra/docker/seed.sql zeyvo-postgres:/tmp/seed.sql
docker exec -i zeyvo-postgres psql -U zeyvo -d zeyvo -f /tmp/seed.sql
```

---

## 8. Nightly backup cron

```bash
crontab -e
# Add:
0 3 * * * POSTGRES_USER=zeyvo SPACE_BUCKET=zeyvo-backups /opt/zeyvo/infra/scripts/backup.sh >> /var/log/zeyvo-backup.log 2>&1
```

---

## 9. Subsequent deploys (CI/CD)

Pushes to `main` on GitHub trigger `.github/workflows/deploy.yml` automatically:
1. Builds Docker images, pushes to GHCR.
2. SSH into droplet, updates `IMAGE_TAG`, pulls new images, restarts `backend` and `web`.
3. Waits for `/api/actuator/health` to return 200 before declaring success.

**Manual deploy** (if CI is unavailable):
```bash
# On the droplet:
cd /opt/zeyvo
git pull
IMAGE_TAG=<SHA> docker compose -f infra/docker/docker-compose.prod.yml pull backend web
docker compose -f infra/docker/docker-compose.prod.yml up -d backend web
```

---

## 10. Rollback

```bash
# On the droplet (or run infra/scripts/deploy.sh <previous-sha> from dev):
cd /opt/zeyvo
IMAGE_TAG=<previous-sha> docker compose -f infra/docker/docker-compose.prod.yml pull backend web
IMAGE_TAG=<previous-sha> docker compose -f infra/docker/docker-compose.prod.yml up -d backend web
```

---

## 11. Useful commands

```bash
# Tail all logs
docker compose -f infra/docker/docker-compose.prod.yml logs -f

# Postgres shell
docker exec -it zeyvo-postgres psql -U zeyvo -d zeyvo

# Redis CLI
docker exec -it zeyvo-redis redis-cli

# Restart single service (e.g. after config change)
docker compose -f infra/docker/docker-compose.prod.yml restart backend

# View backend memory usage
docker stats zeyvo-backend --no-stream
```

---

## 12. GitHub Secrets & Variables to configure

In your GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `DROPLET_HOST` | droplet IP |
| `DROPLET_USER` | `root` |
| `DROPLET_SSH_KEY` | private key contents (`cat ~/.ssh/id_rsa`) |

In your GitHub repo → Settings → Variables → Actions (optional — defaults to `wss://api.zeyvo.app`):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_WS_URL` | e.g. `wss://api.zeyvo.app` | Inlined into the web bundle at build time |
| `NEXT_PUBLIC_TG_BOT_USERNAME` | e.g. `zeyvo_bot` | Inlined into the web bundle at build time |

> ⚠️ `NEXT_PUBLIC_*` values are baked into the Next.js bundle during `docker build`.
> Changing them requires rebuilding the web image — runtime env vars have no effect.

---

## Memory budget (8 GB droplet)

| Service | Limit |
|---|---|
| backend (JVM) | 1 024 MB |
| web (Node) | 512 MB |
| postgres | 512 MB |
| redis | 300 MB |
| nginx | 64 MB |
| **Total** | **~2.4 GB** (plenty of headroom) |
