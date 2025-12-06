#!/bin/bash
# =============================================================================
# FaithFlow MongoDB Restore Script
# =============================================================================
# Restore from backup archive
#
# Usage:
#   ./scripts/restore-mongodb.sh                    # List available backups
#   ./scripts/restore-mongodb.sh <backup_file>      # Restore specific backup
#   ./scripts/restore-mongodb.sh latest             # Restore latest backup
#
# =============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/faithflow/mongodb}"
CONTAINER_NAME="${CONTAINER_NAME:-faithflow-mongodb}"
DB_NAME="${DB_NAME:-faithflow}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
log_success() { log "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { log "${RED}[ERROR]${NC} $1"; }
log_warning() { log "${YELLOW}[WARNING]${NC} $1"; }

# List available backups if no argument provided
if [ $# -eq 0 ]; then
    echo "Available backups:"
    echo "=================="
    ls -lht "${BACKUP_DIR}"/*.archive.gz 2>/dev/null || echo "No backups found in ${BACKUP_DIR}"
    echo ""
    echo "Usage: $0 <backup_file> | latest"
    exit 0
fi

BACKUP_ARG="$1"

# Handle "latest" argument
if [ "${BACKUP_ARG}" = "latest" ]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/*.archive.gz 2>/dev/null | head -1)
    if [ -z "${BACKUP_FILE}" ]; then
        log_error "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi
else
    BACKUP_FILE="${BACKUP_ARG}"
fi

# Validate backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    # Try with backup dir prefix
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        log_error "Backup file not found: ${BACKUP_FILE}"
        exit 1
    fi
fi

log "=========================================="
log "MongoDB Restore"
log "=========================================="
log "Backup file: ${BACKUP_FILE}"
log "Target database: ${DB_NAME}"
log "Container: ${CONTAINER_NAME}"
log ""

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE%.archive.gz}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    log "Verifying checksum..."
    if command -v sha256sum &> /dev/null; then
        if sha256sum -c "${CHECKSUM_FILE}" --status 2>/dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed!"
            exit 1
        fi
    elif command -v shasum &> /dev/null; then
        if shasum -a 256 -c "${CHECKSUM_FILE}" --status 2>/dev/null; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed!"
            exit 1
        fi
    fi
else
    log_warning "No checksum file found, skipping verification"
fi

# Confirmation prompt
echo ""
log_warning "WARNING: This will DROP the existing '${DB_NAME}' database!"
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
    log "Restore cancelled"
    exit 0
fi

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "MongoDB container '${CONTAINER_NAME}' is not running!"
    exit 1
fi

# Copy backup to container
log "Copying backup to container..."
BACKUP_NAME=$(basename "${BACKUP_FILE}")
docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/tmp/${BACKUP_NAME}"

# Restore using mongorestore
log "Restoring database..."
if docker exec "${CONTAINER_NAME}" mongorestore \
    --archive="/tmp/${BACKUP_NAME}" \
    --gzip \
    --drop \
    --nsInclude="${DB_NAME}.*" \
    2>&1; then
    log_success "Database restored successfully!"
else
    log_error "Restore failed!"
    docker exec "${CONTAINER_NAME}" rm -f "/tmp/${BACKUP_NAME}"
    exit 1
fi

# Cleanup
docker exec "${CONTAINER_NAME}" rm -f "/tmp/${BACKUP_NAME}"

# Verify restoration
log "Verifying restoration..."
COLLECTIONS=$(docker exec "${CONTAINER_NAME}" mongosh --quiet "${DB_NAME}" --eval "db.getCollectionNames().length")
log_success "Database contains ${COLLECTIONS} collections"

log "=========================================="
log_success "Restore completed successfully!"
log "=========================================="
