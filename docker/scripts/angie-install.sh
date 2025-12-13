#!/bin/bash
# =============================================================================
# Angie Installation Script for Debian/Ubuntu
# =============================================================================
# This script installs Angie web server with Brotli support.
#
# Usage:
#   ./docker/scripts/angie-install.sh
#
# Supported OS:
#   - Debian 10 (buster), 11 (bullseye), 12 (bookworm)
#   - Ubuntu 20.04 (focal), 22.04 (jammy), 24.04 (noble)
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Installing Angie Web Server ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_CODENAME
else
    echo -e "${RED}Error: Cannot detect OS${NC}"
    exit 1
fi

echo -e "${CYAN}Detected: ${OS} ${VERSION}${NC}"

# Validate supported OS
case $OS in
    debian)
        case $VERSION in
            buster|bullseye|bookworm) ;;
            *)
                echo -e "${YELLOW}Warning: Debian ${VERSION} may not be officially supported${NC}"
                ;;
        esac
        ;;
    ubuntu)
        case $VERSION in
            focal|jammy|noble) ;;
            *)
                echo -e "${YELLOW}Warning: Ubuntu ${VERSION} may not be officially supported${NC}"
                ;;
        esac
        ;;
    *)
        echo -e "${RED}Error: Unsupported OS: ${OS}${NC}"
        echo "Supported: debian, ubuntu"
        exit 1
        ;;
esac

# Install prerequisites
echo -e "${CYAN}[1/5] Installing prerequisites...${NC}"
apt-get update -qq
apt-get install -y -qq curl gnupg2 ca-certificates lsb-release apt-transport-https

# Add Angie signing key
echo -e "${CYAN}[2/5] Adding Angie repository...${NC}"
curl -fsSL https://angie.software/keys/angie-signing.gpg | gpg --dearmor -o /usr/share/keyrings/angie-archive-keyring.gpg

# Add Angie repository
echo "deb [signed-by=/usr/share/keyrings/angie-archive-keyring.gpg] https://download.angie.software/angie/${OS}/${VERSION}/ ${VERSION} main" > /etc/apt/sources.list.d/angie.list

# Install Angie
echo -e "${CYAN}[3/5] Installing Angie...${NC}"
apt-get update -qq
apt-get install -y angie

# Note: Angie has built-in Brotli support, no separate module needed

# Create required directories
echo -e "${CYAN}[4/5] Creating directories...${NC}"
mkdir -p /var/www/certbot
mkdir -p /etc/angie/sites-available
mkdir -p /etc/angie/sites-enabled
mkdir -p /etc/angie/ssl
mkdir -p /var/log/angie

# Set permissions
chown -R www-data:www-data /var/www/certbot
chown -R www-data:www-data /var/log/angie

# Stop Angie if running (we'll configure it first)
echo -e "${CYAN}[5/5] Finalizing...${NC}"
systemctl stop angie 2>/dev/null || true

echo ""
echo -e "${GREEN}=== Angie installed successfully ===${NC}"
echo ""
angie -v
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Run: make angie-setup (to symlink project configs)"
echo "  2. Run: make ssl-init (to generate SSL certificates)"
echo "  3. Run: systemctl start angie"
echo ""
