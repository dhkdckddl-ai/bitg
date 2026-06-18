import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine, toPublicRoomState } from './GameEngine.js';
import { PricePoint, ABANDONED_ROOM_SWEEP_MS } from './types.js';
import { addChatMessage, getChatHistory, clearRoomChat } from './chat.js';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(',') }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'BitG Game Server' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(','),
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const engine = new GameEngine(
  (roomId) => {
    const room = engine.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
    }
  },
  (roomId) => {
    clearRoomChat(roomId);
    io.to(roomId).emit('roomDeleted');
    broadcastRooms();
  }
);

function broadcastRooms() {
  io.emit('roomsList', engine.getAllRooms());
}

function sendChatHistory(socket: import('socket.io').Socket, roomId: string) {
  socket.emit('chatHistory', getChatHistory(roomId));
}

const activePlayerSockets = new Map<string, string>();

function registerPlayerSocket(playerId: string, socket: import('socket.io').Socket) {
  activePlayerSockets.set(playerId, socket.id);
  socket.data.playerId = playerId;
}

function joinPlayerRoom(
  socket: import('socket.io').Socket,
  playerId: string,
  room: ReturnType<typeof engine.getRoom>
) {
  if (!room) return;
  registerPlayerSocket(playerId, socket);
  socket.join(room.id);
  socket.emit('roomJoined', toPublicRoomState(room));
  sendChatHistory(socket, room.id);
  io.to(room.id).emit('roomUpdate', toPublicRoomState(room));
}

io.on('connection', (socket) => {
  let playerId = uuidv4();

  socket.on('authenticate', ({ storedPlayerId }: { storedPlayerId?: string }) => {
    if (storedPlayerId && typeof storedPlayerId === 'string') {
      playerId = storedPlayerId;
    }

    registerPlayerSocket(playerId, socket);

    const room = engine.reconnect(playerId);
    if (room) {
      socket.emit('connected', { playerId });
      joinPlayerRoom(socket, playerId, room);
    } else {
      socket.emit('connected', { playerId });
    }

    socket.emit('roomsList', engine.getAllRooms());
  });

  socket.on('getRooms', () => {
    socket.emit('roomsList', engine.getAllRooms());
  });

  socket.on('createRoom', ({ nickname, roomName }: { nickname: string; roomName: string }) => {
    if (!nickname?.trim() || !roomName?.trim()) {
      socket.emit('error', { message: '닉네임과 방 이름을 입력해주세요' });
      return;
    }

    const existingRoomId = engine.getRoomByPlayer(playerId)?.id;
    if (existingRoomId) {
      socket.emit('error', { message: '이미 다른 방에 있습니다. 나간 후 다시 시도하세요.' });
      return;
    }

    const room = engine.createRoom(playerId, nickname.trim(), roomName.trim());
    registerPlayerSocket(playerId, socket);
    socket.join(room.id);
    socket.emit('roomJoined', toPublicRoomState(room));
    sendChatHistory(socket, room.id);
    broadcastRooms();
  });

  socket.on('deleteRoom', ({ roomId }: { roomId: string }) => {
    const success = engine.deleteRoom(roomId, playerId);
    if (!success) {
      socket.emit('error', { message: '방을 삭제할 권한이 없습니다' });
      return;
    }
    broadcastRooms();
  });

  socket.on('joinRoom', ({ roomId, nickname }: { roomId: string; nickname: string }) => {
    if (!nickname?.trim()) {
      socket.emit('error', { message: '닉네임을 입력해주세요' });
      return;
    }

    const result = engine.joinRoom(roomId, playerId, nickname.trim());
    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(roomId);
    registerPlayerSocket(playerId, socket);
    socket.emit('roomJoined', toPublicRoomState(result.room));
    sendChatHistory(socket, roomId);
    io.to(roomId).emit('roomUpdate', toPublicRoomState(result.room));
    broadcastRooms();
  });

  socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
    engine.leaveRoom(playerId);
    activePlayerSockets.delete(playerId);
    socket.leave(roomId);
    socket.emit('roomLeft');
    const room = engine.getRoom(roomId);
    if (room) {
      io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
    }
    broadcastRooms();
  });

  socket.on('startGame', ({ roomId }: { roomId: string }) => {
    const success = engine.startGame(roomId, playerId);
    if (!success) {
      socket.emit('error', { message: '게임을 시작할 수 없습니다 (최소 2명 필요)' });
      return;
    }
    const room = engine.getRoom(roomId);
    if (room) io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  });

  socket.on('submitPath', ({ roomId, path }: { roomId: string; path: PricePoint[] }) => {
    const success = engine.submitPath(roomId, playerId, path);
    if (!success) {
      socket.emit('error', { message: '경로를 제출할 수 없습니다' });
      return;
    }
    const room = engine.getRoom(roomId);
    if (room) io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  });

  socket.on('placeBet', ({
    roomId,
    bet,
  }: {
    roomId: string;
    bet: { type: 'long' | 'short'; margin: number; leverage: number };
  }) => {
    const err = engine.placeBet(roomId, playerId, bet);
    if (err) {
      socket.emit('error', { message: err });
      return;
    }
    const room = engine.getRoom(roomId);
    if (room) io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  });

  socket.on('bettingReady', ({ roomId }: { roomId: string }) => {
    const err = engine.setBettingReady(roomId, playerId);
    if (err) {
      socket.emit('error', { message: err });
      return;
    }
    const room = engine.getRoom(roomId);
    if (room) io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  });

  socket.on('sellPosition', ({
    roomId,
    positionId,
    percentage,
  }: {
    roomId: string;
    positionId: string;
    percentage: number;
  }) => {
    const err = engine.sellPosition(roomId, playerId, positionId, percentage);
    if (err) {
      socket.emit('error', { message: err });
      return;
    }
    const room = engine.getRoom(roomId);
    if (room) io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  });

  socket.on('sendChat', ({ roomId, message }: { roomId: string; message: string }) => {
    const room = engine.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: '방을 찾을 수 없습니다' });
      return;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      socket.emit('error', { message: '방에 참여 중이 아닙니다' });
      return;
    }

    const entry = addChatMessage(roomId, playerId, player.nickname, message);
    if (!entry) return;

    io.to(roomId).emit('chatMessage', entry);
  });

  socket.on('disconnect', () => {
    const id = (socket.data.playerId as string | undefined) ?? playerId;
    if (activePlayerSockets.get(id) !== socket.id) return;

    activePlayerSockets.delete(id);
    engine.handleDisconnect(id);
    const room = engine.getRoomByPlayer(id);
    if (room) {
      io.to(room.id).emit('roomUpdate', toPublicRoomState(room));
    }
    broadcastRooms();
  });
});

httpServer.listen(PORT, () => {
  console.log(`BitG server running on port ${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_ORIGIN}`);

  setInterval(() => {
    engine.cleanupAbandonedWaitingRooms();
  }, ABANDONED_ROOM_SWEEP_MS);
});
