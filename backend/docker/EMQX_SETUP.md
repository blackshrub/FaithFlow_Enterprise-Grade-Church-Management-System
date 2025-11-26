# EMQX Manual Installation Guide

EMQX is a highly scalable MQTT broker used by FaithFlow for real-time community messaging.

## Installation Options

### Option A: Package Installation (Recommended for Production)

#### Ubuntu/Debian

```bash
# Add EMQX repository
curl -s https://packagecloud.io/install/repositories/emqx/emqx/script.deb.sh | sudo bash

# Install EMQX
sudo apt-get install emqx

# Start EMQX
sudo systemctl start emqx
sudo systemctl enable emqx

# Check status
sudo systemctl status emqx
```

#### CentOS/RHEL

```bash
# Add EMQX repository
curl -s https://packagecloud.io/install/repositories/emqx/emqx/script.rpm.sh | sudo bash

# Install EMQX
sudo yum install emqx

# Start EMQX
sudo systemctl start emqx
sudo systemctl enable emqx
```

### Option B: Binary Installation

```bash
# Download EMQX (check https://www.emqx.io/downloads for latest version)
wget https://www.emqx.com/en/downloads/broker/5.3.0/emqx-5.3.0-ubuntu22.04-amd64.tar.gz

# Extract
tar -xzf emqx-5.3.0-ubuntu22.04-amd64.tar.gz
cd emqx

# Start in foreground (for testing)
./bin/emqx foreground

# Start as daemon
./bin/emqx start

# Check status
./bin/emqx_ctl status
```

### Option C: Docker (If you change your mind)

```bash
docker run -d --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  -v emqx-data:/opt/emqx/data \
  -v emqx-log:/opt/emqx/log \
  emqx/emqx:5.3.0
```

## Ports Configuration

| Port | Protocol | Purpose |
|------|----------|---------|
| 1883 | MQTT | Main MQTT connections |
| 8083 | MQTT over WebSocket | Browser clients |
| 8084 | MQTT over WSS | Secure WebSocket |
| 8883 | MQTTS | Secure MQTT (TLS) |
| 18083 | HTTP | Dashboard & REST API |

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 1883/tcp   # MQTT
sudo ufw allow 8083/tcp   # WebSocket
sudo ufw allow 18083/tcp  # Dashboard

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --permanent --add-port=8083/tcp
sudo firewall-cmd --permanent --add-port=18083/tcp
sudo firewall-cmd --reload
```

## Dashboard Access

```
URL: http://your-server-ip:18083
Default Username: admin
Default Password: public
```

**Important:** Change the default password immediately!

## Configuration for FaithFlow

### 1. Enable JWT Authentication

Edit `/etc/emqx/emqx.conf` (or `./etc/emqx.conf` for binary install):

```hocon
# Add JWT authentication
authentication = [
  {
    mechanism = jwt
    from = password
    use_jwks = false
    algorithm = "hmac-based"
    secret = "${JWT_SECRET}"  # Same as your FastAPI JWT_SECRET
    verify_claims = {
      # Member ID from JWT
      sub = "%u"
    }
  }
]
```

### 2. Configure ACL Rules

Create `/etc/emqx/acl.conf`:

```erlang
%% FaithFlow MQTT ACL Rules

%% Allow all authenticated users to subscribe to their church topics
{allow, {user, all}, subscribe, ["faithflow/+/#"]}.

%% Allow publishing to community channels
{allow, {user, all}, publish, ["faithflow/+/community/+/general"]}.
{allow, {user, all}, publish, ["faithflow/+/community/+/subgroup/+"]}.
{allow, {user, all}, publish, ["faithflow/+/community/+/typing"]}.
{allow, {user, all}, publish, ["faithflow/+/community/+/read"]}.
{allow, {user, all}, publish, ["faithflow/+/community/+/reactions"]}.
{allow, {user, all}, publish, ["faithflow/+/presence/+"]}.

%% Announcements (leaders only - enforced at app level, allowed here)
{allow, {user, all}, publish, ["faithflow/+/community/+/announcements"]}.

%% Deny all other
{deny, all}.
```

### 3. Tune for Performance

Edit `emqx.conf`:

```hocon
# Increase max connections (default 1M is usually fine)
listeners.tcp.default.max_connections = 100000

# WebSocket listener
listeners.ws.default.bind = "0.0.0.0:8083"
listeners.ws.default.max_connections = 100000

# Session settings
mqtt.max_inflight = 32
mqtt.max_mqueue_len = 1000
mqtt.mqueue_store_qos0 = true

# Retain message settings
retainer.enable = true
retainer.max_retained_messages = 100000

# Last Will and Testament for presence
mqtt.await_rel_timeout = "300s"
```

### 4. Apply Configuration

```bash
# For package install
sudo systemctl restart emqx

# For binary install
./bin/emqx restart
```

## Testing MQTT Connection

### Using mosquitto_pub/sub (install: `apt install mosquitto-clients`)

```bash
# Subscribe to test topic
mosquitto_sub -h localhost -p 1883 -t "test/topic" -u "testuser" -P "password"

# Publish to test topic (in another terminal)
mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "Hello MQTT" -u "testuser" -P "password"
```

### Using Python

```python
import paho.mqtt.client as mqtt
import jwt
from datetime import datetime, timedelta

# Generate JWT token (same secret as FastAPI)
JWT_SECRET = "your-secret-key"
token = jwt.encode({
    "sub": "member_123",
    "church_id": "church_456",
    "exp": datetime.utcnow() + timedelta(hours=24)
}, JWT_SECRET, algorithm="HS256")

# Connect
client = mqtt.Client()
client.username_pw_set(username="member_123", password=token)
client.connect("localhost", 1883, 60)

# Subscribe
client.subscribe("faithflow/church_456/community/+/general")

# Publish
client.publish("faithflow/church_456/community/comm_789/general", '{"text": "Hello!"}')
```

## MQTT Topics Structure

```
faithflow/{church_id}/
├── presence/{member_id}
│   └── {"online": true, "last_seen": "2025-01-15T10:30:00Z"}
│
├── community/{community_id}/
│   ├── announcements
│   │   └── {"id": "msg_xxx", "sender_id": "...", "text": "...", ...}
│   │
│   ├── general
│   │   └── {"id": "msg_xxx", "sender_id": "...", "text": "...", ...}
│   │
│   ├── subgroup/{subgroup_id}
│   │   └── {"id": "msg_xxx", "sender_id": "...", "text": "...", ...}
│   │
│   ├── typing
│   │   └── {"member_id": "xxx", "is_typing": true}
│   │
│   ├── read
│   │   └── {"member_id": "xxx", "message_id": "yyy", "read_at": "..."}
│   │
│   └── reactions
│       └── {"message_id": "xxx", "member_id": "yyy", "emoji": "👍", "action": "add"}
```

## QoS Levels

FaithFlow uses:
- **QoS 0**: Typing indicators (at most once, fire-and-forget)
- **QoS 1**: Reactions, read receipts (at least once)
- **QoS 2**: Messages (exactly once, guaranteed delivery)

## Monitoring

### Dashboard Metrics

Access at `http://your-server:18083`:
- Active connections
- Message throughput
- Topic subscriptions
- Client sessions

### CLI Metrics

```bash
# Connection count
./bin/emqx_ctl clients list

# Topic subscriptions
./bin/emqx_ctl subscriptions list

# Cluster status
./bin/emqx_ctl cluster status
```

## Troubleshooting

### Connection Refused

```bash
# Check if EMQX is running
sudo systemctl status emqx

# Check logs
sudo tail -f /var/log/emqx/emqx.log

# Check if port is listening
ss -tlnp | grep 1883
```

### Authentication Failed

```bash
# Test with dashboard API
curl -u admin:public http://localhost:18083/api/v5/clients

# Check JWT secret matches
echo $JWT_SECRET
```

### Messages Not Delivered

```bash
# Check ACL rules
./bin/emqx_ctl acl cache clean

# Enable debug logging temporarily
./bin/emqx_ctl log set-level debug
```

## Backup

```bash
# Backup data directory
tar -cvzf emqx-backup-$(date +%Y%m%d).tar.gz /var/lib/emqx

# Backup config
cp /etc/emqx/emqx.conf /backup/emqx.conf.bak
```

## Security Best Practices

1. **Change default admin password** immediately
2. **Use TLS** for production (port 8883)
3. **Restrict dashboard access** to admin IPs
4. **Enable ACL** to limit topic access
5. **Use JWT authentication** with short expiry
6. **Monitor for unusual connection patterns**

## Integration with FaithFlow Backend

The FastAPI backend will:
1. Generate JWT tokens for mobile app MQTT connections
2. Publish server-side messages (system notifications, admin broadcasts)
3. Store messages in MongoDB (MQTT is for delivery, not storage)
4. Handle message acknowledgments and read receipts

See `backend/services/mqtt_service.py` for implementation details.
