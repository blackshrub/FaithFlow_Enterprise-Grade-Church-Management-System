# FaithFlow Deployment Guide

This guide covers deploying FaithFlow to different environments.

## 📋 Table of Contents

1. [Initial Setup (Brand New Database)](#initial-setup)
2. [Deploying to New Server (Same Database)](#deploying-to-new-server)
3. [Database Migrations](#database-migrations)
4. [Production Checklist](#production-checklist)

---

## 🆕 Initial Setup (Brand New Database)

**When:** First time setting up FaithFlow with a fresh MongoDB instance

### Backend Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd FaithFlow_Enterprise-Grade-Church-Management-System/backend

# 2. Create .env file
cp .env.example .env
# Edit .env with your MongoDB URL and secrets

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database (FIRST TIME ONLY)
python scripts/init_db.py

# This creates:
# - Database indexes
# - Super admin user (admin@gkbjtamankencana.org / admin123)
# - Default church
# - Default member statuses & demographics

# 5. Start server
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd ../frontend

# 1. Install dependencies
yarn install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API URL

# 3. Development
yarn start

# 4. Production build
yarn build
```

---

## 🔄 Deploying to New Server (Same Database)

**When:** Deploying your app to a new server but using the **same MongoDB instance**

```bash
# 1. Clone repository on new server
git clone <your-repo-url>
cd backend

# 2. Setup environment
cp .env .env  # Or use your secrets manager
pip install -r requirements.txt

# 3. Apply migrations (safe to run multiple times)
python scripts/migrate.py

# 4. Start server
uvicorn server:app --host 0.0.0.0 --port 8000
```

**⚠️ Important:** Do NOT run `init_db.py` again! It will try to create duplicate data.

**Why no init_db.py?**
- Your database already has indexes ✅
- Super admin already exists ✅
- Default data already created ✅

---

## 🗄️ Database Migrations

### Understanding the Difference

| Script | When to Use | What It Does | Safe to Re-run? |
|--------|-------------|--------------|-----------------|
| `init_db.py` | **First time only** | Creates indexes + initial data | ❌ No |
| `migrate.py` | **Every deployment** | Updates indexes only | ✅ Yes |

### Migration Commands

```bash
# Check database status
python scripts/migrate.py --check

# Apply all migrations (indexes)
python scripts/migrate.py

# Only update indexes
python scripts/migrate.py --indexes
```

### Example Output

```
🔌 Connecting to: mongodb://localhost:27017
📂 Database: church_management

✓ Database connection successful

📊 Creating/updating database indexes...
✓ User indexes
✓ Church indexes
✓ Member indexes
✓ Group indexes
✓ Event indexes
✓ Article indexes
✓ Prayer request indexes
✓ Donation indexes

✅ All indexes created/updated successfully
```

---

## 🎯 Common Deployment Scenarios

### Scenario 1: Development → Production (First Time)

```bash
# Production server (first time)
cd backend
python scripts/init_db.py  # Creates everything
python scripts/migrate.py  # Ensures indexes are up to date
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Scenario 2: Update Existing Production

```bash
# Pull latest code
git pull origin main

# Apply new migrations (safe)
python scripts/migrate.py

# Restart server
systemctl restart faithflow  # or your process manager
```

### Scenario 3: Horizontal Scaling (Multiple App Servers)

```bash
# Server 1 (first app server)
python scripts/migrate.py  # Apply migrations
uvicorn server:app --port 8000

# Server 2, 3, 4... (additional app servers)
# Just start the app - NO migrations needed!
uvicorn server:app --port 8000
```

**Why?** MongoDB indexes are global to the database, not per server.

### Scenario 4: New Church (Multi-tenant)

**No need for any migration!**

Just use the admin dashboard to:
1. Create new church
2. Create church admin user
3. System automatically uses existing indexes

---

## ✅ Production Deployment Checklist

### Pre-Deployment

- [ ] Update `.env` with production MongoDB URL
- [ ] Set strong `JWT_SECRET` (use: `openssl rand -hex 32`)
- [ ] Configure WhatsApp API credentials
- [ ] Review `ALLOWED_ORIGINS` in `server.py`

### First-Time Production

- [ ] Run `python scripts/init_db.py` (ONCE)
- [ ] Run `python scripts/migrate.py --check` (verify)
- [ ] Change super admin password from `admin123`
- [ ] Setup SSL/TLS for MongoDB connection
- [ ] Configure firewall rules

### Regular Deployments

- [ ] Backup database: `mongodump --uri="$MONGO_URL"`
- [ ] Pull latest code: `git pull`
- [ ] Run migrations: `python scripts/migrate.py`
- [ ] Restart backend: `systemctl restart faithflow`
- [ ] Clear frontend cache if needed
- [ ] Test critical endpoints

### Monitoring

- [ ] Setup MongoDB monitoring (indexes, slow queries)
- [ ] Setup application logging
- [ ] Configure rate limiting for public endpoints
- [ ] Enable CORS only for trusted domains

---

## 🔒 Security Best Practices

### Environment Variables

Never commit these to git:

```bash
# .env (backend)
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname
JWT_SECRET=<strong-random-secret>
JWT_ALGORITHM=HS256

# Production MongoDB URL should use:
# - TLS/SSL connection
# - Strong authentication
# - IP whitelisting
```

### MongoDB Security

```bash
# Use MongoDB Atlas or configure authentication:
MONGO_URL=mongodb+srv://admin:strong_password@cluster.mongodb.net/faithflow?retryWrites=true&w=majority&tls=true
```

---

## 📊 Database Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/backups/faithflow"
DATE=$(date +%Y%m%d_%H%M%S)

mongodump --uri="$MONGO_URL" --out="$BACKUP_DIR/$DATE"

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
```

### Restore from Backup

```bash
mongorestore --uri="$MONGO_URL" --drop /path/to/backup
python scripts/migrate.py  # Ensure indexes are correct
```

---

## 🐳 Docker Deployment (Optional)

```dockerfile
# Dockerfile (backend)
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations on startup
CMD ["sh", "-c", "python scripts/migrate.py && uvicorn server:app --host 0.0.0.0 --port 8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URL=${MONGO_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

## 🚨 Troubleshooting

### "DuplicateKeyError" on migration

**Cause:** Trying to run `init_db.py` on existing database

**Solution:** Use `migrate.py` instead:
```bash
python scripts/migrate.py
```

### Indexes not working

**Check index status:**
```bash
python scripts/migrate.py --check
```

**Rebuild indexes:**
```bash
# MongoDB shell
use church_management
db.members.getIndexes()
```

### Multiple app servers causing issues

**Remember:**
- Indexes live in MongoDB (not app server)
- Only run migrations from ONE server
- Other servers just connect to the database

---

## 📞 Support

For deployment issues:
1. Check MongoDB logs
2. Check application logs
3. Verify environment variables
4. Run `python scripts/migrate.py --check`

---

**Last Updated:** 2025-01-22
**Version:** 1.0.0
