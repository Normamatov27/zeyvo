#!/usr/bin/env bash
# Nightly backup: dump Postgres → gzip → upload to DO Spaces.
# Run via cron: 0 3 * * * /opt/zeyvo/infra/scripts/backup.sh
set -euo pipefail

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="zeyvo-${DATE}.sql.gz"
SPACE_BUCKET="${SPACE_BUCKET:?Set SPACE_BUCKET}"

echo "→ Backing up Postgres..."
docker exec zeyvo-postgres pg_dumpall -U "${POSTGRES_USER:-zeyvo}" \
  | gzip > "/tmp/${BACKUP_FILE}"

echo "→ Uploading to DO Spaces..."
s3cmd put "/tmp/${BACKUP_FILE}" "s3://${SPACE_BUCKET}/backups/${BACKUP_FILE}"

# Purge local temp
rm -f "/tmp/${BACKUP_FILE}"

# Keep only last 30 days in Spaces
s3cmd ls "s3://${SPACE_BUCKET}/backups/" \
  | awk '{print $4}' \
  | sort \
  | head -n -30 \
  | xargs -r s3cmd del

echo "✓ Backup complete: ${BACKUP_FILE}"
