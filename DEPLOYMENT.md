# Deployment Instructions for Emergent

## Pre-Deployment Setup

### 1. Environment Variables

**Backend Environment Variables:**
Create `backend/.env` from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Then update:
```env
MONGO_URL=<will-be-auto-configured-by-emergent>
DB_NAME=church_management
CORS_ORIGINS=*
JWT_SECRET_KEY=<generate-strong-random-key>
```

**Generate JWT Secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Frontend Environment Variables:**
Create `frontend/.env` from `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env
```

Then update:
```env
REACT_APP_BACKEND_URL=<will-be-auto-configured-by-emergent>
WDS_SOCKET_PORT=443
```

### 2. Verify Supervisor Config

Check `/etc/supervisor/conf.d/supervisord.conf` exists (should be in repo).

---

## Emergent Deployment

### Method 1: Via Emergent UI

1. Push code to GitHub
2. In Emergent dashboard:
   - Connect GitHub repository
   - Select branch (main/master)
   - Click "Deploy"
3. Emergent will:
   - Auto-detect FastAPI + React stack
   - Create .env files with correct URLs
   - Build Docker image with kaniko
   - Deploy to Kubernetes

### Method 2: Via Git Push

1. Ensure .env.example files exist
2. Ensure supervisor config exists
3. Push to GitHub:
   ```bash
   git add .
   git commit -m "feat: v1.0.0 release"
   git push origin main
   ```
4. Deploy via Emergent UI

---

## Post-Deployment

### Verify Deployment

1. **Check Health:**
   ```bash
   curl https://your-app.emergent.host/api/health
   ```

2. **Test Login:**
   ```bash
   curl -X POST https://your-app.emergent.host/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@church.com","password":"your-password"}'
   ```

3. **Check Background Jobs:**
   - Status automation should run hourly
   - Trash cleanup should run daily at 2 AM
   - Webhooks should process queue every 10 seconds

### Initialize Data

If deploying to a fresh database:

```bash
# SSH into pod or run via kubectl exec
cd /app/backend
python3 scripts/init_event_categories.py  # Create Sunday Service category
```

---

## Troubleshooting

### Kaniko Build Failures

**Issue:** "kaniko job failed: job failed"

**Common Causes:**
1. **.env files missing in repo**
   - Solution: Ensure .env.example files exist
   - Emergent will copy .env.example → .env

2. **Supervisor config missing**
   - Solution: Ensure /etc/supervisor/conf.d/supervisord.conf is in repo
   - Not in .gitignore

3. **Large dependencies**
   - Solution: Verify torch is commented out in requirements.txt

4. **Build context too large**
   - Solution: Add .dockerignore file

### Runtime Errors

**Backend won't start:**
- Check environment variables are set
- Verify MongoDB connection
- Check supervisor logs

**Frontend won't compile:**
- Verify REACT_APP_BACKEND_URL is set
- Check Node.js version (18+)
- Verify yarn.lock is committed

---

## Production Checklist

- [ ] .env.example files created
- [ ] Strong JWT_SECRET_KEY generated
- [ ] Supervisor config in repo
- [ ] torch removed from requirements.txt
- [ ] All documentation updated
- [ ] GitHub repository connected to Emergent
- [ ] Deployment successful
- [ ] Health check passes
- [ ] Login works
- [ ] API responds correctly

---

## Resources

- **Memory:** 1Gi
- **CPU:** 250m
- **Replicas:** 2
- **Port:** Backend 8001, Frontend 3000

---

**For support, contact Emergent deployment team.**
