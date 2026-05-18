#!/usr/bin/env bash
# Deploy latest images to production droplet.
# Usage: ./infra/scripts/deploy.sh [SHA]
set -euo pipefail

SHA="${1:-latest}"
HOST="${DROPLET_HOST:?Set DROPLET_HOST}"
USER="${DROPLET_USER:-root}"

echo "→ Deploying $SHA to $HOST"

ssh "$USER@$HOST" <<EOF
  set -e
  cd /opt/zeyvo
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$SHA/" .env
  docker compose -f infra/docker/docker-compose.prod.yml pull backend web
  docker compose -f infra/docker/docker-compose.prod.yml up -d backend web
  until docker exec zeyvo-backend wget -qO- http://localhost:8080/api/actuator/health 2>/dev/null; do sleep 3; done
  echo "✓ Deploy complete: $SHA"
EOF
