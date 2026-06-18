import { v4 as uuidv4 } from 'uuid';
import {
  STARTING_BALANCE,
  STARTING_PRICE,
  MIN_BET,
  MAX_LEVERAGE,
  MAX_PRICE_CHANGE,
  ANIMATION_DURATION_MS,
  PRICE_POINTS,
  MAX_PLAYERS_PER_ROOM,
  DISCONNECT_GRACE_MS,
  GamePhase,
  Player,
  Position,
  PricePoint,
  RoomState,
  BetRequest,
  PublicRoomState,
  PublicPlayer,
} from './types.js';

export function calcUnrealizedPnl(position: Position, currentPrice: number): number {
  const ratio = position.remainingMargin / position.margin;
  const effectiveMargin = position.margin * ratio;
  const notional = effectiveMargin * position.leverage;
  if (position.type === 'long') {
    return (notional * (currentPrice - position.entryPrice)) / position.entryPrice;
  }
  return (notional * (position.entryPrice - currentPrice)) / position.entryPrice;
}

export function calcPlayerUnrealizedPnl(player: Player, currentPrice: number): number {
  return player.positions.reduce((sum, p) => sum + calcUnrealizedPnl(p, currentPrice), 0);
}

export function calcTotalEquity(player: Player, currentPrice: number): number {
  return player.balance + calcPlayerUnrealizedPnl(player, currentPrice);
}

function createPlayer(id: string, nickname: string): Player {
  return {
    id,
    nickname,
    balance: STARTING_BALANCE,
    isEliminated: false,
    positions: [],
    bettingReady: false,
    isConnected: true,
    disconnectedAt: null,
  };
}

function getActivePlayers(room: RoomState): Player[] {
  return room.players.filter((p) => !p.isEliminated);
}

function getActivePlayer(room: RoomState): Player | null {
  const active = getActivePlayers(room);
  if (active.length === 0) return null;
  return active[room.turnIndex % active.length];
}

function getMinMaxPrice(currentPrice: number): { min: number; max: number } {
  return {
    min: currentPrice * (1 - MAX_PRICE_CHANGE),
    max: currentPrice * (1 + MAX_PRICE_CHANGE),
  };
}

function normalizePath(rawPath: PricePoint[], currentPrice: number): PricePoint[] {
  const { min, max } = getMinMaxPrice(currentPrice);
  const sorted = [...rawPath].sort((a, b) => a.t - b.t);
  const result: PricePoint[] = [];

  for (let i = 0; i < PRICE_POINTS; i++) {
    const t = i / (PRICE_POINTS - 1);
    let price = currentPrice;

    for (let j = 0; j < sorted.length - 1; j++) {
      const a = sorted[j];
      const b = sorted[j + 1];
      if (t >= a.t && t <= b.t) {
        const ratio = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
        price = a.price + (b.price - a.price) * ratio;
        break;
      }
    }
    if (sorted.length === 1) price = sorted[0].price;
    if (t <= sorted[0]?.t) price = sorted[0].price;
    if (t >= sorted[sorted.length - 1]?.t) price = sorted[sorted.length - 1].price;

    price = Math.max(min, Math.min(max, price));
    result.push({ t, price });
  }
  return result;
}

function toPublicPlayer(player: Player, currentPrice: number): PublicPlayer {
  const unrealizedPnl = calcPlayerUnrealizedPnl(player, currentPrice);
  return {
    id: player.id,
    nickname: player.nickname,
    balance: player.balance,
    isEliminated: player.isEliminated,
    positions: [...player.positions],
    bettingReady: player.bettingReady,
    unrealizedPnl,
    totalEquity: player.balance + unrealizedPnl,
    isConnected: player.isConnected,
  };
}

function getVisiblePricePath(room: RoomState): PricePoint[] {
  if (room.phase === 'drawing' || room.phase === 'betting' || room.phase === 'waiting') {
    return [];
  }
  if (room.pricePath.length === 0) return [];
  if (room.phase === 'turn_end') return room.pricePath;

  const total = room.pricePath.length;
  if (total <= 1) return room.pricePath;

  const maxIdx = Math.max(1, Math.floor(room.animationProgress * (total - 1)));
  return room.pricePath.slice(0, maxIdx + 1);
}

export function toPublicRoomState(room: RoomState): PublicRoomState {
  const active = getActivePlayer(room);
  const { min, max } = getMinMaxPrice(room.currentPrice);
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: room.players.map((p) => toPublicPlayer(p, room.currentPrice)),
    phase: room.phase,
    turnIndex: room.turnIndex,
    activePlayerId: active?.id ?? null,
    currentPrice: room.currentPrice,
    pricePath: getVisiblePricePath(room),
    animationProgress: room.animationProgress,
    turnNumber: room.turnNumber,
    gameStarted: room.gameStarted,
    minPrice: min,
    maxPrice: max,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
  };
}

export class GameEngine {
  private rooms = new Map<string, RoomState>();
  private playerRoom = new Map<string, string>();
  private animationTimers = new Map<string, NodeJS.Timeout>();
  private onRoomUpdate: (roomId: string) => void;

  constructor(onRoomUpdate: (roomId: string) => void) {
    this.onRoomUpdate = onRoomUpdate;
  }

  createRoom(hostId: string, hostNickname: string, roomName: string): RoomState {
    const roomId = uuidv4().slice(0, 8);
    const room: RoomState = {
      id: roomId,
      name: roomName,
      hostId,
      players: [createPlayer(hostId, hostNickname)],
      phase: 'waiting',
      turnIndex: 0,
      currentPrice: STARTING_PRICE,
      pricePath: [],
      animationProgress: 0,
      turnNumber: 0,
      gameStarted: false,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.playerRoom.set(hostId, roomId);
    return room;
  }

  deleteRoom(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId) return false;
    this.stopAnimation(roomId);
    for (const p of room.players) {
      this.playerRoom.delete(p.id);
    }
    this.rooms.delete(roomId);
    return true;
  }

  joinRoom(roomId: string, playerId: string, nickname: string): { room: RoomState } | { error: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { error: '방을 찾을 수 없습니다' };
    if (room.gameStarted) return { error: '이미 시작된 게임에는 입장할 수 없습니다' };

    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.isConnected = true;
      existing.disconnectedAt = null;
      this.playerRoom.set(playerId, roomId);
      return { room };
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      return { error: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS_PER_ROOM}명)` };
    }
    if (room.players.some((p) => p.nickname === nickname && p.isConnected)) {
      return { error: '이미 사용 중인 닉네임입니다' };
    }

    room.players.push(createPlayer(playerId, nickname));
    this.playerRoom.set(playerId, roomId);
    return { room };
  }

  reconnect(playerId: string): RoomState | null {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;

    player.isConnected = true;
    player.disconnectedAt = null;
    return room;
  }

  handleDisconnect(playerId: string): void {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.isConnected = false;
    player.disconnectedAt = Date.now();

    if (!room.gameStarted) {
      setTimeout(() => {
        this.removeIfStillDisconnected(playerId, roomId);
      }, DISCONNECT_GRACE_MS);
    }
  }

  private removeIfStillDisconnected(playerId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.gameStarted) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isConnected) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    this.playerRoom.delete(playerId);

    if (room.players.length === 0) {
      this.stopAnimation(roomId);
      this.rooms.delete(roomId);
    } else if (room.hostId === playerId) {
      room.hostId = room.players.find((p) => p.isConnected)?.id ?? room.players[0].id;
    }
  }

  leaveRoom(playerId: string): void {
    const roomId = this.playerRoom.get(playerId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    this.playerRoom.delete(playerId);

    if (room.players.length === 0) {
      this.stopAnimation(roomId);
      this.rooms.delete(roomId);
    } else if (room.hostId === playerId) {
      room.hostId = room.players.find((p) => p.isConnected)?.id ?? room.players[0].id;
    }
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayer(playerId: string): RoomState | undefined {
    const roomId = this.playerRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getAllRooms(): { id: string; name: string; playerCount: number; maxPlayers: number; hostNickname: string }[] {
    return Array.from(this.rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.filter((p) => p.isConnected).length,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      hostNickname: r.players.find((p) => p.id === r.hostId)?.nickname ?? '',
    }));
  }

  startGame(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId || room.gameStarted) return false;
    if (room.players.filter((p) => p.isConnected).length < 2) return false;

    room.gameStarted = true;
    room.turnNumber = 1;
    this.startDrawingPhase(room);
    return true;
  }

  submitPath(roomId: string, playerId: string, rawPath: PricePoint[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'drawing') return false;

    const active = getActivePlayer(room);
    if (!active || active.id !== playerId) return false;

    if (rawPath.length < 2) return false;

    room.pricePath = normalizePath(rawPath, room.currentPrice);
    room.phase = 'betting';

    for (const p of room.players) {
      p.bettingReady = false;
    }

    return true;
  }

  placeBet(roomId: string, playerId: string, bet: BetRequest): string | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'betting') return '배팅 단계가 아닙니다';

    const active = getActivePlayer(room);
    if (active?.id === playerId) return '자신의 턴에는 배팅할 수 없습니다';

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isEliminated) return '플레이어를 찾을 수 없습니다';

    if (bet.margin < MIN_BET) return `최소 ${MIN_BET.toLocaleString()}원 이상 배팅해야 합니다`;
    if (bet.leverage < 1 || bet.leverage > MAX_LEVERAGE) return `레버리지는 1~${MAX_LEVERAGE}배까지 가능합니다`;
    if (bet.margin > player.balance) return '잔액이 부족합니다';

    player.balance -= bet.margin;
    const position: Position = {
      id: uuidv4(),
      type: bet.type,
      margin: bet.margin,
      leverage: bet.leverage,
      entryPrice: room.currentPrice,
      remainingMargin: bet.margin,
    };
    player.positions.push(position);
    player.bettingReady = false;

    return null;
  }

  setBettingReady(roomId: string, playerId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'betting') return '배팅 단계가 아닙니다';

    const active = getActivePlayer(room);
    if (active?.id === playerId) return '자신의 턴에는 배팅할 수 없습니다';

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isEliminated) return '플레이어를 찾을 수 없습니다';

    player.bettingReady = true;

    const bettors = room.players.filter(
      (p) => !p.isEliminated && p.id !== active?.id && p.isConnected
    );
    if (bettors.length === 0) {
      this.startAnimation(roomId);
      return null;
    }
    if (bettors.every((p) => p.bettingReady)) {
      this.startAnimation(roomId);
    }

    return null;
  }

  sellPosition(roomId: string, playerId: string, positionId: string, percentage: number): string | null {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'animating') return '애니메이션 중에만 매도할 수 있습니다';

    if (percentage < 10 || percentage > 100) return '매도 비율은 10%~100% 사이여야 합니다';

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isEliminated) return '플레이어를 찾을 수 없습니다';

    const position = player.positions.find((p) => p.id === positionId);
    if (!position) return '포지션을 찾을 수 없습니다';

    const sellRatio = percentage / 100;
    const soldMargin = position.remainingMargin * sellRatio;
    const pnl = calcUnrealizedPnl(
      { ...position, remainingMargin: soldMargin },
      room.currentPrice
    );

    player.balance += soldMargin + pnl;
    position.remainingMargin -= soldMargin;

    if (position.remainingMargin < 1) {
      player.positions = player.positions.filter((p) => p.id !== positionId);
    }

    this.checkElimination(player, room.currentPrice);
    return null;
  }

  private checkElimination(player: Player, currentPrice: number): void {
    const equity = calcTotalEquity(player, currentPrice);
    if (equity <= 0) {
      player.isEliminated = true;
      player.balance = 0;
      player.positions = [];
    }
  }

  private checkLiquidations(room: RoomState): void {
    for (const player of room.players) {
      if (player.isEliminated) continue;

      const toRemove: string[] = [];
      for (const position of player.positions) {
        const pnl = calcUnrealizedPnl(position, room.currentPrice);
        if (pnl <= -position.remainingMargin) {
          const cappedPnl = Math.max(pnl, -position.remainingMargin);
          player.balance += position.remainingMargin + cappedPnl;
          toRemove.push(position.id);
        }
      }
      player.positions = player.positions.filter((p) => !toRemove.includes(p.id));
      this.checkElimination(player, room.currentPrice);
    }
  }

  private startDrawingPhase(room: RoomState): void {
    room.phase = 'drawing';
    room.pricePath = [];
    room.animationProgress = 0;
    for (const p of room.players) {
      p.bettingReady = false;
    }
  }

  private startAnimation(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.phase = 'animating';
    room.animationProgress = 0;
    room.currentPrice = room.pricePath[0]?.price ?? room.currentPrice;

    this.stopAnimation(roomId);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const r = this.rooms.get(roomId);
      if (!r || r.phase !== 'animating') {
        this.stopAnimation(roomId);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION_MS);
      r.animationProgress = progress;

      const idx = Math.floor(progress * (r.pricePath.length - 1));
      r.currentPrice = r.pricePath[idx]?.price ?? r.currentPrice;

      this.checkLiquidations(r);

      if (progress >= 1) {
        this.stopAnimation(roomId);
        this.endTurn(roomId);
      }

      this.onRoomUpdate(roomId);
    }, 100);

    this.animationTimers.set(roomId, timer);
  }

  private endTurn(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const lastPrice = room.pricePath[room.pricePath.length - 1]?.price ?? room.currentPrice;
    room.currentPrice = lastPrice;

    for (const player of room.players) {
      this.checkElimination(player, room.currentPrice);
    }

    room.phase = 'turn_end';

    const activeCount = getActivePlayers(room).length;
    if (activeCount <= 1) {
      room.phase = 'waiting';
      return;
    }

    room.turnIndex = (room.turnIndex + 1) % activeCount;
    room.turnNumber += 1;

    setTimeout(() => {
      const r = this.rooms.get(roomId);
      if (!r) return;
      this.startDrawingPhase(r);
      this.onRoomUpdate(roomId);
    }, 3000);
  }

  private stopAnimation(roomId: string): void {
    const timer = this.animationTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.animationTimers.delete(roomId);
    }
  }

  forceNextPhase(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== requesterId) return false;
    if (room.phase === 'turn_end') {
      this.startDrawingPhase(room);
      return true;
    }
    return false;
  }
}
