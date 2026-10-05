import { WebSocket } from 'ws';
import { SignalingMessage, Role } from '../types/protocol';
import { roomManager } from '../rooms/RoomManager';

interface ClientConnection {
  ws: WebSocket;
  peerId: string;
  roomCode: string;
  role: Role;
  isAlive: boolean;
}

export class SignalingManager {
  private clients: Map<string, ClientConnection> = new Map(); // Keyed by peerId

  constructor() {
    // Heartbeat check every 30s
    setInterval(() => {
      this.clients.forEach((client, peerId) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.handleDisconnect(peerId);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }

  public registerClient(ws: WebSocket, peerId: string, roomCode: string, role: Role): void {
    const existing = this.clients.get(peerId);
    if (existing) {
      try { existing.ws.close(); } catch (e) {}
    }

    const client: ClientConnection = { ws, peerId, roomCode, role, isAlive: true };
    this.clients.set(peerId, client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());
        this.handleMessage(peerId, message);
      } catch (err) {
        console.error(`Invalid JSON from ${peerId}:`, err);
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(peerId);
    });

    ws.on('error', (err) => {
      console.error(`WS error for ${peerId}:`, err);
      this.handleDisconnect(peerId);
    });

    // Notify caller hello acknowledged
    const room = roomManager.getRoom(roomCode);
    this.sendTo(peerId, {
      type: 'ROOM_STATE',
      roomCode,
      senderId: 'SERVER',
      payload: room ? room.state : null
    });

    // Notify other peer in room
    if (room) {
      const otherPeerId = role === 'HOST' ? room.state.viewerId : room.state.hostId;
      if (otherPeerId) {
        this.sendTo(otherPeerId, {
          type: 'PEER_JOINED',
          roomCode,
          senderId: peerId,
          role,
          payload: { peerId, role }
        });
      }
    }
  }

  public handleMessage(senderId: string, message: SignalingMessage): void {
    const client = this.clients.get(senderId);
    if (!client) return;

    const room = roomManager.getRoom(client.roomCode);
    if (!room) {
      this.sendTo(senderId, { type: 'ERROR', payload: { message: 'Room not found or expired' } });
      return;
    }

    // Determine target recipient (for 2-person room, it's the other peer)
    const recipientId = client.role === 'HOST' ? room.state.viewerId : room.state.hostId;

    switch (message.type) {
      case 'PING':
        this.sendTo(senderId, { type: 'PONG', timestamp: Date.now() });
        break;

      case 'PLAYBACK_PLAY':
      case 'PLAYBACK_PAUSE':
      case 'PLAYBACK_SEEK':
      case 'PLAYBACK_SYNC':
        if (message.payload) {
          room.updatePlayback(message.payload);
        }
        // Relay to other peer
        if (recipientId) {
          this.sendTo(recipientId, { ...message, senderId });
        }
        break;

      case 'FILE_INFO':
        if (message.payload) {
          room.updateMedia(message.payload);
        }
        if (recipientId) {
          this.sendTo(recipientId, { ...message, senderId });
        }
        break;

      case 'WEBRTC_OFFER':
      case 'WEBRTC_ANSWER':
      case 'ICE_CANDIDATE':
      case 'CALL_OFFER':
      case 'CALL_ANSWER':
      case 'CALL_ICE':
      case 'CHAT_MESSAGE':
      case 'BUFFER_STATUS':
      case 'RECONNECT':
        if (recipientId) {
          this.sendTo(recipientId, { ...message, senderId });
        }
        break;

      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }

  public sendTo(recipientId: string, message: SignalingMessage): void {
    const target = this.clients.get(recipientId);
    if (target && target.ws.readyState === WebSocket.OPEN) {
      target.ws.send(JSON.stringify(message));
    }
  }

  private handleDisconnect(peerId: string): void {
    const client = this.clients.get(peerId);
    if (!client) return;

    this.clients.delete(peerId);

    const room = roomManager.getRoom(client.roomCode);
    if (room) {
      room.removePeer(peerId);
      const recipientId = client.role === 'HOST' ? room.state.viewerId : room.state.hostId;
      if (recipientId) {
        this.sendTo(recipientId, {
          type: 'PEER_LEFT',
          roomCode: client.roomCode,
          senderId: peerId,
          role: client.role,
          payload: { peerId, role: client.role }
        });
      }
    }
  }
}

export const signalingManager = new SignalingManager();
