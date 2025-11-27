# Voice/Video Calling Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FaithFlow Calling System                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   Mobile A   │     │   Backend    │     │   Mobile B   │            │
│  │  (Caller)    │     │   (FastAPI)  │     │  (Callee)    │            │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│         │                    │                    │                     │
│         │  1. POST /calls    │                    │                     │
│         │ ────────────────►  │                    │                     │
│         │                    │ 2. Create room     │                     │
│         │                    │    Generate token  │                     │
│         │                    │                    │                     │
│         │ ◄─────────────────│                    │                     │
│         │  Token + Room info │                    │                     │
│         │                    │                    │                     │
│         │                    │ 3. MQTT: call_invite                    │
│         │                    │ ───────────────────►                     │
│         │                    │                    │                     │
│         │                    │ 4. MQTT: ringing   │                     │
│         │                    │ ◄───────────────── │                     │
│         │                    │                    │                     │
│         │                    │ 5. POST /calls/{id}/accept              │
│         │                    │ ◄───────────────── │                     │
│         │                    │    Generate token  │                     │
│         │                    │                    │                     │
│         │ 6. MQTT: accept    │                    │                     │
│         │ ◄─────────────────│                    │                     │
│         │                    │                    │                     │
│         │       7. Connect to LiveKit Room        │                     │
│         │ ────────────────────────────────────────►                     │
│         │                    │                    │                     │
│         │ ◄─────────────────────────────────────►│                     │
│         │       WebRTC Media (via LiveKit SFU)    │                     │
│         │                                         │                     │
│  ┌──────┴───────┐                         ┌──────┴───────┐            │
│  │   LiveKit    │◄───────────────────────►│   LiveKit    │            │
│  │   SDK        │      Media Streams      │   SDK        │            │
│  └──────────────┘                         └──────────────┘            │
│                                                                          │
│                         ┌──────────────────┐                            │
│                         │   LiveKit SFU    │                            │
│                         │   (Docker)       │                            │
│                         └────────┬─────────┘                            │
│                                  │                                       │
│                         ┌────────┴─────────┐                            │
│                         │    coTURN        │                            │
│                         │  (TURN/STUN)     │                            │
│                         └──────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Sequence Diagrams

### 1. Outgoing Call Flow

```
Caller App          Backend API         MQTT Broker         Callee App
    │                   │                   │                   │
    │ POST /api/calls   │                   │                   │
    │ ─────────────────►│                   │                   │
    │                   │                   │                   │
    │                   │ Create LiveKit room                   │
    │                   │ Generate caller token                 │
    │                   │ Store call log                        │
    │                   │                   │                   │
    │ CallResponse      │                   │                   │
    │ ◄─────────────────│                   │                   │
    │                   │                   │                   │
    │ Set UI: outgoing  │                   │                   │
    │ Connect to LiveKit│                   │                   │
    │                   │                   │                   │
    │                   │ Publish call_invite                   │
    │                   │ ─────────────────►│                   │
    │                   │                   │ call_invite       │
    │                   │                   │ ─────────────────►│
    │                   │                   │                   │
    │                   │                   │                   │ Show incoming
    │                   │                   │                   │ call UI
    │                   │                   │                   │
    │                   │                   │ ringing           │
    │                   │                   │ ◄─────────────────│
    │ ringing           │                   │                   │
    │ ◄─────────────────│                   │                   │
    │                   │                   │                   │
    │ Ring feedback     │                   │                   │
    │                   │                   │                   │
```

### 2. Call Accept Flow

```
Callee App          Backend API         MQTT Broker         Caller App
    │                   │                   │                   │
    │ POST /calls/{id}/accept              │                   │
    │ ─────────────────►│                   │                   │
    │                   │                   │                   │
    │                   │ Verify call status                    │
    │                   │ Generate callee token                 │
    │                   │ Update status: connecting             │
    │                   │                   │                   │
    │ CallResponse      │                   │                   │
    │ ◄─────────────────│                   │                   │
    │                   │                   │                   │
    │ Set UI: connecting│                   │                   │
    │ Connect to LiveKit│                   │                   │
    │                   │                   │                   │
    │                   │ Publish call_accept                   │
    │                   │ ─────────────────►│                   │
    │                   │                   │ call_accept       │
    │                   │                   │ ─────────────────►│
    │                   │                   │                   │
    │                   │                   │                   │ Set UI: connecting
    │                   │                   │                   │
    ├───────────────────┼───────────────────┼───────────────────┤
    │                 LiveKit Connection Established             │
    ├───────────────────┼───────────────────┼───────────────────┤
    │                   │                   │                   │
    │ POST /calls/{id}/connected           │                   │
    │ ─────────────────►│                   │                   │
    │                   │ Update status: active                 │
    │                   │                   │                   │
    │                   │ Publish participant_joined            │
    │                   │ ─────────────────►│ ─────────────────►│
    │                   │                   │                   │
    │ Set UI: active    │                   │                   │ Set UI: active
    │ Start timer       │                   │                   │ Start timer
    │                   │                   │                   │
    │◄──────────────────────────────────────────────────────────►│
    │                      WebRTC Media                          │
    │                                                            │
```

### 3. Call Reject/Busy Flow

```
Callee App          Backend API         MQTT Broker         Caller App
    │                   │                   │                   │
    │ POST /calls/{id}/reject              │                   │
    │ { reason: "busy" }│                   │                   │
    │ ─────────────────►│                   │                   │
    │                   │                   │                   │
    │                   │ Update call status                    │
    │                   │ (rejected/busy)                       │
    │                   │                   │                   │
    │ { message: "ok" } │                   │                   │
    │ ◄─────────────────│                   │                   │
    │                   │                   │                   │
    │ Dismiss UI        │ Publish call_reject/busy             │
    │                   │ ─────────────────►│                   │
    │                   │                   │ call_reject       │
    │                   │                   │ ─────────────────►│
    │                   │                   │                   │
    │                   │                   │                   │ Show rejected
    │                   │                   │                   │ Set UI: ended
    │                   │                   │                   │
```

### 4. Call End Flow

```
Either App          Backend API         MQTT Broker         Other App
    │                   │                   │                   │
    │ POST /calls/{id}/end                 │                   │
    │ { reason: "normal" }                 │                   │
    │ ─────────────────►│                   │                   │
    │                   │                   │                   │
    │                   │ Calculate duration                    │
    │                   │ Update call log                       │
    │                   │ Delete LiveKit room                   │
    │                   │                   │                   │
    │ { message: "ok" } │                   │                   │
    │ ◄─────────────────│                   │                   │
    │                   │                   │                   │
    │ Disconnect LiveKit│ Publish call_end │                   │
    │ Set UI: ended     │ ─────────────────►│                   │
    │                   │                   │ call_end          │
    │                   │                   │ ─────────────────►│
    │                   │                   │                   │
    │                   │                   │                   │ Disconnect
    │                   │                   │                   │ Set UI: ended
    │                   │                   │                   │
```

## File Structure

```
FaithFlow/
├── backend/
│   ├── models/
│   │   └── call.py                    # Call data models
│   ├── services/
│   │   ├── livekit_service.py         # LiveKit integration
│   │   ├── call_signaling_service.py  # MQTT call signals
│   │   └── call_service.py            # Business logic
│   └── routes/
│       └── call.py                    # API endpoints
│
├── docker/
│   └── livekit/
│       ├── docker-compose.yml         # LiveKit + coTURN
│       ├── livekit.yaml               # LiveKit config
│       └── turnserver.conf            # coTURN config
│
└── mobile/
    ├── types/
    │   └── call.ts                    # TypeScript types
    ├── stores/
    │   └── call.ts                    # Zustand call store
    ├── services/
    │   ├── api/
    │   │   └── call.ts                # REST API client
    │   └── callSignaling.ts           # MQTT signaling
    ├── components/
    │   └── call/
    │       ├── index.ts
    │       ├── CallControls.tsx       # Control buttons
    │       ├── CallerInfo.tsx         # Caller display
    │       └── IncomingCallOverlay.tsx # Incoming call UI
    └── app/
        └── call/
            └── [id].tsx               # Call screen
```

## MQTT Topics

### Topic Structure
```
faithflow/{church_id}/member/{member_id}/incoming_call   # Incoming call invitations
faithflow/{church_id}/member/{member_id}/call_status     # Call status updates
faithflow/{church_id}/call/{call_id}/signal              # Call signals
faithflow/{church_id}/call/{call_id}/participants        # Participant updates
```

### Signal Types
| Signal Type | Direction | Description |
|-------------|-----------|-------------|
| `call_invite` | Backend → Callee | New incoming call |
| `call_ringing` | Callee → Backend | Callee received invite |
| `call_accept` | Backend → Caller | Call accepted |
| `call_reject` | Backend → Caller | Call rejected |
| `call_busy` | Backend → Caller | Callee is busy |
| `call_cancel` | Backend → Callee | Caller cancelled |
| `call_end` | Backend → All | Call ended |
| `participant_joined` | Backend → All | Participant connected |
| `participant_left` | Backend → All | Participant disconnected |
| `participant_muted` | Backend → All | Mute status changed |
| `participant_video` | Backend → All | Video status changed |

## Installation Steps

### 1. Backend Dependencies
```bash
cd backend
pip install livekit-server-sdk paho-mqtt
```

### 2. Mobile Dependencies
```bash
cd mobile
npm install @livekit/react-native @livekit/components-react-native
npx pod-install  # iOS only
```

### 3. Docker Services
```bash
# Create network
docker network create faithflow-network

# Start LiveKit + coTURN
cd docker/livekit
docker-compose up -d
```

### 4. Environment Variables

**Backend (.env)**
```env
# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# MQTT (use existing)
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
```

**Mobile (constants/api.ts)**
```typescript
export const LIVEKIT_URL = __DEV__
  ? 'ws://localhost:7880'
  : 'wss://livekit.yourdomain.com';
```

## Best Practices

### 1. Network Quality
- Monitor WebRTC stats via LiveKit
- Show network quality indicator
- Implement graceful degradation (disable video on poor connection)
- Use adaptive bitrate

### 2. Audio/Video Management
- Request permissions before initiating call
- Use proximity sensor for earpiece/speaker switching
- Handle audio session interruptions (other calls, alarms)
- Implement noise cancellation if available

### 3. Error Handling
- Timeout for unanswered calls (45 seconds)
- Reconnection logic for network drops
- Fallback UI for WebRTC failures
- Clear error messages to users

### 4. Battery Optimization
- Use background modes appropriately
- Stop camera when video disabled
- Use efficient codecs (VP8, Opus)

### 5. Security
- Always use TLS in production (wss://)
- Validate tokens server-side
- Implement call permission checks
- Rate limit call initiation

### 6. UX Considerations
- Haptic feedback for all actions
- Ringtone/vibration for incoming calls
- Clear call status indicators
- Smooth transitions between states
- Show connection quality

## Implementation Checklist

### Backend
- [x] Call models (MongoDB schemas)
- [x] LiveKit service (token generation)
- [x] MQTT call signaling service
- [x] Call business logic service
- [x] FastAPI routes
- [ ] Add call routes to main router
- [ ] Add scheduler job for stale call cleanup
- [ ] Add indexes for call queries

### Infrastructure
- [x] Docker Compose for LiveKit + coTURN
- [x] LiveKit configuration
- [x] coTURN configuration
- [ ] Production SSL/TLS certificates
- [ ] Domain configuration for TURN
- [ ] Firewall rules for UDP ports

### Mobile
- [x] TypeScript types
- [x] Zustand call store
- [x] Call API service
- [x] Call signaling service
- [x] Call UI components
- [x] Call screen
- [ ] Install @livekit/react-native
- [ ] Integrate LiveKit SDK
- [ ] Add permissions requests
- [ ] Add IncomingCallOverlay to root layout
- [ ] Initialize call signaling on auth

### Testing
- [ ] Unit tests for call service
- [ ] Integration tests for call flow
- [ ] E2E tests for complete call
- [ ] Network condition testing
- [ ] Multi-device testing

## Production Deployment

### LiveKit Server
1. Use managed LiveKit Cloud or deploy to dedicated server
2. Configure proper domain and SSL
3. Set production API keys
4. Configure TURN servers for NAT traversal

### coTURN Server
1. Deploy to server with public IP
2. Configure realm with your domain
3. Generate strong static-auth-secret
4. Configure SSL certificates
5. Open UDP ports 49152-65535

### Backend
1. Add environment variables for LiveKit
2. Register call routes in main app
3. Add scheduler job for cleanup
4. Configure MongoDB indexes

### Mobile
1. Install LiveKit React Native SDK
2. Configure iOS permissions (camera, microphone)
3. Configure Android permissions
4. Add background modes for calls
5. Test on physical devices

## Troubleshooting

### Common Issues

**1. Call not connecting**
- Check LiveKit server is running
- Verify tokens are being generated correctly
- Check network/firewall allows WebRTC

**2. No audio/video**
- Verify permissions granted
- Check TURN server for NAT traversal
- Verify codec support

**3. Calls dropping**
- Check network quality
- Implement reconnection logic
- Monitor WebRTC stats

**4. MQTT signals not received**
- Verify MQTT connection
- Check topic subscriptions
- Verify message format

### Debug Commands
```bash
# Check LiveKit rooms
curl http://localhost:7880/rooms -H "Authorization: Bearer <token>"

# Test TURN server
turnutils_stunclient localhost

# Check MQTT messages
mosquitto_sub -h localhost -p 1883 -t "faithflow/#" -v
```
