import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { CONFIG } from './config/env';
import { roomManager } from './rooms/RoomManager';
import { signalingManager } from './signaling/SignalingManager';
import { Role } from './types/protocol';

const app = express();
app.use(cors({ origin: CONFIG.FRONTEND_ORIGIN }));
app.use(express.json());

// REST APIs
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/rooms', (req, res) => {
  const { hostId } = req.body;
  const peerId = hostId || `host_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const room = roomManager.createRoom(peerId);

  res.status(201).json({
    roomCode: room.state.roomCode,
    roomId: room.state.roomId,
    role: 'HOST',
    hostId: peerId,
    expiresAt: room.state.expiresAt,
    iceServers: [
      { urls: CONFIG.STUN_URL },
      ...(CONFIG.TURN_URL ? [{ urls: CONFIG.TURN_URL, username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_CREDENTIAL }] : [])
    ]
  });
});

app.post('/api/rooms/:code/join', (req, res) => {
  const roomCode = req.params.code.toUpperCase();
  const { viewerId } = req.body;
  const peerId = viewerId || `viewer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const room = roomManager.joinRoom(roomCode, peerId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found, full, or expired' });
  }

  res.json({
    roomCode: room.state.roomCode,
    roomId: room.state.roomId,
    role: 'VIEWER',
    viewerId: peerId,
    roomState: room.state,
    iceServers: [
      { urls: CONFIG.STUN_URL },
      ...(CONFIG.TURN_URL ? [{ urls: CONFIG.TURN_URL, username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_CREDENTIAL }] : [])
    ]
  });
});

app.get('/api/rooms/:code', (req, res) => {
  const roomCode = req.params.code.toUpperCase();
  const room = roomManager.getRoom(roomCode);
  if (!room) {
    return res.status(404).json({ error: 'Room not found or expired' });
  }
  res.json(room.state);
});

// HTTP & WS Server setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
  const roomCode = (urlParams.get('roomCode') || '').toUpperCase();
  const peerId = urlParams.get('peerId') || '';
  const role = (urlParams.get('role') || 'VIEWER').toUpperCase() as Role;

  if (!roomCode || !peerId) {
    ws.close(4001, 'Missing roomCode or peerId');
    return;
  }

  const room = roomManager.getRoom(roomCode);
  if (!room) {
    ws.close(4004, 'Room not found or expired');
    return;
  }

  signalingManager.registerClient(ws, peerId, roomCode, role);
});

server.listen(CONFIG.PORT, () => {
  console.log(`WatchTogether Signaling Server running on port ${CONFIG.PORT}`);
});
