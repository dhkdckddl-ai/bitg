export const STARTING_BALANCE = 10_000_000;
export const STARTING_PRICE = 1_000_000;
export const MIN_BET = 100_000;
export const MAX_LEVERAGE = 100;
export const MAX_TURNS = 10;

export type GamePhase = 'waiting' | 'drawing' | 'betting' | 'animating' | 'turn_end' | 'game_end';

export function isBettingPhase(phase: string): boolean {
  return phase === 'drawing' || phase === 'betting';
}

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
  turnNumber?: number;
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
  joinsFromTurn: number;
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
  maxTurns: number;
  startingBalance: number;
  winnerId: string | null;
  pathSubmitted: boolean;
}

export interface RoomListItem {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
  gameStarted: boolean;
  turnNumber: number;
  maxTurns: number;
}

export function canPlayerParticipate(
  player: Pick<PublicPlayer, 'isEliminated' | 'joinsFromTurn'>,
  turnNumber: number
): boolean {
  const fromTurn = player.joinsFromTurn ?? 1;
  return !player.isEliminated && fromTurn <= turnNumber;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
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
