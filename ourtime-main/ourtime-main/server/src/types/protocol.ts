export type Role = 'HOST' | 'VIEWER';

export type RoomStatus = 'WAITING' | 'CONNECTING' | 'CONNECTED' | 'CLOSED';

export interface PlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  sequence: number;
  updatedAt: number;
}

export interface MediaMetadata {
  available: boolean;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  hostId: string;
  viewerId?: string;
  status: RoomStatus;
  createdAt: number;
  expiresAt: number;
  playback: PlaybackState;
  media: MediaMetadata;
}

export type MessageType =
  | 'HELLO'
  | 'ROOM_STATE'
  | 'PEER_JOINED'
  | 'PEER_LEFT'
  | 'WEBRTC_OFFER'
  | 'WEBRTC_ANSWER'
  | 'ICE_CANDIDATE'
  | 'PLAYBACK_PLAY'
  | 'PLAYBACK_PAUSE'
  | 'PLAYBACK_SEEK'
  | 'PLAYBACK_SYNC'
  | 'FILE_INFO'
  | 'BUFFER_STATUS'
  | 'CHAT_MESSAGE'
  | 'CALL_OFFER'
  | 'CALL_ANSWER'
  | 'CALL_ICE'
  | 'PING'
  | 'PONG'
  | 'RECONNECT'
  | 'ERROR';

export interface SignalingMessage {
  type: MessageType;
  roomId?: string;
  roomCode?: string;
  senderId?: string;
  recipientId?: string;
  role?: Role;
  payload?: any;
  timestamp?: number;
}

export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}
