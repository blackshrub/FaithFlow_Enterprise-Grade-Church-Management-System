# FaithFlow - Quick Reference

**Common commands and quick tips**

---

## Installation

### One-Click Install
```bash
sudo bash install.sh
```

### Manual Clone
```bash
git lfs install
git clone https://github.com/YOUR-ORG/faithflow.git
git lfs pull
```

---

## Service Management

### Check Status
```bash
sudo systemctl status faithflow-backend
sudo systemctl status nginx
sudo systemctl status mongod
```

### Restart Services
```bash
sudo systemctl restart faithflow-backend
sudo systemctl reload nginx
```

### View Logs
```bash
# Backend
sudo tail -f /var/log/faithflow/backend.log

# Errors
sudo tail -f /var/log/faithflow/backend-error.log

# Systemd
journalctl -u faithflow-backend -f
```

---

## Database

### Connect to MongoDB
```bash
mongosh "mongodb://faithflow_app:PASSWORD@localhost:27017/church_management"
```

### Check Bible Data
```bash
db.bible_verses.countDocuments({})
# Should return: 186592
```

### Backup Database
```bash
mongodump --uri="YOUR_MONGO_URL" --out=/backup/folder
```

### Restore Database
```bash
mongorestore --uri="YOUR_MONGO_URL" --drop /backup/folder
```

---

## Application Updates

### Update Code
```bash
cd /opt/faithflow
sudo su - faithflow

git pull origin main
git lfs pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build

# Restart
exit  # Exit faithflow user
sudo systemctl restart faithflow-backend
sudo systemctl reload nginx
```

---

## Health Check

### Quick Verification
```bash
curl http://localhost:8001/api/health
# Expected: {"status": "healthy"}

curl http://localhost:8001/api/bible/versions
# Expected: Array of 6 versions
```

### Run Full Health Check
```bash
bash /opt/faithflow/scripts/verify_deployment.sh
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
journalctl -u faithflow-backend -n 50

# Test manually
cd /opt/faithflow/backend
source venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

### Bible Data Missing
```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 scripts/import_tb_chs.py
python3 scripts/import_english_bibles.py
```

### TTS Not Working
```bash
# Check model files
ls -lh /opt/faithflow/backend/models/tts_indonesian/

# Should see:
# checkpoint.pth (330MB)
# config.json
# speakers.pth

# Also check:
ls -lh /opt/faithflow/backend/speakers.pth
```

### Frontend Build Failed
```bash
cd /opt/faithflow/frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## SSL/HTTPS

### Setup SSL (if skipped during install)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Renew Certificate
```bash
sudo certbot renew
```

### Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## Backup

### Manual Backup
```bash
# Run backup script
sudo su - faithflow
/opt/faithflow/backup.sh
```

### Check Backups
```bash
ls -lh /opt/faithflow/backups/
```

---

## Performance

### Check Resource Usage
```bash
# CPU and Memory
top -u faithflow

# Disk
df -h
du -sh /opt/faithflow

# MongoDB size
du -sh /var/lib/mongodb
```

### Optimize Database
```bash
mongosh YOUR_MONGO_URL
use church_management

# Create indexes
db.members.createIndex({"church_id": 1})
db.events.createIndex({"church_id": 1, "date": -1})
```

---

## Key Paths

- **Application:** `/opt/faithflow`
- **Backend .env:** `/opt/faithflow/backend/.env`
- **Frontend build:** `/opt/faithflow/frontend/build`
- **Logs:** `/var/log/faithflow/`
- **Backups:** `/opt/faithflow/backups/`
- **Nginx config:** `/etc/nginx/sites-available/faithflow`
- **Systemd service:** `/etc/systemd/system/faithflow-backend.service`

---

## Emergency Contacts

### If System Down

1. Check all services:
   ```bash
   sudo systemctl status faithflow-backend nginx mongod
   ```

2. Restart everything:
   ```bash
   sudo systemctl restart mongod
   sudo systemctl restart faithflow-backend
   sudo systemctl reload nginx
   ```

3. Check logs for errors

4. See `/docs/TROUBLESHOOTING.md`

---

**For complete documentation, see `/docs/` folder**
