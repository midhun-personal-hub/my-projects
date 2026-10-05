import { Room } from './Room';
import { RoomState } from '../types/protocol';

export class RoomManager {
  private rooms: Map<string, Room> = new Map(); // Keyed by roomCode

  constructor() {
    // Periodically clean up expired rooms every 60 seconds
    setInterval(() => this.cleanupExpiredRooms(), 60000);
  }

  public createRoom(hostId: string): Room {
    const roomCode = this.generateRoomCode();
    const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const room = new Room(roomId, roomCode, hostId);
    this.rooms.set(roomCode, room);
    return room;
  }

  public getRoom(roomCode: string): Room | undefined {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (room && room.isExpired()) {
      this.rooms.delete(roomCode.toUpperCase());
      return undefined;
    }
    return room;
  }

  public joinRoom(roomCode: string, viewerId: string): Room | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const success = room.joinViewer(viewerId);
    return success ? room : null;
  }

  public removeRoom(roomCode: string): void {
    this.rooms.delete(roomCode.toUpperCase());
  }

  private cleanupExpiredRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.isExpired() || room.state.status === 'CLOSED') {
        this.rooms.delete(code);
      }
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars O,0,I,1
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }
}

export const roomManager = new RoomManager();
