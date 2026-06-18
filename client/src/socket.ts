import { io, Socket } from 'socket.io-client';
import { PublicRoomState, RoomListItem } from './types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const PLAYER_ID_KEY = 'bitg_player_id';

type EventHandlers = {
  onConnected: (data: { playerId: string }) => void;
  onRoomsList: (rooms: RoomListItem[]) => void;
  onRoomJoined: (room: PublicRoomState) => void;
  onRoomUpdate: (room: PublicRoomState) => void;
  onRoomDeleted: () => void;
  onRoomLeft: () => void;
  onError: (data: { message: string }) => void;
};

function getStoredPlayerId(): string | null {
  return localStorage.getItem(PLAYER_ID_KEY);
}

function storePlayerId(id: string) {
  localStorage.setItem(PLAYER_ID_KEY, id);
}

class SocketService {
  private socket: Socket | null = null;

  connect(handlers: EventHandlers) {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('authenticate', { storedPlayerId: getStoredPlayerId() });
    });

    this.socket.on('connected', ({ playerId }) => {
      storePlayerId(playerId);
      handlers.onConnected({ playerId });
    });

    this.socket.on('roomsList', handlers.onRoomsList);
    this.socket.on('roomJoined', handlers.onRoomJoined);
    this.socket.on('roomUpdate', handlers.onRoomUpdate);
    this.socket.on('roomDeleted', handlers.onRoomDeleted);
    this.socket.on('roomLeft', handlers.onRoomLeft);
    this.socket.on('error', handlers.onError);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getRooms() {
    this.socket?.emit('getRooms');
  }

  createRoom(nickname: string, roomName: string) {
    this.socket?.emit('createRoom', { nickname, roomName });
  }

  deleteRoom(roomId: string) {
    this.socket?.emit('deleteRoom', { roomId });
  }

  joinRoom(roomId: string, nickname: string) {
    this.socket?.emit('joinRoom', { roomId, nickname });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leaveRoom', { roomId });
  }

  startGame(roomId: string) {
    this.socket?.emit('startGame', { roomId });
  }

  submitPath(roomId: string, path: { t: number; price: number }[]) {
    this.socket?.emit('submitPath', { roomId, path });
  }

  placeBet(roomId: string, bet: { type: 'long' | 'short'; margin: number; leverage: number }) {
    this.socket?.emit('placeBet', { roomId, bet });
  }

  bettingReady(roomId: string) {
    this.socket?.emit('bettingReady', { roomId });
  }

  sellPosition(roomId: string, positionId: string, percentage: number) {
    this.socket?.emit('sellPosition', { roomId, positionId, percentage });
  }
}

export const socketService = new SocketService();

export function getInviteLink(roomId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?room=${roomId}`;
}

export function getRoomIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}
