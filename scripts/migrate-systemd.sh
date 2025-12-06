#!/bin/bash
set -e

echo "🔄 Migrating from supervisord to systemd..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Step 1: Stop and disable supervisord
echo "1️⃣ Stopping supervisord services..."
if command -v supervisorctl &> /dev/null; then
    supervisorctl stop all || true
    systemctl stop supervisord || true
    systemctl disable supervisord || true
    echo "   ✅ Supervisord stopped and disabled"
else
    echo "   ⚠️ supervisorctl not found, skipping"
fi

# Step 2: Create log directory
echo ""
echo "2️⃣ Creating log directory..."
mkdir -p /var/log/faithflow
chmod 755 /var/log/faithflow
echo "   ✅ Created /var/log/faithflow"

# Step 3: Copy systemd service files
echo ""
echo "3️⃣ Installing systemd service files..."
cp faithflow-backend.service /etc/systemd/system/
cp faithflow-frontend.service /etc/systemd/system/
chmod 644 /etc/systemd/system/faithflow-backend.service
chmod 644 /etc/systemd/system/faithflow-frontend.service
echo "   ✅ Service files installed to /etc/systemd/system/"

# Step 4: Reload systemd
echo ""
echo "4️⃣ Reloading systemd daemon..."
systemctl daemon-reload
echo "   ✅ Systemd daemon reloaded"

# Step 5: Enable services
echo ""
echo "5️⃣ Enabling services to start on boot..."
systemctl enable faithflow-backend.service
systemctl enable faithflow-frontend.service
echo "   ✅ Services enabled"

# Step 6: Start services
echo ""
echo "6️⃣ Starting services..."
systemctl start faithflow-backend.service
systemctl start faithflow-frontend.service
echo "   ✅ Services started"

# Step 7: Check status
echo ""
echo "7️⃣ Service status:"
echo ""
echo "📊 Backend status:"
systemctl status faithflow-backend.service --no-pager -l || true
echo ""
echo "📊 Frontend status:"
systemctl status faithflow-frontend.service --no-pager -l || true

# Step 8: Show helpful commands
echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Useful commands:"
echo ""
echo "  # Check service status"
echo "  sudo systemctl status faithflow-backend"
echo "  sudo systemctl status faithflow-frontend"
echo ""
echo "  # View logs with tail (as you requested)"
echo "  tail -f /var/log/faithflow/backend.out.log"
echo "  tail -f /var/log/faithflow/backend.err.log"
echo "  tail -f /var/log/faithflow/frontend.out.log"
echo "  tail -f /var/log/faithflow/frontend.err.log"
echo ""
echo "  # View all logs combined"
echo "  tail -f /var/log/faithflow/*.log"
echo ""
echo "  # Restart services"
echo "  sudo systemctl restart faithflow-backend"
echo "  sudo systemctl restart faithflow-frontend"
echo ""
echo "  # Stop services"
echo "  sudo systemctl stop faithflow-backend"
echo "  sudo systemctl stop faithflow-frontend"
echo ""
echo "  # Enable/disable auto-start on boot"
echo "  sudo systemctl enable faithflow-backend"
echo "  sudo systemctl disable faithflow-backend"
echo ""
echo "  # View recent logs (alternative to tail)"
echo "  journalctl -u faithflow-backend -f"
echo "  journalctl -u faithflow-frontend -f"
echo ""
echo "🎯 Log files are in: /var/log/faithflow/"
