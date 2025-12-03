#!/bin/bash
# FaithFlow Post-Deployment Verification Script
# Run this after completing deployment to verify everything works

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

function success() {
    echo -e "${COLOR_GREEN}✅ $1${COLOR_RESET}"
}

function error() {
    echo -e "${COLOR_RED}❌ $1${COLOR_RESET}"
}

function warning() {
    echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"
}

echo "=========================================="
echo "FaithFlow Deployment Verification"
echo "=========================================="

# 1. Check services
echo -e "\n1. Checking Services..."
if systemctl is-active --quiet faithflow-backend; then
    success "Backend service running"
else
    error "Backend service not running"
    echo "  Fix: sudo systemctl start faithflow-backend"
fi

if systemctl is-active --quiet nginx; then
    success "Nginx running"
else
    error "Nginx not running"
    echo "  Fix: sudo systemctl start nginx"
fi

if systemctl is-active --quiet mongod; then
    success "MongoDB running"
else
    error "MongoDB not running"
    echo "  Fix: sudo systemctl start mongod"
fi

# 2. Check ports
echo -e "\n2. Checking Ports..."
if netstat -tuln | grep -q ":8001 "; then
    success "Backend listening on port 8001"
else
    error "Backend not listening on port 8001"
fi

if netstat -tuln | grep -q ":80 \|:443 "; then
    success "Nginx listening on port 80/443"
else
    error "Nginx not listening on port 80/443"
fi

# 3. Check large files
echo -e "\n3. Checking Large Files (Git LFS)..."
BIBLE_SIZE=$(du -sm /opt/faithflow/backend/data/bible 2>/dev/null | cut -f1)
if [ "$BIBLE_SIZE" -gt 30 ]; then
    success "Bible data present ($BIBLE_SIZE MB)"
else
    error "Bible data missing or incomplete ($BIBLE_SIZE MB)"
    echo "  Fix: cd /opt/faithflow && git lfs pull"
fi

# 4. Check Python environment
echo -e "\n4. Checking Python Environment..."
if [ -d "/opt/faithflow/backend/venv" ]; then
    success "Python venv exists"
    
    source /opt/faithflow/backend/venv/bin/activate
    
    if python3 -c "import fastapi" 2>/dev/null; then
        success "FastAPI installed"
    else
        error "FastAPI not installed"
        echo "  Fix: pip install -r requirements.txt"
    fi

    deactivate
else
    error "Python venv not found"
    echo "  Fix: cd /opt/faithflow/backend && python3 -m venv venv"
fi

# 5. Check frontend build
echo -e "\n5. Checking Frontend Build..."
if [ -f "/opt/faithflow/frontend/build/index.html" ]; then
    success "Frontend build exists"
else
    error "Frontend build missing"
    echo "  Fix: cd /opt/faithflow/frontend && npm run build"
fi

# 6. Check MongoDB connection
echo -e "\n6. Checking MongoDB Connection..."
cd /opt/faithflow/backend
source venv/bin/activate

if python3 << EOF 2>/dev/null
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
c = MongoClient(os.environ['MONGO_URL'])
c.admin.command('ping')
print('Connected')
EOF
then
    success "MongoDB connection OK"
else
    error "Cannot connect to MongoDB"
    echo "  Check: MONGO_URL in backend/.env"
fi

# 7. Check Bible database
echo -e "\n7. Checking Bible Database..."
VERSE_COUNT=$(python3 << EOF 2>/dev/null
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
c = MongoClient(os.environ['MONGO_URL'])
db = c[os.environ['DB_NAME']]
print(db.bible_verses.count_documents({}))
EOF
)

if [ "$VERSE_COUNT" -gt 180000 ]; then
    success "Bible database complete ($VERSE_COUNT verses)"
else
    error "Bible database incomplete ($VERSE_COUNT verses)"
    echo "  Fix: python3 scripts/import_tb_chs.py"
    echo "       python3 scripts/import_english_bibles.py"
fi

deactivate

# 8. Test API endpoint
echo -e "\n8. Testing API Endpoint..."
if curl -s http://localhost:8001/api/health | grep -q "healthy"; then
    success "Backend API responding"
else
    error "Backend API not responding"
    echo "  Check: journalctl -u faithflow-backend -n 20"
fi

# 9. Test Bible API
echo -e "\n9. Testing Bible API..."
if curl -s http://localhost:8001/api/bible/versions | grep -q "TB"; then
    success "Bible API working"
else
    error "Bible API not working"
fi

# Summary
echo -e "\n=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "If all checks passed, your system is ready!"
echo ""
echo "Next steps:"
echo "1. Open https://yourdomain.com in browser"
echo "2. Login with admin credentials"
echo "3. Test creating a devotion"
echo "4. Test kiosk mode"
echo "5. Test creating members and events"
echo ""
