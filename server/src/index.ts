import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine, toPublicRoomState } from './GameEngine.js';
import { PricePoint } from './types.js';

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

const engine = new GameEngine((roomId) => {
  const room = engine.getRoom(roomId);
  if (room) {
    io.to(roomId).emit('roomUpdate', toPublicRoomState(room));
  }
});

function broadcastRooms() {
  io.emit('roomsList', engine.getAllRooms());
}

io.on('connection', (socket) => {
  let playerId = uuidv4();

  socket.on('authenticate', ({ storedPlayerId }: { storedPlayerId?: string }) => {
    if (storedPlayerId && typeof storedPlayerId === 'string') {
      playerId = storedPlayerId;
    }
    socket.data.playerId = playerId;

    const room = engine.reconnect(playerId);
    if (room) {
      socket.join(room.id);
      socket.emit('connected', { playerId });
      socket.emit('roomJoined', toPublicRoomState(room));
      io.to(room.id).emit('roomUpdate', toPublicRoomState(room));
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
    socket.join(room.id);
    socket.emit('roomJoined', toPublicRoomState(room));
    broadcastRooms();
  });

  socket.on('deleteRoom', ({ roomId }: { roomId: string }) => {
    const success = engine.deleteRoom(roomId, playerId);
    if (!success) {
      socket.emit('error', { message: '방을 삭제할 권한이 없습니다' });
      return;
    }
    io.to(roomId).emit('roomDeleted');
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
    socket.emit('roomJoined', toPublicRoomState(result.room));
    io.to(roomId).emit('roomUpdate', toPublicRoomState(result.room));
    broadcastRooms();
  });

  socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
    engine.leaveRoom(playerId);
    socket.leave(roomId);
    socket.emit('roomLeft');
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

  socket.on('disconnect', () => {
    engine.handleDisconnect(playerId);
    const room = engine.getRoomByPlayer(playerId);
    if (room) {
      io.to(room.id).emit('roomUpdate', toPublicRoomState(room));
    }
    broadcastRooms();
  });
});

httpServer.listen(PORT, () => {
  console.log(`BitG server running on port ${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_ORIGIN}`);
});
