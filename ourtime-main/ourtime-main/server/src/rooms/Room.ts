import { RoomState, Role, PlaybackState, MediaMetadata } from '../types/protocol';
import { CONFIG } from '../config/env';

export class Room {
  public state: RoomState;

  constructor(roomId: string, roomCode: string, hostId: string) {
    const now = Date.now();
    this.state = {
      roomId,
      roomCode,
      hostId,
      status: 'WAITING',
      createdAt: now,
      expiresAt: now + CONFIG.ROOM_TTL_MINUTES * 60 * 1000,
      playback: {
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        sequence: 0,
        updatedAt: now
      },
      media: {
        available: false
      }
    };
  }

  public joinViewer(viewerId: string): boolean {
    if (this.state.viewerId && this.state.viewerId !== viewerId) {
      return false; // Room full
    }
    this.state.viewerId = viewerId;
    this.state.status = 'CONNECTING';
    this.touch();
    return true;
  }

  public removePeer(peerId: string): void {
    if (this.state.hostId === peerId) {
      // Host left, mark closed
      this.state.status = 'CLOSED';
    } else if (this.state.viewerId === peerId) {
      this.state.viewerId = undefined;
      this.state.status = 'WAITING';
    }
    this.touch();
  }

  public updatePlayback(newPlayback: Partial<PlaybackState>): void {
    if (newPlayback.sequence !== undefined && newPlayback.sequence < this.state.playback.sequence) {
      return; // Ignore older sequence updates
    }

    this.state.playback = {
      ...this.state.playback,
      ...newPlayback,
      updatedAt: Date.now()
    };
    this.touch();
  }

  public updateMedia(media: MediaMetadata): void {
    this.state.media = media;
    this.touch();
  }

  public touch(): void {
    this.state.expiresAt = Date.now() + CONFIG.ROOM_TTL_MINUTES * 60 * 1000;
  }

  public isExpired(): boolean {
    return Date.now() > this.state.expiresAt;
  }
}
