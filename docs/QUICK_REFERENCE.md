# FaithFlow - Quick Reference

**Common commands and quick tips for both Docker and bare-metal deployments**

---

## Installation

### Docker (Recommended)
```bash
git clone https://github.com/your-org/faithflow.git
cd faithflow
sudo ./docker-install.sh
```

### Bare Metal
```bash
sudo ./install.sh
```

---

## Docker Commands

### Service Management
```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Check status
docker compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services (follow mode)
docker compose -f docker-compose.prod.yml logs -f

# Specific service (last 100 lines)
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Multiple services
docker compose -f docker-compose.prod.yml logs -f backend frontend
```

### Database Operations
```bash
# Connect to MongoDB
docker compose -f docker-compose.prod.yml exec mongodb mongosh faithflow

# Backup database
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)

# Restore database
docker cp ./backup faithflow-mongodb:/backup
docker compose -f docker-compose.prod.yml exec mongodb mongorestore /backup
```

### Updates
```bash
cd ~/faithflow
git pull
sudo ./docker-update.sh
```

---

## Bare Metal Commands

### Service Management
```bash
# Check status
sudo systemctl status faithflow-backend nginx mongod redis

# Restart services
sudo systemctl restart faithflow-backend
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/faithflow/backend.log
journalctl -u faithflow-backend -f
```

### Manual Update
```bash
cd /opt/faithflow
git pull

# Backend
cd backend && source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install && yarn build

# Restart
sudo systemctl restart faithflow-backend
sudo systemctl reload nginx
```

---

## Health Checks

### API Health
```bash
# Docker
curl http://localhost:8000/health

# Bare metal
curl http://localhost:8001/api/health
```

### Check Bible Data
```bash
# Docker
docker compose -f docker-compose.prod.yml exec mongodb mongosh faithflow --eval "db.bible_verses.countDocuments({})"
# Expected: 186592

# Bare metal
mongosh faithflow --eval "db.bible_verses.countDocuments({})"
```

### Full Verification
```bash
./scripts/verify_deployment.sh
```

---

## Common URLs

| Service | Docker URL | Purpose |
|---------|------------|---------|
| Web App | `https://yourdomain.com` | Main application |
| API | `https://api.yourdomain.com` | Backend API |
| API Docs | `https://api.yourdomain.com/docs` | Swagger UI |
| Files | `https://files.yourdomain.com` | SeaweedFS storage |
| Traefik | `https://traefik.yourdomain.com` | Reverse proxy admin |

---

## Key Features Quick Reference

### AI Features (require `ANTHROPIC_API_KEY`)

| Feature | Admin URL | Description |
|---------|-----------|-------------|
| Prayer Analytics | `/prayer-requests/analytics` | AI theme extraction, follow-up tracking |
| News Context | `/content-center/news-context` | National news monitoring |
| Content Generation | `/content-center/ai` | AI-powered devotion creation |
| Review Queue | `/content-center/review-queue` | Review AI-generated content |

### Content Center

| Content Type | Admin URL |
|--------------|-----------|
| Devotions | `/content-center/devotion` |
| Verse of Day | `/content-center/verse` |
| Bible Figures | `/content-center/figure` |
| Daily Quizzes | `/content-center/quiz` |
| Bible Studies | `/content-center/bible-study` |
| Topical Verses | `/content-center/topical` |
| Schedule | `/content-center/schedule` |

### Mobile App Features

| Feature | Description |
|---------|-------------|
| Explore Tab | Daily devotions, VOTD, quizzes, Bible figures |
| Contextual Companion | AI chat with scripture |
| Prayer Resources | AI-generated prayer guidance |
| Bible | 6 translations, highlights, notes |
| Events | RSVP, QR tickets, check-in |

---

## Environment Variables

### Essential
```env
DOMAIN=faithflow.church
JWT_SECRET=<64-char-random-string>
MONGO_URL=mongodb://mongodb:27017/faithflow
REDIS_URL=redis://redis:6379
```

### AI Features
```env
ANTHROPIC_API_KEY=sk-ant-...  # Claude AI
STABILITY_API_KEY=sk-...       # Image generation
```

### File Storage
```env
SEAWEEDFS_PUBLIC_URL=https://files.yourdomain.com
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Docker
docker compose -f docker-compose.prod.yml logs backend

# Bare metal
journalctl -u faithflow-backend -n 100
```

### SSL Certificate Issues
```bash
# Docker - check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik | grep -i "certificate"

# Bare metal
sudo certbot certificates
sudo certbot renew --dry-run
```

### Database Connection Failed
```bash
# Docker
docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# Bare metal
mongosh --eval "db.adminCommand('ping')"
```

### AI Features Not Working
```bash
# Check if API key is set
grep ANTHROPIC_API_KEY .env

# Test API connectivity
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages
```

---

## Backup Schedule

### Automated (Docker)
- Database: Daily at 2 AM (cron)
- Files: Weekly SeaweedFS backup

### Manual Backup
```bash
# Database
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)

# SeaweedFS
docker run --rm -v faithflow_seaweedfs_volume_data:/data -v $(pwd):/backup \
    alpine tar czf /backup/seaweedfs-$(date +%Y%m%d).tar.gz /data
```

---

## Key File Paths

### Docker
- **Compose file:** `docker-compose.prod.yml`
- **Environment:** `.env`
- **Traefik config:** `traefik/` directory
- **MongoDB data:** Docker volume `faithflow_mongodb_data`
- **SeaweedFS data:** Docker volume `faithflow_seaweedfs_*`

### Bare Metal
- **Application:** `/opt/faithflow`
- **Backend .env:** `/opt/faithflow/backend/.env`
- **Frontend build:** `/opt/faithflow/frontend/build`
- **Logs:** `/var/log/faithflow/`
- **Nginx config:** `/etc/nginx/sites-available/faithflow`
- **Systemd service:** `/etc/systemd/system/faithflow-backend.service`

---

## Emergency Recovery

### Complete System Restart
```bash
# Docker
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Bare metal
sudo systemctl restart mongod redis faithflow-backend nginx
```

### Rollback Update
```bash
git log --oneline -5  # Find previous commit
git checkout <previous-commit>

# Docker
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Bare metal
sudo ./update.sh
```

---

**For complete documentation, see `/docs/` folder**
