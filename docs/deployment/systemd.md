# Systemd Migration Guide

This guide covers migrating FaithFlow from supervisord to systemd for better service management.

## Why Systemd?

- ✅ Native Linux init system (no extra dependencies)
- ✅ Better integration with system logging
- ✅ More powerful restart and dependency management
- ✅ Standard across modern Linux distributions
- ✅ Can log to files for `tail` access (as requested)

## Quick Migration

Run the automated migration script:

```bash
sudo ./migrate-to-systemd.sh
```

This script will:
1. Stop and disable supervisord
2. Create `/var/log/faithflow/` directory
3. Install systemd service files
4. Enable and start services
5. Show service status

## Manual Installation (Alternative)

If you prefer manual setup:

### 1. Create log directory
```bash
sudo mkdir -p /var/log/faithflow
sudo chmod 755 /var/log/faithflow
```

### 2. Copy service files
```bash
sudo cp faithflow-backend.service /etc/systemd/system/
sudo cp faithflow-frontend.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/faithflow-*.service
```

### 3. Reload systemd and start services
```bash
sudo systemctl daemon-reload
sudo systemctl enable faithflow-backend faithflow-frontend
sudo systemctl start faithflow-backend faithflow-frontend
```

### 4. Install log rotation (recommended)
```bash
sudo cp faithflow-logrotate.conf /etc/logrotate.d/faithflow
sudo chmod 644 /etc/logrotate.d/faithflow
```

## Service Management

### Check Service Status
```bash
# Individual services
sudo systemctl status faithflow-backend
sudo systemctl status faithflow-frontend

# Both at once
sudo systemctl status faithflow-*
```

### Start/Stop/Restart
```bash
# Start
sudo systemctl start faithflow-backend
sudo systemctl start faithflow-frontend

# Stop
sudo systemctl stop faithflow-backend
sudo systemctl stop faithflow-frontend

# Restart
sudo systemctl restart faithflow-backend
sudo systemctl restart faithflow-frontend

# Reload systemd after editing .service files
sudo systemctl daemon-reload
```

### Enable/Disable Auto-start
```bash
# Enable (start on boot)
sudo systemctl enable faithflow-backend
sudo systemctl enable faithflow-frontend

# Disable
sudo systemctl disable faithflow-backend
sudo systemctl disable faithflow-frontend
```

## Log Management

### View Logs with tail (Recommended by user)

```bash
# Backend logs
tail -f /var/log/faithflow/backend.out.log    # stdout
tail -f /var/log/faithflow/backend.err.log    # stderr

# Frontend logs
tail -f /var/log/faithflow/frontend.out.log   # stdout
tail -f /var/log/faithflow/frontend.err.log   # stderr

# All logs combined
tail -f /var/log/faithflow/*.log

# Last 100 lines
tail -100 /var/log/faithflow/backend.out.log

# Follow with grep filter
tail -f /var/log/faithflow/backend.out.log | grep ERROR
```

### View Logs with journalctl (Alternative)

```bash
# Follow logs (like tail -f)
journalctl -u faithflow-backend -f
journalctl -u faithflow-frontend -f

# Last 100 lines
journalctl -u faithflow-backend -n 100

# Today's logs only
journalctl -u faithflow-backend --since today

# Filter by time
journalctl -u faithflow-backend --since "1 hour ago"
journalctl -u faithflow-backend --since "2025-01-23 14:00"

# Both services
journalctl -u faithflow-backend -u faithflow-frontend -f
```

## Log Rotation

Logs are automatically rotated daily and kept for 30 days (configurable in `/etc/logrotate.d/faithflow`).

To manually test log rotation:
```bash
sudo logrotate -f /etc/logrotate.d/faithflow
```

## Troubleshooting

### Service won't start
```bash
# Check detailed status
sudo systemctl status faithflow-backend -l

# Check logs
tail -50 /var/log/faithflow/backend.err.log

# Check journalctl for systemd errors
journalctl -u faithflow-backend -n 50
```

### Logs not appearing
```bash
# Verify log directory permissions
ls -la /var/log/faithflow/

# Should be owned by root with 755 permissions
sudo chmod 755 /var/log/faithflow
sudo touch /var/log/faithflow/{backend,frontend}.{out,err}.log
```

### Changes to .service file not taking effect
```bash
# Always reload after editing service files
sudo systemctl daemon-reload
sudo systemctl restart faithflow-backend
```

## Configuration Files

- **Service files**: `/etc/systemd/system/faithflow-*.service`
- **Log files**: `/var/log/faithflow/*.log`
- **Log rotation**: `/etc/logrotate.d/faithflow`
- **Backend code**: `/opt/faithflow/backend/`
- **Frontend code**: `/opt/faithflow/frontend/`

## Comparison: Supervisord vs Systemd

| Feature | Supervisord | Systemd |
|---------|-------------|---------|
| Process management | ✅ | ✅ |
| Auto-restart | ✅ | ✅ |
| Log to files | ✅ | ✅ (configured) |
| Native to Linux | ❌ | ✅ |
| Dependency management | Basic | Advanced |
| Resource limits | Limited | Full cgroups |
| Security hardening | Limited | Full (see service files) |
| Command | `supervisorctl` | `systemctl` |

## Reverting to Supervisord (if needed)

If you need to go back:

```bash
# Stop systemd services
sudo systemctl stop faithflow-backend faithflow-frontend
sudo systemctl disable faithflow-backend faithflow-frontend

# Start supervisord
sudo systemctl start supervisord
sudo systemctl enable supervisord
sudo supervisorctl start all
```

## Additional Systemd Features

### Resource Limits (add to .service files)
```ini
[Service]
# Limit memory
MemoryLimit=2G

# Limit CPU
CPUQuota=50%

# Limit processes
TasksMax=100
```

### Email Alerts on Failure (requires mailutils)
```ini
[Service]
OnFailure=failure-notification@%n.service
```

### Start Delay
```ini
[Service]
ExecStartPre=/bin/sleep 5
```

---

**Questions?** Check systemd documentation: `man systemd.service`
