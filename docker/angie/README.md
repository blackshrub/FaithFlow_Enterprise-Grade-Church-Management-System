# Angie Reverse Proxy Configuration for FaithFlow

This directory contains the Angie (nginx fork) configuration for FaithFlow.

## Overview

Angie runs at the **host level** (not in Docker) and proxies requests to Docker containers:

| Domain | Service | Docker Port |
|--------|---------|-------------|
| `flow.gkbj.org` | Frontend (React/Nginx) | 127.0.0.1:3080 |
| `api.flow.gkbj.org` | Backend (FastAPI) | 127.0.0.1:8000 |
| `livekit.flow.gkbj.org` | LiveKit (WebRTC) | 127.0.0.1:7880 |
| `emqx.flow.gkbj.org` | EMQX Dashboard | 127.0.0.1:18083 |
| `files.flow.gkbj.org` | SeaweedFS Filer | 127.0.0.1:8888 |

**Direct ports** (bypass Angie proxy):
- LiveKit WebRTC: `7881/tcp`, `50000-50100/udp`
- coTURN: `3478`, `5349`, `49152-49200/udp`
- EMQX MQTT: `1883`, `8083`, `8084`

## Directory Structure

```
docker/angie/
├── angie.conf                    # Main Angie configuration
├── conf.d/
│   ├── upstreams.conf           # Docker service upstreams
│   ├── ssl.conf                 # SSL/TLS settings
│   ├── security.conf            # Security headers
│   ├── rate-limit.conf          # Rate limiting zones
│   └── compression.conf         # Brotli + Gzip
├── sites-available/
│   ├── faithflow.conf           # flow.gkbj.org
│   ├── api.conf                 # api.flow.gkbj.org
│   ├── livekit.conf             # livekit.flow.gkbj.org
│   ├── emqx.conf                # emqx.flow.gkbj.org
│   └── files.conf               # files.flow.gkbj.org
├── sites-enabled/               # Symlinks to sites-available
└── README.md                    # This file
```

## Installation

### Step 1: Install Angie

Run the installation script:

```bash
./docker/scripts/angie-install.sh
```

Or manually install on Debian/Ubuntu:

```bash
# Add Angie repository
curl -fsSL https://angie.software/keys/angie-signing.gpg | gpg --dearmor -o /usr/share/keyrings/angie-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/angie-archive-keyring.gpg] https://download.angie.software/angie/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/$(lsb_release -cs)/ $(lsb_release -cs) main" > /etc/apt/sources.list.d/angie.list

# Install
apt-get update
apt-get install -y angie

# Create required directories
mkdir -p /var/www/certbot /etc/angie/ssl
```

### Step 2: Setup Configuration Symlinks

```bash
# Backup existing config
mv /etc/angie/conf.d /etc/angie/conf.d.backup 2>/dev/null

# Create symlinks to project configs
PROJECT_DIR="/root/FaithFlow_Enterprise-Grade-Church-Management-System"
ln -sf $PROJECT_DIR/docker/angie/angie.conf /etc/angie/angie.conf
ln -sf $PROJECT_DIR/docker/angie/conf.d /etc/angie/conf.d
ln -sf $PROJECT_DIR/docker/angie/sites-available /etc/angie/sites-available
rm -rf /etc/angie/sites-enabled && ln -sf $PROJECT_DIR/docker/angie/sites-enabled /etc/angie/sites-enabled
```

Or use the Makefile:

```bash
make angie-setup
```

### Step 3: Generate SSL Certificates

First, ensure DNS records point to your server:
- `flow.gkbj.org` -> Your server IP
- `api.flow.gkbj.org` -> Your server IP
- `livekit.flow.gkbj.org` -> Your server IP
- `emqx.flow.gkbj.org` -> Your server IP
- `files.flow.gkbj.org` -> Your server IP

Then generate certificates:

```bash
# Set your domain and email
export DOMAIN=flow.gkbj.org
export ACME_EMAIL=admin@flow.gkbj.org

# Run certificate generation
./docker/scripts/certbot-init.sh
```

Or use the Makefile:

```bash
make ssl-init
```

### Step 4: Start Services

```bash
# Start Docker services
docker compose up -d

# Test Angie configuration
angie -t

# Start Angie
systemctl enable angie
systemctl start angie
```

## Customizing Domains

To use a different domain:

1. Update `.env` file:
   ```env
   DOMAIN=yourdomain.com
   ACME_EMAIL=admin@yourdomain.com
   ```

2. Edit site configs in `sites-available/`:
   - Replace `flow.gkbj.org` with your domain
   - Update SSL certificate paths

3. Regenerate SSL certificates:
   ```bash
   make ssl-init
   ```

4. Reload Angie:
   ```bash
   make angie-reload
   ```

## Common Operations

### Test Configuration
```bash
angie -t
```

### Reload Configuration (after changes)
```bash
systemctl reload angie
# or
angie -s reload
```

### View Logs
```bash
# Access log
tail -f /var/log/angie/access.log

# Error log
tail -f /var/log/angie/error.log

# Combined
tail -f /var/log/angie/*.log
```

### SSL Certificate Renewal
Certbot auto-renewal is configured via cron. Manual renewal:
```bash
certbot renew --dry-run  # Test
certbot renew            # Actual renewal
systemctl reload angie   # Reload after renewal
```

## Troubleshooting

### SSL Certificate Generation Fails
- Ensure ports 80/443 are open in firewall
- Check DNS propagation: `dig +short flow.gkbj.org`
- Stop any other web servers: `systemctl stop nginx apache2`

### Docker Services Not Accessible
```bash
# Check Docker containers are running
docker compose ps

# Verify ports are bound to localhost
netstat -tlnp | grep -E '3080|8000|7880|18083|8888'

# Check container logs
docker compose logs backend
docker compose logs frontend
```

### WebSocket Connection Fails (LiveKit)
```bash
# Test WebSocket upgrade
curl -v -H "Upgrade: websocket" -H "Connection: Upgrade" https://livekit.flow.gkbj.org/
```

### CORS Errors on API
```bash
# Test CORS headers
curl -v -X OPTIONS -H "Origin: https://flow.gkbj.org" https://api.flow.gkbj.org/
```

## Architecture

```
                         INTERNET
                             |
                    [Angie (Host Level)]
                         443 / 80
                             |
        +--------+--------+--------+--------+--------+
        |        |        |        |        |        |
     flow.*   api.*   livekit.*  emqx.*  files.*
        |        |        |        |        |
        v        v        v        v        v
     :3080    :8000    :7880   :18083    :8888
        |        |        |        |        |
    +---+--------+--------+--------+--------+---+
    |                                           |
    |              Docker Network               |
    |                                           |
    | Frontend  Backend  LiveKit  EMQX  SeaweedFS |
    |     |        |                    |       |
    |     +--------+--------------------+       |
    |              |                            |
    |         (internal)                        |
    |      MongoDB  Redis                       |
    +-------------------------------------------+
```

## Migration from Traefik

If migrating from the previous Traefik setup:

```bash
# Full migration (recommended)
make migrate-traefik

# Or manual steps:
# 1. Stop Docker services
docker compose -f docker/compose/prod.yml down

# 2. Install Angie
./docker/scripts/angie-install.sh

# 3. Setup config
make angie-setup

# 4. Generate SSL certs
make ssl-init

# 5. Start with new compose file
docker compose up -d

# 6. Start Angie
systemctl start angie
```
