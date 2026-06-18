export const STARTING_BALANCE = 10_000_000;
export const STARTING_PRICE = 1_000_000;
export const MIN_BET = 100_000;
export const MAX_LEVERAGE = 100;

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

export interface RoomListItem {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
}

export function formatKRW(amount: number): string {
  const sign = amount >= 0 ? '' : '-';
  return `${sign}₩${Math.abs(Math.round(amount)).toLocaleString('ko-KR')}`;
}

export function formatPrice(price: number): string {
  return `₩${Math.round(price).toLocaleString('ko-KR')}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
