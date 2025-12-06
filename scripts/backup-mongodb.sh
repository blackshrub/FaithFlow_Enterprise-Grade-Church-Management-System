#!/bin/bash
# =============================================================================
# FaithFlow MongoDB Backup Script
# =============================================================================
# Automated backup with retention policy and optional cloud upload
#
# Usage:
#   ./scripts/backup-mongodb.sh              # Manual backup
#   crontab: 0 2 * * * /path/to/backup-mongodb.sh  # Daily at 2 AM
#
# Features:
#   - Compressed backups (gzip)
#   - 7-day local retention (configurable)
#   - Optional S3/rclone cloud upload
#   - Integrity verification
#   - Notification on failure
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/faithflow/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${CONTAINER_NAME:-faithflow-mongodb}"
DB_NAME="${DB_NAME:-faithflow}"
DATE_FORMAT=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="faithflow_${DATE_FORMAT}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

log "=========================================="
log "Starting MongoDB backup: ${BACKUP_NAME}"
log "=========================================="

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "MongoDB container '${CONTAINER_NAME}' is not running!"
    exit 1
fi

# Create backup using mongodump inside container
log "Creating backup..."
if docker exec "${CONTAINER_NAME}" mongodump \
    --db="${DB_NAME}" \
    --archive="/tmp/${BACKUP_NAME}.archive" \
    --gzip \
    2>&1 | tee -a "${LOG_FILE}"; then
    log_success "Mongodump completed"
else
    log_error "Mongodump failed!"
    exit 1
fi

# Copy backup from container to host
log "Copying backup to host..."
if docker cp "${CONTAINER_NAME}:/tmp/${BACKUP_NAME}.archive" "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz"; then
    log_success "Backup copied to ${BACKUP_DIR}/${BACKUP_NAME}.archive.gz"
else
    log_error "Failed to copy backup from container!"
    exit 1
fi

# Cleanup temp file in container
docker exec "${CONTAINER_NAME}" rm -f "/tmp/${BACKUP_NAME}.archive"

# Verify backup integrity
log "Verifying backup integrity..."
BACKUP_SIZE=$(stat -f%z "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz" 2>/dev/null || stat -c%s "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz")
# Minimum 100 bytes (empty gzip is ~20 bytes, even minimal data is 100+)
if [ "${BACKUP_SIZE}" -lt 100 ]; then
    log_error "Backup file is suspiciously small (${BACKUP_SIZE} bytes). Verification failed!"
    exit 1
fi
log_success "Backup size: $(numfmt --to=iec ${BACKUP_SIZE} 2>/dev/null || echo ${BACKUP_SIZE} bytes)"

# Create checksum
log "Creating checksum..."
if command -v sha256sum &> /dev/null; then
    sha256sum "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz" > "${BACKUP_DIR}/${BACKUP_NAME}.sha256"
elif command -v shasum &> /dev/null; then
    shasum -a 256 "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz" > "${BACKUP_DIR}/${BACKUP_NAME}.sha256"
fi
log_success "Checksum created"

# Rotate old backups (keep last N days)
log "Rotating old backups (keeping last ${RETENTION_DAYS} days)..."
DELETED_COUNT=0
while IFS= read -r -d '' file; do
    rm -f "${file}"
    rm -f "${file%.archive.gz}.sha256"
    ((DELETED_COUNT++))
done < <(find "${BACKUP_DIR}" -name "faithflow_*.archive.gz" -type f -mtime +${RETENTION_DAYS} -print0 2>/dev/null)
if [ "${DELETED_COUNT}" -gt 0 ]; then
    log_success "Deleted ${DELETED_COUNT} old backup(s)"
else
    log "No old backups to delete"
fi

# List current backups
log "Current backups:"
ls -lh "${BACKUP_DIR}"/*.archive.gz 2>/dev/null | tail -10 | tee -a "${LOG_FILE}"

# Optional: Upload to S3 (if rclone is configured)
if command -v rclone &> /dev/null && rclone listremotes | grep -q "faithflow-backup:"; then
    log "Uploading to cloud storage..."
    if rclone copy "${BACKUP_DIR}/${BACKUP_NAME}.archive.gz" faithflow-backup:mongodb-backups/; then
        log_success "Uploaded to cloud storage"
    else
        log_warning "Cloud upload failed (non-critical)"
    fi
fi

log "=========================================="
log_success "Backup completed successfully!"
log "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.archive.gz"
log "=========================================="

# Return success
exit 0
