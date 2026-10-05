# Backend Setup Guide — WatchTogether

The WatchTogether backend is a Node.js TypeScript server providing REST APIs for room management and WebSocket endpoints for WebRTC signaling and playback control.

---

## Environment Configuration

Create a `.env` file in the `server/` directory:

```env
PORT=8080
FRONTEND_ORIGIN=*
ROOM_TTL_MINUTES=30
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:turn.example.com:3478
TURN_USERNAME=myuser
TURN_CREDENTIAL=mypassword
```

---

## API Endpoints

### REST Endpoints

1. `GET /health` — Health check endpoint.
2. `POST /api/rooms` — Create a new room as Host. Returns `roomCode`, `role: HOST`, `hostId`, `expiresAt`, and `iceServers`.
3. `POST /api/rooms/:code/join` — Join an existing room as Viewer. Returns `roomCode`, `role: VIEWER`, `viewerId`, and `iceServers`.
4. `GET /api/rooms/:code` — Query current room state.

### WebSocket Endpoint

`ws://<host>:<port>/ws?roomCode=<CODE>&peerId=<PEER_ID>&role=<HOST|VIEWER>`

---

## Development Setup

```bash
cd server
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm start
```
