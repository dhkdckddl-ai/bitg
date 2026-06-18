export const STARTING_BALANCE = 10_000_000;
export const STARTING_PRICE = 1_000_000;
export const MIN_BET = 100_000;
export const MAX_LEVERAGE = 100;
export const MAX_PRICE_CHANGE = 0.5;
export const ANIMATION_DURATION_MS = 60_000;
export const PRICE_POINTS = 240;
export const MAX_PLAYERS_PER_ROOM = 8;
export const DISCONNECT_GRACE_MS = 5 * 60 * 1000;

export type GamePhase = 'waiting' | 'drawing' | 'betting' | 'animating' | 'turn_end';

export type PositionType = 'long' | 'short';

export interface PricePoint {
  t: number;
  price: number;
}

export interface Position {
  id: string;
  type: PositionType;
  margin: number;
  leverage: number;
  entryPrice: number;
  remainingMargin: number;
}

export interface Player {
  id: string;
  nickname: string;
  balance: number;
  isEliminated: boolean;
  positions: Position[];
  bettingReady: boolean;
  isConnected: boolean;
  disconnectedAt: number | null;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  turnIndex: number;
  currentPrice: number;
  pricePath: PricePoint[];
  animationProgress: number;
  turnNumber: number;
  gameStarted: boolean;
  createdAt: number;
}

export interface BetRequest {
  type: PositionType;
  margin: number;
  leverage: number;
}

export interface SellRequest {
  positionId: string;
  percentage: number;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  balance: number;
  isEliminated: boolean;
  positions: Position[];
  bettingReady: boolean;
  unrealizedPnl: number;
  totalEquity: number;
  isConnected: boolean;
}

export interface PublicRoomState {
  id: string;
  name: string;
  hostId: string;
  players: PublicPlayer[];
  phase: GamePhase;
  turnIndex: number;
  activePlayerId: string | null;
  currentPrice: number;
  pricePath: PricePoint[];
  animationProgress: number;
  turnNumber: number;
  gameStarted: boolean;
  minPrice: number;
  maxPrice: number;
  maxPlayers: number;
}
