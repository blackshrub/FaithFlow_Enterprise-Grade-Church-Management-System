#!/bin/bash
# =============================================================================
# Certbot SSL Certificate Generation for FaithFlow
# =============================================================================
# This script generates SSL certificates for all FaithFlow domains using
# Certbot with Let's Encrypt.
#
# Usage:
#   DOMAIN=flow.gkbj.org ACME_EMAIL=admin@flow.gkbj.org ./docker/scripts/certbot-init.sh
#
# Environment variables:
#   DOMAIN      - Base domain (default: flow.gkbj.org)
#   ACME_EMAIL  - Email for Let's Encrypt (default: admin@$DOMAIN)
#   STAGING     - Set to 1 to use Let's Encrypt staging server (for testing)
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration (can be overridden via environment variables)
DOMAIN=${DOMAIN:-flow.gkbj.org}
EMAIL=${ACME_EMAIL:-admin@${DOMAIN}}
WEBROOT=/var/www/certbot
STAGING=${STAGING:-0}

echo -e "${CYAN}=== Generating SSL Certificates ===${NC}"
echo ""
echo -e "Domain:     ${GREEN}${DOMAIN}${NC}"
echo -e "Subdomains: ${GREEN}www.${DOMAIN}, api.${DOMAIN}, livekit.${DOMAIN}, emqx.${DOMAIN}, files.${DOMAIN}${NC}"
echo -e "Email:      ${GREEN}${EMAIL}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    echo -e "${CYAN}[1/4] Installing Certbot...${NC}"
    apt-get update -qq
    apt-get install -y -qq certbot
else
    echo -e "${CYAN}[1/4] Certbot already installed${NC}"
fi

# Create webroot directory
echo -e "${CYAN}[2/4] Preparing webroot directory...${NC}"
mkdir -p $WEBROOT
chown -R www-data:www-data $WEBROOT

# Check if Angie is running for ACME challenge
if ! pgrep -x "angie" > /dev/null; then
    echo -e "${YELLOW}Angie is not running. Starting temporary HTTP server for ACME challenge...${NC}"

    # Create temporary Angie config for ACME challenge
    cat > /tmp/angie-acme.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        listen [::]:80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 "Waiting for SSL certificates...\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    # Start Angie with temporary config
    angie -c /tmp/angie-acme.conf
    TEMP_ANGIE=1
    sleep 2
fi

# Build certbot command
echo -e "${CYAN}[3/4] Requesting certificates from Let's Encrypt...${NC}"

CERTBOT_CMD="certbot certonly --webroot --webroot-path=$WEBROOT --email $EMAIL --agree-tos --no-eff-email --non-interactive"

# Add staging flag if set
if [ "$STAGING" = "1" ]; then
    echo -e "${YELLOW}Using Let's Encrypt STAGING server (certificates will not be trusted)${NC}"
    CERTBOT_CMD="$CERTBOT_CMD --staging"
fi

# Add all domains
CERTBOT_CMD="$CERTBOT_CMD -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN -d livekit.$DOMAIN -d emqx.$DOMAIN -d files.$DOMAIN"

# Run certbot
$CERTBOT_CMD

# Stop temporary Angie if we started it
if [ "$TEMP_ANGIE" = "1" ]; then
    angie -s stop
    rm -f /tmp/angie-acme.conf
fi

# Setup auto-renewal
echo -e "${CYAN}[4/4] Setting up auto-renewal...${NC}"

# Create renewal hook to reload Angie
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-angie.sh << 'EOF'
#!/bin/bash
# Reload Angie after certificate renewal
systemctl reload angie
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-angie.sh

# Setup cron job for renewal
cat > /etc/cron.d/certbot-renew << 'EOF'
# Renew Let's Encrypt certificates twice daily
# Certbot will only renew if certificates are near expiry
0 0,12 * * * root certbot renew --quiet
EOF

# Test auto-renewal (dry run)
echo ""
echo -e "${CYAN}Testing auto-renewal (dry run)...${NC}"
certbot renew --dry-run

echo ""
echo -e "${GREEN}=== SSL Certificates Generated Successfully ===${NC}"
echo ""
echo -e "Certificate: ${GREEN}/etc/letsencrypt/live/${DOMAIN}/fullchain.pem${NC}"
echo -e "Private Key: ${GREEN}/etc/letsencrypt/live/${DOMAIN}/privkey.pem${NC}"
echo ""
echo -e "${CYAN}Auto-renewal:${NC}"
echo "  - Cron job: /etc/cron.d/certbot-renew (runs twice daily)"
echo "  - Deploy hook: /etc/letsencrypt/renewal-hooks/deploy/reload-angie.sh"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Start Angie: systemctl start angie"
echo "  2. Enable Angie: systemctl enable angie"
echo ""
