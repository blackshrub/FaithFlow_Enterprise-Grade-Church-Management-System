# FaithFlow Docker Deployment Guide

This guide covers deploying FaithFlow using Docker with Traefik for automatic SSL and subdomain-based routing.

## Architecture Overview

```
                    Internet
                       │
                       ▼
              ┌───────────────┐
              │    Traefik    │  (Reverse Proxy + Auto SSL)
              │   Port 80/443 │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
 ┌─────────────┐ ┌──────────┐ ┌──────────┐
 │ api.domain  │ │ domain   │ │ traefik. │
 │ (Backend)   │ │(Frontend)│ │ domain   │
 │  Port 8000  │ │ Port 80  │ │(Dashboard)│
 └─────────────┘ └──────────┘ └──────────┘
        │
        ▼
 ┌─────────────┐
 │   MongoDB   │
 │  Port 27017 │
 └─────────────┘
```

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- A domain name with DNS pointing to your server
- Open ports: 80, 443

## Quick Start (Production)

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/faithflow.git
cd faithflow

# Create environment file
cp .env.docker.example .env

# Edit configuration
nano .env
```

### 2. Configure Environment

Edit `.env` with your settings:

```env
# Required
DOMAIN=faithflow.church
ACME_EMAIL=admin@faithflow.church
JWT_SECRET=your-secure-random-64-char-string

# Optional (for AI features)
ANTHROPIC_API_KEY=sk-ant-...
STABILITY_API_KEY=sk-...
```

### 3. Deploy with Script

```bash
# Make script executable
chmod +x docker-install.sh

# Run installer
sudo ./docker-install.sh
```

Or deploy manually:

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Access Your Application

- **Frontend**: `https://yourdomain.com`
- **API**: `https://api.yourdomain.com`
- **API Docs**: `https://api.yourdomain.com/docs`
- **Traefik Dashboard**: `https://traefik.yourdomain.com`

## Development Setup

For local development with Docker:

```bash
# Start development environment
docker compose up -d

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/api/docs
# MongoDB:  localhost:27017
```

## Deployment Modes

FaithFlow supports two API routing modes:

### 1. Subdomain Mode (Recommended for Production)
- API URL: `https://api.yourdomain.com`
- No API prefix needed
- Requires DNS A record for `api.yourdomain.com`

### 2. Path-Based Mode (For Development or Single-Domain)
- API URL: `https://yourdomain.com/api`
- Uses `/api` prefix for all endpoints
- Works with single domain/localhost

### Configuration

**Backend** (`backend/.env`):
```env
# Subdomain mode (production)
API_PREFIX=

# Path-based mode (development)
API_PREFIX=/api
```

**Frontend** (built-in or `.env`):
```env
# Subdomain mode
REACT_APP_API_URL=https://api.yourdomain.com

# Path-based mode
REACT_APP_API_URL=https://yourdomain.com
```

**Mobile** (`mobile/constants/api.ts`):
```typescript
// Subdomain mode (production)
export const API_BASE_URL = 'https://api.yourdomain.com';
export const API_PREFIX = '';

// Path-based mode (development)
export const API_BASE_URL = 'http://localhost:8000';
export const API_PREFIX = '/api';
```

## File Structure

```
faithflow/
├── docker-compose.yml          # Development configuration
├── docker-compose.prod.yml     # Production with Traefik
├── docker-install.sh           # Docker installation script
├── docker-update.sh            # Docker update script
├── .env.docker.example         # Environment template
├── backend/
│   ├── Dockerfile              # Backend image
│   └── .env.example
└── frontend/
    ├── Dockerfile              # Frontend image (multi-stage)
    ├── nginx.conf              # Nginx configuration
    └── docker-entrypoint.sh    # Runtime config injection
```

## Commands Reference

### Basic Operations

```bash
# Start services
docker compose -f docker-compose.prod.yml up -d

# Stop services
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend

# Restart a service
docker compose -f docker-compose.prod.yml restart backend
```

### Updates

```bash
# Update with zero downtime
sudo ./docker-update.sh

# Update backend only
sudo ./docker-update.sh --backend

# Update frontend only
sudo ./docker-update.sh --frontend

# Pull and restart without rebuilding
sudo ./docker-update.sh --no-build
```

### Maintenance

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Check service health
docker compose -f docker-compose.prod.yml exec backend curl http://localhost:8000/health

# Access MongoDB shell
docker compose -f docker-compose.prod.yml exec mongodb mongosh faithflow

# Backup database
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup

# Restore database
docker cp ./backup faithflow-mongodb:/backup
docker compose -f docker-compose.prod.yml exec mongodb mongorestore /backup
```

### Troubleshooting

```bash
# Check container logs for errors
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik

# Check SSL certificate status
docker compose -f docker-compose.prod.yml exec traefik cat /letsencrypt/acme.json | jq

# Restart with fresh build
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Clean up unused images
docker image prune -f
```

## SSL Certificates

Traefik automatically obtains and renews SSL certificates from Let's Encrypt.

### Requirements
- Port 80 must be open (for HTTP challenge)
- DNS must point to your server before starting

### Certificate Storage
Certificates are stored in the `traefik_letsencrypt` volume at `/letsencrypt/acme.json`.

### Troubleshooting SSL
```bash
# Check Traefik logs for SSL issues
docker compose -f docker-compose.prod.yml logs traefik | grep -i "acme\|certificate"

# Force certificate renewal
docker compose -f docker-compose.prod.yml exec traefik rm /letsencrypt/acme.json
docker compose -f docker-compose.prod.yml restart traefik
```

## Scaling

### Horizontal Scaling (Multiple Backend Instances)

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
```

Then:
```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Resource Limits

Add to `docker-compose.prod.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Security Recommendations

1. **Change default credentials**
   - Update Traefik dashboard password
   - Set strong JWT_SECRET

2. **Firewall configuration**
   ```bash
   # Only allow necessary ports
   ufw default deny incoming
   ufw allow 22/tcp  # SSH
   ufw allow 80/tcp  # HTTP (for SSL challenge)
   ufw allow 443/tcp # HTTPS
   ufw enable
   ```

3. **MongoDB security**
   - MongoDB is not exposed externally by default
   - For production, consider adding authentication

4. **Regular updates**
   ```bash
   # Update Docker images
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

## Migrating from Bare-Metal

If you have an existing bare-metal installation:

1. **Backup data**
   ```bash
   mongodump --out ./backup
   cp /opt/faithflow/backend/.env ./backend/.env.backup
   ```

2. **Stop bare-metal services**
   ```bash
   systemctl stop faithflow-backend
   systemctl stop nginx
   ```

3. **Start Docker services**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Restore data**
   ```bash
   docker cp ./backup faithflow-mongodb:/backup
   docker compose -f docker-compose.prod.yml exec mongodb mongorestore /backup
   ```

5. **Disable bare-metal services**
   ```bash
   systemctl disable faithflow-backend
   systemctl disable nginx
   ```

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DOMAIN` | Yes | Your domain name | `faithflow.church` |
| `ACME_EMAIL` | Yes | Email for Let's Encrypt | `admin@church.org` |
| `JWT_SECRET` | Yes | JWT signing key (64+ chars) | `random-string-here` |
| `ANTHROPIC_API_KEY` | No | Claude AI API key | `sk-ant-...` |
| `STABILITY_API_KEY` | No | Stability AI key | `sk-...` |
| `TRAEFIK_DASHBOARD_AUTH` | No | Dashboard basic auth | `admin:$apr1$...` |

## Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Logs**: `/var/log/faithflow-docker-*.log`
