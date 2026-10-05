import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || '*',
  ROOM_TTL_MINUTES: process.env.ROOM_TTL_MINUTES ? parseInt(process.env.ROOM_TTL_MINUTES, 10) : 30,
  MAX_ROOM_SIZE: 2,
  STUN_URL: process.env.STUN_URL || 'stun:stun.l.google.com:19302',
  TURN_URL: process.env.TURN_URL || '',
  TURN_USERNAME: process.env.TURN_USERNAME || '',
  TURN_CREDENTIAL: process.env.TURN_CREDENTIAL || ''
};
