#!/bin/bash
# =============================================================================
# Traefik to Angie Migration Script
# =============================================================================
# This script performs a full migration from containerized Traefik to
# host-level Angie reverse proxy.
#
# Usage:
#   ./docker/scripts/migrate-traefik.sh
#
# What this script does:
#   1. Stops current Docker services
#   2. Installs Angie web server
#   3. Sets up Angie configuration symlinks
#   4. Generates SSL certificates
#   5. Starts Docker services with new compose file
#   6. Starts and enables Angie
#   7. Verifies all services
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
ANGIE_CONF_DIR="$PROJECT_ROOT/docker/angie"
SCRIPTS_DIR="$PROJECT_ROOT/docker/scripts"

echo -e "${CYAN}=== FaithFlow: Traefik to Angie Migration ===${NC}"
echo ""
echo -e "Project root: ${GREEN}${PROJECT_ROOT}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Confirm migration
echo -e "${YELLOW}WARNING: This will migrate from Traefik to Angie.${NC}"
echo "This includes:"
echo "  - Stopping Docker services"
echo "  - Installing Angie"
echo "  - Generating new SSL certificates"
echo "  - Starting services with new configuration"
echo ""
read -p "Do you want to continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${CYAN}Loading environment variables from .env...${NC}"
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Step 1: Stop current Docker services
echo ""
echo -e "${CYAN}[1/7] Stopping current Docker services...${NC}"
cd $PROJECT_ROOT

# Try to stop with old compose file first
if [ -f "docker/compose/prod.yml" ]; then
    docker compose -f docker/compose/prod.yml down 2>/dev/null || true
fi

# Also try root compose file
docker compose down 2>/dev/null || true

echo -e "${GREEN}Docker services stopped${NC}"

# Step 2: Install Angie
echo ""
echo -e "${CYAN}[2/7] Installing Angie...${NC}"
if command -v angie &> /dev/null; then
    echo -e "${YELLOW}Angie already installed, skipping...${NC}"
    angie -v
else
    $SCRIPTS_DIR/angie-install.sh
fi

# Step 3: Setup Angie configuration
echo ""
echo -e "${CYAN}[3/7] Setting up Angie configuration...${NC}"

# Backup existing config
if [ -d /etc/angie/conf.d ] && [ ! -L /etc/angie/conf.d ]; then
    BACKUP_DIR="/etc/angie/conf.d.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing config to: ${BACKUP_DIR}${NC}"
    mv /etc/angie/conf.d $BACKUP_DIR
fi

# Create symlinks
echo "Creating symlinks to project configuration..."
ln -sf $ANGIE_CONF_DIR/angie.conf /etc/angie/angie.conf
rm -rf /etc/angie/conf.d && ln -sf $ANGIE_CONF_DIR/conf.d /etc/angie/conf.d
rm -rf /etc/angie/sites-available && ln -sf $ANGIE_CONF_DIR/sites-available /etc/angie/sites-available
rm -rf /etc/angie/sites-enabled && ln -sf $ANGIE_CONF_DIR/sites-enabled /etc/angie/sites-enabled

echo -e "${GREEN}Angie configuration linked${NC}"

# Step 4: Generate SSL certificates
echo ""
echo -e "${CYAN}[4/7] Generating SSL certificates...${NC}"

# Check if certificates already exist
CERT_PATH="/etc/letsencrypt/live/${DOMAIN:-flow.gkbj.org}/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
    echo -e "${YELLOW}SSL certificates already exist at: ${CERT_PATH}${NC}"
    read -p "Do you want to regenerate? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping certificate generation..."
    else
        $SCRIPTS_DIR/certbot-init.sh
    fi
else
    $SCRIPTS_DIR/certbot-init.sh
fi

# Step 5: Start Docker services with new compose file
echo ""
echo -e "${CYAN}[5/7] Starting Docker services...${NC}"
cd $PROJECT_ROOT
docker compose up -d

echo -e "${GREEN}Docker services started${NC}"

# Wait for services to be healthy
echo "Waiting for services to become healthy..."
sleep 10

# Step 6: Start Angie
echo ""
echo -e "${CYAN}[6/7] Starting Angie...${NC}"

# Test configuration first
echo "Testing Angie configuration..."
angie -t

# Enable and start Angie
systemctl enable angie
systemctl start angie

echo -e "${GREEN}Angie started${NC}"

# Step 7: Verify services
echo ""
echo -e "${CYAN}[7/7] Verifying services...${NC}"
sleep 5

echo ""
echo "Docker services status:"
docker compose ps

echo ""
echo "Angie status:"
systemctl status angie --no-pager -l || true

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo -e "Test your sites:"
echo -e "  ${CYAN}https://${DOMAIN:-flow.gkbj.org}${NC}"
echo -e "  ${CYAN}https://api.${DOMAIN:-flow.gkbj.org}/health${NC}"
echo -e "  ${CYAN}https://livekit.${DOMAIN:-flow.gkbj.org}${NC}"
echo -e "  ${CYAN}https://emqx.${DOMAIN:-flow.gkbj.org}${NC}"
echo -e "  ${CYAN}https://files.${DOMAIN:-flow.gkbj.org}${NC}"
echo ""
echo -e "${YELLOW}Post-migration cleanup (optional):${NC}"
echo "  docker volume rm faithflow_traefik_letsencrypt faithflow_traefik_logs"
echo ""
