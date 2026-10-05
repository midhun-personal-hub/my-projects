# WatchTogether Protocol Specification

This document details the WebSocket and DataChannel message schemas used between Host, Viewer, and Signaling Server.

---

## Signaling Messages (WebSocket)

All messages are JSON objects matching `SignalingMessage`:

```typescript
export interface SignalingMessage {
  type: MessageType;
  roomId?: string;
  roomCode?: string;
  senderId?: string;
  recipientId?: string;
  role?: 'HOST' | 'VIEWER';
  payload?: any;
  timestamp?: number;
}
```

### Playback Command Payload

```json
{
  "type": "PLAYBACK_PLAY",
  "senderId": "peer_123",
  "payload": {
    "isPlaying": true,
    "positionMs": 124500,
    "durationMs": 7200000,
    "sequence": 14,
    "updatedAt": 1720000000000
  }
}
```

### WebRTC DataChannels

WatchTogether creates three DataChannels:

1. `control`: Reliability enabled. Low latency sync messages, buffer status, and playback state.
2. `file`: Reliability enabled (`ordered = true`). Movie chunks transmission.
3. `chat`: Peer-to-peer real-time text chat messages.

### File Chunk Frame Specification (Binary / JSON framing)

```json
{
  "fileId": "mov_9876",
  "sequence": 42,
  "offset": 1048576,
  "length": 262144,
  "checksum": "a1b2c3d4",
  "data": "<BASE64_OR_RAW_ARRAY>"
}
```
