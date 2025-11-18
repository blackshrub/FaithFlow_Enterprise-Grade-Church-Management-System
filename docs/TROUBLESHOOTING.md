# FaithFlow Troubleshooting Guide

## Common Issues & Solutions

---

## Installation Issues

### Git LFS Files Not Downloaded

**Symptom:** Bible JSON or TTS model files are tiny (few KB instead of MB)

**Solution:**
```bash
git lfs install
git lfs pull

# Verify:
ls -lh backend/data/bible/*.json
# Should show files in MB, not KB

ls -lh backend/models/tts_indonesian/checkpoint.pth
# Should show ~330MB
```

### Python Dependencies Fail to Install

**Symptom:** `pip install -r requirements.txt` shows errors

**Common causes:**

**Missing build tools:**
```bash
sudo apt install -y build-essential python3-dev
```

**Numpy/Pandas version conflicts:**
```bash
pip install 'numpy==1.26.4' 'pandas==1.5.3' --force-reinstall
```

**Torch not found:**
```bash
pip install torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu
```

---

## Runtime Issues

### Backend Won't Start

**Check MongoDB connection:**
```bash
# Test connection
mongosh "mongodb://user:pass@localhost:27017"

# If fails, check:
# 1. MongoDB running: sudo systemctl status mongod
# 2. Credentials in .env
# 3. Network access (if remote MongoDB)
```

**Check Python environment:**
```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 -c "import fastapi; print(fastapi.__version__)"
# Should print version, not error
```

**Check logs:**
```bash
journalctl -u faithflow-backend -n 50 --no-pager
```

### Frontend Shows Blank Page

**Check browser console:**
- F12 → Console tab
- Look for errors

**Common issues:**

**CORS error:**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Fix:** Add your domain to `CORS_ORIGINS` in backend `.env`

**API not reachable:**
```
Failed to fetch
```
**Fix:** Check backend is running, Nginx proxy configured

**Build not refreshed:**
```bash
cd /opt/faithflow/frontend
npm run build
sudo systemctl reload nginx
```

---

## Feature-Specific Issues

### Bible Verses Not Loading

**Symptom:** Verse picker shows "Failed to fetch verse"

**Check Bible data:**
```bash
python3 << EOF
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv('/opt/faithflow/backend/.env')
c = MongoClient(os.environ['MONGO_URL'])
db = c[os.environ['DB_NAME']]

total = db.bible_verses.count_documents({})
print(f"Total verses: {total:,}")

if total < 100000:
    print("\n⚠️ Bible data incomplete!")
    print("\nRun:")
    print("cd /opt/faithflow/backend")
    print("source venv/bin/activate")
    print("python3 scripts/import_tb_chs.py")
    print("python3 scripts/import_english_bibles.py")
else:
    print("\n✅ Bible database OK")
    
    # Check specific version
    for v in ['TB', 'CHS', 'NIV']:
        count = db.bible_verses.count_documents({"version_code": v})
        print(f"  {v}: {count:,} verses")
EOF
```

**Re-import if needed:**
```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 scripts/import_tb_chs.py
python3 scripts/import_english_bibles.py
```

### TTS Audio Generation Fails

**Symptom:** "Audio generation failed" or times out

**Check TTS model files:**
```bash
ls -lh /opt/faithflow/backend/models/tts_indonesian/
# Should see:
# checkpoint.pth (330MB)
# config.json (9KB)
# speakers.pth (2KB)

# Also check:
ls -lh /opt/faithflow/backend/speakers.pth
# Should exist (speakers.pth copy)
```

**If files missing:**
```bash
cd /opt/faithflow
git lfs pull

# Copy speakers.pth
cp backend/models/tts_indonesian/speakers.pth backend/speakers.pth
```

**Check Python dependencies:**
```bash
source venv/bin/activate
pip list | grep -E "TTS|scipy|numpy|g2p-id"

# Should show:
# TTS           0.22.0
# scipy         1.16.x
# numpy         1.26.4
# g2p-id        0.0.4
```

**Test TTS manually:**
```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 << EOF
from services.tts_service import generate_tts_audio
try:
    audio = generate_tts_audio("Test audio", "id")
    print(f"Success! Audio length: {len(audio)} chars")
except Exception as e:
    print(f"Error: {e}")
EOF
```

**Check timeout:**
- Frontend timeout: 120s (configured)
- Long content takes 60-90s
- Very long content may need more time

**Fallback to gTTS:**
- System automatically falls back
- Check logs: `grep -i "fallback\|gtts" /var/log/faithflow/backend-error.log`

### WhatsApp Not Sending

**Check settings:**
1. Settings → General → WhatsApp Notifications
2. Toggle should be ON
3. "Send RSVP Confirmation" should be ON

**Check environment:**
```bash
grep WHATSAPP /opt/faithflow/backend/.env
# Should show gateway URL
```

**Check gateway reachable:**
```bash
curl -X POST http://gateway-url:3001/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"628123456789","message":"Test"}'
```

**Check logs:**
```bash
grep -i whatsapp /var/log/faithflow/backend.log | tail -20
```

### QR Code Scanning Not Working

**Camera mode:**
- Browser must allow camera access
- HTTPS required for camera API
- Check browser permissions

**Hardware scanner mode:**
- Scanner must be in keyboard emulation mode
- Test by opening notepad and scanning
- Should type the QR data

**QR code format:**
- Event RSVP: `RSVP|event_id|member_id|session|code`
- Personal: `MEMBER|member_id|code`
- Check QR data is correct format

---

## Performance Issues

### Slow API Responses

**Check indexes:**
```javascript
mongosh YOUR_MONGO_URL
use church_management

// List indexes
db.members.getIndexes()
db.events.getIndexes()

// Create if missing:
db.members.createIndex({"church_id": 1})
db.events.createIndex({"church_id": 1, "date": -1})
db.devotions.createIndex({"church_id": 1, "date": -1})
db.bible_verses.createIndex({"version_code": 1, "book_number": 1, "chapter": 1, "verse": 1})
```

**Check query performance:**
```javascript
db.members.find({"church_id": "church-uuid"}).explain("executionStats")
// Look for: indexName (should use index, not COLLSCAN)
```

**Increase uvicorn workers:**
```bash
sudo nano /etc/systemd/system/faithflow-backend.service

# Change:
ExecStart=.../uvicorn server:app --workers 4
# To:
ExecStart=.../uvicorn server:app --workers 8

sudo systemctl daemon-reload
sudo systemctl restart faithflow-backend
```

### High Memory Usage

**TTS model in memory:**
- Coqui TTS keeps model loaded
- ~1-2GB RAM when active
- Normal behavior

**If system runs out of memory:**
```bash
# Check memory
free -h

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Database Issues

### MongoDB Connection Refused

**Check service:**
```bash
sudo systemctl status mongod

# If not running:
sudo systemctl start mongod
```

**Check authentication:**
```bash
# Test connection
mongosh "mongodb://user:pass@localhost:27017/church_management"

# If fails, check:
# 1. Username/password correct
# 2. User exists in MongoDB
# 3. User has correct permissions
```

**Check port:**
```bash
sudo netstat -tulpn | grep 27017
# Should show mongod listening
```

### Bible Data Import Fails

**Check JSON files exist:**
```bash
ls -lh /opt/faithflow/backend/data/bible/
# Should show 6 JSON files
```

**Check JSON valid:**
```bash
python3 -c "import json; json.load(open('backend/data/bible/indo_tb.json'))"
# Should complete without error
```

**Re-run import:**
```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 scripts/import_tb_chs.py 2>&1 | tee import.log

# Check for errors in import.log
```

---

## Nginx Issues

### 502 Bad Gateway

**Backend not running:**
```bash
sudo systemctl status faithflow-backend

# If stopped:
sudo systemctl start faithflow-backend
```

**Wrong proxy port:**
```bash
sudo nano /etc/nginx/sites-available/faithflow

# Verify:
location /api {
    proxy_pass http://127.0.0.1:8001;  # Must match backend port
}

# Test config:
sudo nginx -t

# Reload:
sudo systemctl reload nginx
```

### 504 Gateway Timeout

**TTS generation timeout:**
```bash
sudo nano /etc/nginx/sites-available/faithflow

# Add to /api location:
proxy_read_timeout 120s;
proxy_connect_timeout 120s;
proxy_send_timeout 120s;

sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate Issues

### Certificate Renewal Fails

**Check certbot timer:**
```bash
sudo systemctl status certbot.timer
```

**Manual renewal:**
```bash
sudo certbot renew --force-renewal
```

**Check domain DNS:**
```bash
dig yourdomain.com
# Should point to your server IP
```

---

## Logs

### Backend Logs

```bash
# Application logs
sudo tail -f /var/log/faithflow/backend.log

# Error logs
sudo tail -f /var/log/faithflow/backend-error.log

# Systemd logs
journalctl -u faithflow-backend -f
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### MongoDB Logs

```bash
sudo tail -f /var/log/mongodb/mongod.log
```

---

## Emergency Procedures

### System Completely Down

**Step 1: Check all services**
```bash
sudo systemctl status faithflow-backend
sudo systemctl status nginx
sudo systemctl status mongod
```

**Step 2: Restart in order**
```bash
sudo systemctl start mongod
sleep 5
sudo systemctl start faithflow-backend
sleep 5
sudo systemctl reload nginx
```

**Step 3: Check logs for errors**
```bash
journalctl -u faithflow-backend -n 100 --no-pager
```

### Restore from Backup

**MongoDB:**
```bash
mongorestore --uri="YOUR_MONGO_URL" --drop /path/to/backup/
```

**Environment file:**
```bash
cp /opt/faithflow/backups/env_backup /opt/faithflow/backend/.env
```

---

## Getting Help

**Before asking for help, gather:**

1. **Error message** (exact text)
2. **Logs** (last 50 lines)
   ```bash
   journalctl -u faithflow-backend -n 50 > backend.log
   ```
3. **System info**
   ```bash
   uname -a
   python3 --version
   node --version
   ```
4. **What you were doing** (steps to reproduce)

**Check:**
- GitHub Issues
- Stack Overflow (tag: fastapi, react, mongodb)
- Coqui TTS GitHub (for TTS issues)

---

## Prevention

### Regular Maintenance

**Weekly:**
```bash
# Check disk space
df -h

# Check service status
sudo systemctl status faithflow-backend

# Review error logs
sudo tail -n 100 /var/log/faithflow/backend-error.log | less
```

**Monthly:**
```bash
# Update system
sudo apt update && sudo apt upgrade

# Verify backups
ls -lh /opt/faithflow/backups/ | tail

# Test restore procedure (on staging)
```

**Quarterly:**
```bash
# Update Python dependencies (test first!)
pip list --outdated

# Update Node dependencies (test first!)
npm outdated

# Review and rotate logs
sudo find /var/log/faithflow -name "*.log" -mtime +90 -delete
```

---

## Quick Diagnostic Commands

```bash
# All-in-one health check
cat << 'EOF' > /opt/faithflow/health_check.sh
#!/bin/bash
echo "FaithFlow Health Check"
echo "====================="

echo "\n1. Services:"
systemctl is-active faithflow-backend && echo "  ✅ Backend" || echo "  ❌ Backend"
systemctl is-active nginx && echo "  ✅ Nginx" || echo "  ❌ Nginx"
systemctl is-active mongod && echo "  ✅ MongoDB" || echo "  ❌ MongoDB"

echo "\n2. Ports:"
netstat -tulpn | grep -E "8001|80|443|27017" | awk '{print "  " $4}'

echo "\n3. Disk:"
df -h / | tail -1 | awk '{print "  Used: " $5 " of " $2}'

echo "\n4. Memory:"
free -h | grep Mem | awk '{print "  Used: " $3 " of " $2}'

echo "\n5. Bible Data:"
source /opt/faithflow/backend/venv/bin/activate
python3 -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv('/opt/faithflow/backend/.env'); print(f'  Verses: {MongoClient(os.environ[\"MONGO_URL\"])[os.environ[\"DB_NAME\"]].bible_verses.count_documents({}):,}')"

echo "\n6. Recent Errors:"
tail -5 /var/log/faithflow/backend-error.log 2>/dev/null || echo "  No recent errors"

echo "\nDone."
EOF

chmod +x /opt/faithflow/health_check.sh
/opt/faithflow/health_check.sh
```

---

**For deployment issues, see:** `/docs/DEPLOYMENT_DEBIAN.md`

**For API errors, see:** `/docs/API.md`
