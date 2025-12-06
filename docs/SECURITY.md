# FaithFlow Security Guide

This document outlines security best practices and configurations for deploying FaithFlow in production.

## Table of Contents

1. [Quick Security Checklist](#quick-security-checklist)
2. [MongoDB Security](#mongodb-security)
3. [Environment Variables](#environment-variables)
4. [Rate Limiting](#rate-limiting)
5. [Authentication Security](#authentication-security)
6. [Backup & Recovery](#backup--recovery)
7. [Security Headers](#security-headers)
8. [Audit Logging](#audit-logging)
9. [Common Vulnerabilities](#common-vulnerabilities)

---

## Quick Security Checklist

Before deploying to production, ensure:

- [ ] MongoDB authentication is enabled (not using default credentials)
- [ ] JWT_SECRET is a strong 64-character random string
- [ ] MongoDB ports (27017) are NOT exposed to the internet
- [ ] Redis ports (6379) are NOT exposed to the internet
- [ ] CORS_ORIGINS is restricted to your domains (not `*`)
- [ ] HTTPS is enforced via Traefik/reverse proxy
- [ ] Automated backups are configured and tested
- [ ] Rate limiting is enabled
- [ ] Environment validation passes without warnings

---

## MongoDB Security

### Enable Authentication (REQUIRED)

FaithFlow production deployment requires MongoDB authentication:

```bash
# In your .env file:
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<generate-with-openssl-rand-hex-32>
MONGO_APP_USER=faithflow_app
MONGO_APP_PASSWORD=<generate-with-openssl-rand-hex-32>
```

Generate secure passwords:
```bash
openssl rand -hex 32
```

### Network Security

**NEVER expose MongoDB to the internet.**

The `docker-compose.prod.yml` correctly does NOT expose port 27017. Always use this file for production:

```bash
# CORRECT - Use production compose
docker compose -f docker-compose.prod.yml up -d

# WRONG - Development compose exposes MongoDB
docker compose up -d  # DON'T use this in production!
```

### Access MongoDB

To access MongoDB in production:

```bash
# Through Docker (recommended)
docker exec -it faithflow-mongodb mongosh \
  -u admin -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  faithflow

# Never access directly from internet
```

---

## Environment Variables

### Required Secrets

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `JWT_SECRET` | JWT signing key (64+ chars) | `openssl rand -hex 32` |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | `openssl rand -hex 32` |
| `MONGO_APP_PASSWORD` | Application DB password | `openssl rand -hex 32` |
| `TURN_SECRET` | WebRTC TURN server secret | `openssl rand -hex 32` |

### Environment Validation

FaithFlow validates environment on startup. In production, it will **refuse to start** if:

- Required variables are missing
- JWT_SECRET is weak or uses default value
- MongoDB URL lacks authentication

Check validation manually:
```bash
cd backend
RUN_ENV_VALIDATION=true python -c "from utils.env_validation import validate_environment; validate_environment()"
```

### Example .env

```env
# ===========================================
# REQUIRED - Security Critical
# ===========================================
JWT_SECRET=<64-char-random-string>
MONGO_ROOT_PASSWORD=<32-char-random-string>
MONGO_APP_PASSWORD=<32-char-random-string>

# ===========================================
# Database
# ===========================================
MONGO_URL=mongodb://faithflow_app:${MONGO_APP_PASSWORD}@mongodb:27017/faithflow?authSource=faithflow
DB_NAME=faithflow
REDIS_URL=redis://redis:6379

# ===========================================
# CORS (restrict in production!)
# ===========================================
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# ===========================================
# Production mode
# ===========================================
ENVIRONMENT=production
```

---

## Rate Limiting

FaithFlow implements rate limiting to prevent:
- Brute force attacks on login endpoints
- API abuse
- Denial of service

### Default Limits

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/auth/login` | 5 requests | 1 minute |
| `/public/*` | 30 requests | 1 minute |
| `/api/*` | 200 requests | 1 minute |
| `/ai/*`, `/companion/*` | 20 requests | 1 minute |
| OTP endpoints | 3 requests | 5 minutes |

### Response Headers

Rate-limited responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
Retry-After: 60  (when exceeded)
```

### Configuration

Rate limits are defined in `backend/middleware/rate_limit.py`. Modify as needed:

```python
RATE_LIMITS = {
    "/auth/login": (5, 60),      # 5 per minute
    "/api/": (200, 60),          # 200 per minute
    ...
}
```

---

## Authentication Security

### Brute Force Protection

- Failed login attempts are tracked per IP + email
- After 5 failed attempts in 5 minutes, requests are blocked
- Security events are logged for monitoring

### Password Requirements

- Passwords are hashed with bcrypt (12 rounds)
- Minimum 8 characters recommended
- JWT tokens expire after 24 hours

### OTP Security

- WhatsApp OTPs expire after 5 minutes
- Maximum 3 OTP requests per 5 minutes
- OTPs are single-use

---

## Backup & Recovery

### Automated Backups

Enable daily automated backups:

```bash
# Make scripts executable
chmod +x scripts/backup-mongodb.sh scripts/restore-mongodb.sh

# Test backup manually
./scripts/backup-mongodb.sh

# Add to crontab for daily 2 AM backup
crontab -e
# Add: 0 2 * * * /path/to/FaithFlow/scripts/backup-mongodb.sh
```

### Backup Retention

Default: 7 days local retention. Configure in script:
```bash
RETENTION_DAYS=7
BACKUP_DIR=/var/backups/faithflow/mongodb
```

### Recovery

```bash
# List available backups
./scripts/restore-mongodb.sh

# Restore specific backup
./scripts/restore-mongodb.sh /var/backups/faithflow/mongodb/faithflow_20241205_020000.archive.gz

# Restore latest backup
./scripts/restore-mongodb.sh latest
```

### Cloud Backup (Optional)

Configure rclone for cloud backup:
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure S3/Backblaze/etc
rclone config
# Create remote named "faithflow-backup"

# Backups will automatically upload if remote is configured
```

---

## Security Headers

FaithFlow adds these security headers to all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `Permissions-Policy` | `camera=self, microphone=self, geolocation=()` | Restrict browser APIs |

---

## Audit Logging

Security events are logged in JSON format for SIEM integration:

### Event Types

- `auth.success` / `auth.failure` - Login attempts
- `auth.token_invalid` - Invalid JWT tokens
- `authz.denied` - Authorization failures
- `ratelimit.exceeded` - Rate limit hits
- `suspicious.brute_force` - Brute force detection
- `admin.action` - Admin operations

### Log Format

```json
{
  "timestamp": "2024-12-05T21:51:22.000Z",
  "event_type": "auth.failure",
  "severity": "warning",
  "client_ip": "1.2.3.4",
  "user_agent": "Mozilla/5.0...",
  "method": "POST",
  "path": "/api/auth/login",
  "details": {
    "email": "ad***@example.com",
    "failure_reason": "invalid_credentials"
  }
}
```

### Monitoring

Forward security logs to your SIEM:
```bash
# Filter security logs from Docker
docker logs faithflow-backend 2>&1 | grep '"event_type"' > security.log
```

---

## Common Vulnerabilities

### SQL/NoSQL Injection

FaithFlow uses:
- Pydantic models for input validation
- Motor async driver (parameterized queries)
- No raw string concatenation in queries

### XSS (Cross-Site Scripting)

- React frontend auto-escapes output
- API returns JSON (not HTML)
- CSP headers on HTML responses

### CSRF (Cross-Site Request Forgery)

- JWT tokens in Authorization header (not cookies)
- SameSite cookie policy
- CORS restrictions

### Sensitive Data Exposure

- Passwords never returned in API responses
- Sensitive fields anonymized in logs
- Auth endpoints disable caching

---

## Incident Response

If you suspect a security breach:

1. **Isolate**: Block external access to affected services
2. **Rotate**: Change all secrets (JWT, MongoDB, API keys)
3. **Review**: Check security audit logs for indicators
4. **Restore**: If data compromised, restore from backup
5. **Report**: Notify affected users if required

### Emergency Commands

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Rotate JWT secret (invalidates all sessions)
# 1. Generate new secret
openssl rand -hex 32
# 2. Update .env with new JWT_SECRET
# 3. Restart backend

# Rotate MongoDB passwords
# 1. Generate new passwords
# 2. Update .env
# 3. Recreate MongoDB container (will reinitialize with new credentials)
docker compose -f docker-compose.prod.yml up -d --force-recreate mongodb backend
```

---

## Security Updates

Keep dependencies updated:

```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
yarn upgrade --latest

# Docker images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Questions?

For security concerns, review the code at:
- `backend/utils/security.py` - Password hashing, JWT
- `backend/utils/security_audit.py` - Audit logging
- `backend/middleware/rate_limit.py` - Rate limiting
- `backend/utils/env_validation.py` - Environment checks

