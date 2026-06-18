import { useState, useEffect } from 'react';
import { socketService, getInviteLink } from '../socket';
import { PublicRoomState, formatKRW, formatPrice, MAX_TURNS, STARTING_BALANCE, STARTING_PRICE, MIN_BET, isBettingPhase, ChatMessage } from '../types';
import TradingChart from './TradingChart';
import DrawingCanvas from './DrawingCanvas';
import BettingPanel from './BettingPanel';
import SellPanel from './SellPanel';
import PlayerList from './PlayerList';
import OrderBook from './OrderBook';
import TradeHistory from './TradeHistory';
import PlayerAssetsBar from './PlayerAssetsBar';
import ChatPanel from './ChatPanel';

interface Props {
  room: PublicRoomState;
  playerId: string;
  error: string | null;
  chatMessages: ChatMessage[];
  onDismissError: () => void;
  onLeave: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  waiting: '대기 중',
  drawing: '그래프 그리기 & 배팅',
  betting: '그래프 그리기 & 배팅',
  animating: '거래 진행 중',
  turn_end: '턴 종료',
  game_end: '게임 종료',
};

export default function GameRoom({ room, playerId, error, chatMessages, onDismissError, onLeave }: Props) {
  const [sidePanel, setSidePanel] = useState<'trade' | 'sell'>('trade');
  const [copied, setCopied] = useState(false);
  const [showDrawTurnBanner, setShowDrawTurnBanner] = useState(false);
  const [pathSubmitting, setPathSubmitting] = useState(false);

  const inviteLink = getInviteLink(room.id);

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const me = room.players.find((p) => p.id === playerId);
  const isHost = room.hostId === playerId;
  const isActivePlayer = room.activePlayerId === playerId;
  const isEliminated = me?.isEliminated ?? false;
  const isSpectator = isEliminated;

  const handleSubmitPath = (path: { t: number; price: number }[]) => {
    setPathSubmitting(true);
    socketService.submitPath(room.id, path);
  };

  const handleBet = (type: 'long' | 'short', margin: number, leverage: number) => {
    socketService.placeBet(room.id, { type, margin, leverage });
  };

  const handleReady = () => {
    socketService.bettingReady(room.id);
  };

  const handleSell = (positionId: string, percentage: number) => {
    socketService.sellPosition(room.id, positionId, percentage);
  };

  const handleStartGame = () => {
    socketService.startGame(room.id);
  };

  const handleDeleteRoom = () => {
    if (confirm('방을 삭제하시겠습니까?')) {
      socketService.deleteRoom(room.id);
    }
  };

  const turnBetTotal = (me?.positions ?? [])
    .filter((p) => p.turnNumber === room.turnNumber)
    .reduce((sum, p) => sum + p.margin, 0);

  const maxTurns = room.maxTurns ?? MAX_TURNS;
  const startingBalance = room.startingBalance ?? STARTING_BALANCE;
  const bettingPhase = isBettingPhase(room.phase);
  const isAnimating = room.phase === 'animating';

  const showDrawing = bettingPhase && isActivePlayer && !isSpectator && !room.pathSubmitted;
  const waitingForBettors = bettingPhase && isActivePlayer && room.pathSubmitted;
  const requiredBettors = room.players.filter((p) => {
    if (p.isEliminated || !p.isConnected || p.id === room.activePlayerId) return false;
    const turnBet = (p.positions ?? [])
      .filter((pos) => pos.turnNumber === room.turnNumber)
      .reduce((sum, pos) => sum + pos.margin, 0);
    return turnBet >= MIN_BET || p.balance >= MIN_BET;
  });
  const showPreBetting =
    bettingPhase &&
    !isActivePlayer &&
    !isSpectator &&
    (me?.balance ?? 0) >= MIN_BET;
  const showLiveTrading =
    isAnimating &&
    !isActivePlayer &&
    !isSpectator &&
    (me?.balance ?? 0) >= MIN_BET;
  const canSell = isAnimating && !isSpectator && !isActivePlayer;
  const winner = room.winnerId ? room.players.find((p) => p.id === room.winnerId) : null;

  useEffect(() => {
    if (bettingPhase) {
      setSidePanel('trade');
    } else if (isAnimating && !isActivePlayer && (me?.positions.length ?? 0) > 0) {
      setSidePanel('sell');
    }
  }, [bettingPhase, isAnimating, room.turnNumber, me?.positions.length]);

  useEffect(() => {
    if (room.pathSubmitted || room.phase !== 'drawing') {
      setPathSubmitting(false);
    }
  }, [room.pathSubmitted, room.phase]);

  useEffect(() => {
    if (!showDrawing) {
      setShowDrawTurnBanner(false);
      return;
    }

    setShowDrawTurnBanner(true);
    const timer = setTimeout(() => setShowDrawTurnBanner(false), 2000);
    return () => clearTimeout(timer);
  }, [showDrawing, room.turnNumber]);

  return (
    <div className="flex h-full flex-col relative">
      {/* 내 차례 — 그래프 그리기 대형 알림 */}
      {showDrawing && showDrawTurnBanner && (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <div className="animate-pulse-glow mx-4 mt-4 rounded-2xl border-4 border-[var(--color-accent-yellow)] bg-[var(--color-accent-yellow)]/15 px-8 py-6 text-center backdrop-blur-sm">
            <h2 className="text-3xl font-black text-[var(--color-accent-yellow)] md:text-4xl">
              🎨 당신의 턴! 그래프를 그려주세요
            </h2>
            <p className="mt-2 text-base font-semibold text-white md:text-lg">
              24시간 가격 경로를 마우스로 그린 뒤 <span className="text-[var(--color-accent-yellow)]">완료</span> 버튼 클릭
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">±50% 범위 · 다른 플레이어는 동시 배팅 중</p>
          </div>
        </div>
      )}

      {bettingPhase && !isActivePlayer && !isSpectator && room.pathSubmitted && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="mx-4 mt-4 rounded-xl border-2 border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/15 px-6 py-4 text-center backdrop-blur-sm">
            <p className="text-xl font-bold text-[var(--color-accent-green)] md:text-2xl">
              그래프 제출됨 — 배팅 후 완료 버튼을 눌러주세요!
            </p>
          </div>
        </div>
      )}

      {bettingPhase && !isActivePlayer && !isSpectator && !room.pathSubmitted && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="mx-4 mt-4 rounded-xl border-2 border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/15 px-6 py-4 text-center backdrop-blur-sm">
            <p className="text-xl font-bold text-white md:text-2xl">
              <span className="text-[var(--color-accent-yellow)]">
                {room.players.find((p) => p.id === room.activePlayerId)?.nickname}
              </span>
              님이 그래프 그리는 중 — 지금 배팅하세요!
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">최소 10만원 필수 · 스킵 불가</p>
          </div>
        </div>
      )}

      <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-yellow)]">
              <span className="text-sm font-bold text-black">₿</span>
            </div>
            <div>
              <h1 className="text-sm font-bold">{room.name}</h1>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                턴 {room.turnNumber}/{maxTurns}
                {room.activePlayerId && bettingPhase && (
                  <span className="text-[var(--color-accent-yellow)]">
                    {' '}· {room.players.find((p) => p.id === room.activePlayerId)?.nickname} 그리는 중
                  </span>
                )}
                {room.phase !== 'drawing' && room.phase !== 'betting' && ` · ${PHASE_LABELS[room.phase] ?? room.phase}`}
              </p>
            </div>
          </div>

          {room.phase !== 'waiting' && (
            <div className="hidden items-center gap-2 rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-1.5 sm:flex">
              <span className="text-[10px] text-[var(--color-text-secondary)]">BTC 현재가</span>
              <span className="font-mono text-sm font-bold text-[var(--color-accent-yellow)]">
                {formatPrice(room.currentPrice)}
              </span>
            </div>
          )}

          {room.phase === 'animating' && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent-yellow)] transition-all duration-200"
                  style={{ width: `${room.animationProgress * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                {Math.round(room.animationProgress * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {me && (
            <div className="mr-2 hidden text-right sm:block">
              <span className="text-[10px] text-[var(--color-text-secondary)]">{me.nickname} · 보유자산</span>
              <p className="font-mono text-sm font-bold" title={formatKRW(me.totalEquity)}>
                {formatKRW(me.totalEquity)}
              </p>
            </div>
          )}

          {isHost && !room.gameStarted && (
            <>
              <button
                onClick={copyInviteLink}
                className="rounded-lg border border-[var(--color-accent-yellow)] px-3 py-2 text-xs text-[var(--color-accent-yellow)] transition hover:bg-[var(--color-accent-yellow)]/10"
              >
                {copied ? '링크 복사됨!' : '친구 초대'}
              </button>
              <button
                onClick={handleStartGame}
                disabled={room.players.filter((p) => p.isConnected).length < 2}
                className="rounded-lg bg-[var(--color-accent-green)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                게임 시작
              </button>
            </>
          )}

          {isHost && (
            <button
              onClick={handleDeleteRoom}
              className="rounded-lg border border-[var(--color-accent-red)]/50 px-3 py-2 text-xs text-[var(--color-accent-red)] transition hover:bg-[var(--color-accent-red)]/10"
            >
              방 삭제
            </button>
          )}

          <button
            onClick={onLeave}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs transition hover:bg-[var(--color-bg-hover)]"
          >
            나가기
          </button>
        </div>
      </header>

      <PlayerAssetsBar
        players={room.players}
        activePlayerId={room.activePlayerId}
        currentPlayerId={playerId}
        hostId={room.hostId}
        startingBalance={startingBalance}
      />

      {error && (
        <div className="mx-4 mt-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-2">
            <span className="text-xs text-[var(--color-accent-red)]">{error}</span>
            <button onClick={onDismissError} className="text-[var(--color-accent-red)]">✕</button>
          </div>
        </div>
      )}

      {isSpectator && (
        <div className="mx-4 mt-2 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/5 px-4 py-2 text-center text-xs text-[var(--color-accent-red)]">
          탈락했습니다. 관전 모드로 게임을 지켜볼 수 있습니다.
        </div>
      )}

      {isAnimating && (
        <div className="mx-4 mt-2 rounded-lg border border-[var(--color-accent-green)]/30 bg-[var(--color-accent-green)]/5 px-4 py-2 text-center text-xs">
          <span className="font-semibold text-[var(--color-accent-green)]">
            📈 그래프 진행 중 ({Math.round(room.animationProgress * 100)}%) — 다른 플레이어는 실시간 추가 매수·매도 가능 (약 75초)
          </span>
        </div>
      )}

      {room.phase === 'turn_end' && (
        <div className="mx-4 mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-center text-xs text-[var(--color-text-secondary)]">
          {room.turnNumber >= maxTurns ? '마지막 턴 종료! 결과 집계 중...' : '턴 종료! 다음 턴 준비 중...'}
        </div>
      )}

      {room.phase === 'game_end' && winner && (
        <div className="mx-4 mt-2 rounded-lg border border-[var(--color-accent-yellow)]/50 bg-[var(--color-accent-yellow)]/10 px-4 py-3 text-center">
          <p className="text-lg font-bold text-[var(--color-accent-yellow)]">🏆 게임 종료!</p>
          <p className="mt-1 text-sm">
            우승: <span className="font-bold">{winner.nickname}</span> ({formatKRW(winner.totalEquity)})
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chart area */}
        <div className="flex flex-1 flex-col min-w-0">
          {room.phase === 'game_end' ? (
            <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-secondary)]">
              <div className="rounded-xl border border-[var(--color-accent-yellow)]/40 p-8 text-center">
                <p className="text-4xl">🏆</p>
                <h2 className="mt-4 text-xl font-bold">{maxTurns}턴 종료!</h2>
                {winner ? (
                  <>
                    <p className="mt-4 text-2xl font-bold text-[var(--color-accent-yellow)]">{winner.nickname} 승리</p>
                    <p className="mt-2 font-mono text-lg">{formatKRW(winner.totalEquity)}</p>
                  </>
                ) : (
                  <p className="mt-4 text-[var(--color-text-secondary)]">우승자 없음</p>
                )}
                <div className="mt-8 space-y-2 text-left">
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)]">최종 순위</p>
                  {[...room.players]
                    .sort((a, b) => b.totalEquity - a.totalEquity)
                    .map((p, i) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span>{i + 1}. {p.nickname} {p.id === playerId && '(나)'}</span>
                        <span className="font-mono">{formatKRW(p.totalEquity)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : room.phase === 'waiting' && !room.gameStarted ? (
            <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-secondary)]">
              <div className="rounded-xl border border-[var(--color-border)] p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-yellow)]/10">
                  <span className="text-3xl">₿</span>
                </div>
                <h2 className="text-lg font-bold">플레이어 대기 중</h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {room.players.filter((p) => p.isConnected).length}/{room.maxPlayers}명 접속 / 최소 2명 필요
                </p>
                <p className="mt-1 text-xs text-[var(--color-accent-yellow)]">
                  시작 자본금 {formatKRW(startingBalance)} · BTC 시작가 {formatPrice(STARTING_PRICE)}
                </p>
                <div className="mt-6 space-y-2">
                  {room.players.map((p) => (
                    <div key={p.id} className="text-sm text-[var(--color-text-secondary)]">
                      {p.nickname} {p.id === room.hostId && '👑'}
                    </div>
                  ))}
                </div>
                {isHost && (
                  <p className="mt-6 text-xs text-[var(--color-accent-yellow)]">
                    상단의 게임 시작 버튼을 눌러주세요
                  </p>
                )}
              </div>
            </div>
          ) : showDrawing ? (
            <DrawingCanvas
              minPrice={room.minPrice}
              maxPrice={room.maxPrice}
              currentPrice={room.currentPrice}
              onSubmit={handleSubmitPath}
              submitted={room.pathSubmitted}
              submitting={pathSubmitting}
            />
          ) : waitingForBettors ? (
            <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-secondary)]">
              <div className="rounded-xl border border-[var(--color-accent-yellow)]/40 bg-[var(--color-accent-yellow)]/5 p-8 text-center max-w-md">
                <p className="text-3xl">✓</p>
                <h2 className="mt-3 text-xl font-bold text-[var(--color-accent-yellow)]">그래프 제출 완료!</h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  다른 플레이어가 배팅하고 <span className="text-white">배팅 완료</span> 버튼을 누르면 그래프가 시작됩니다
                </p>
                <div className="mt-6 space-y-2 text-left">
                  {requiredBettors.length === 0 ? (
                    <p className="text-center text-sm text-[var(--color-accent-green)]">곧 그래프가 시작됩니다...</p>
                  ) : (
                    requiredBettors.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                      >
                        <span>{p.nickname}</span>
                        <span
                          className={
                            p.bettingReady
                              ? 'text-[var(--color-accent-green)]'
                              : 'text-[var(--color-text-secondary)]'
                          }
                        >
                          {p.bettingReady ? '✓ 배팅 완료' : '배팅 대기 중...'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0">
              <div className="flex flex-1 flex-col min-w-0">
                <TradingChart
                  currentPrice={room.currentPrice}
                  pricePath={room.pricePath}
                  animationProgress={room.animationProgress}
                  phase={room.phase}
                  minPrice={room.minPrice}
                  maxPrice={room.maxPrice}
                  isAnimating={room.phase === 'animating'}
                />
              </div>
              {room.gameStarted && (
                <div className="hidden w-48 flex-col border-l border-[var(--color-border)] xl:flex">
                  <div className="flex-1 min-h-0 border-b border-[var(--color-border)]">
                    <OrderBook currentPrice={room.currentPrice} />
                  </div>
                  <div className="flex-1 min-h-0">
                    <TradeHistory currentPrice={room.currentPrice} />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right sidebar */}
        <div className="flex w-80 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {/* Tab switcher during animating */}
          {room.gameStarted && (
            <div className="flex border-b border-[var(--color-border)]">
              <button
                onClick={() => setSidePanel('trade')}
                className={`flex-1 py-2.5 text-xs font-medium transition ${
                  sidePanel === 'trade'
                    ? 'border-b-2 border-[var(--color-accent-yellow)] text-[var(--color-accent-yellow)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {isAnimating ? '매수' : bettingPhase ? '배팅' : '정보'}
              </button>
              <button
                onClick={() => setSidePanel('sell')}
                className={`flex-1 py-2.5 text-xs font-medium transition ${
                  sidePanel === 'sell'
                    ? 'border-b-2 border-[var(--color-accent-yellow)] text-[var(--color-accent-yellow)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                매도
                {(me?.positions.length ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-[var(--color-accent-yellow)] px-1.5 text-[9px] text-black">
                    {me!.positions.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {room.phase === 'waiting' && !room.gameStarted ? (
              <PlayerList
                players={room.players}
                activePlayerId={room.activePlayerId}
                currentPlayerId={playerId}
                hostId={room.hostId}
              />
            ) : showPreBetting && sidePanel === 'trade' ? (
              <BettingPanel
                balance={me?.balance ?? 0}
                turnBetTotal={turnBetTotal}
                onBet={handleBet}
                onReady={handleReady}
                bettingReady={me?.bettingReady}
              />
            ) : showLiveTrading && sidePanel === 'trade' ? (
              <BettingPanel
                balance={me?.balance ?? 0}
                turnBetTotal={turnBetTotal}
                onBet={handleBet}
                onReady={handleReady}
                liveTrading
              />
            ) : waitingForBettors ? (
              <div className="p-4">
                <p className="text-center text-sm font-semibold text-[var(--color-accent-yellow)]">배팅 대기 중</p>
                <p className="mt-2 text-center text-xs text-[var(--color-text-secondary)]">
                  다른 플레이어가 최소 10만원 배팅 후 완료 버튼을 눌러야 합니다
                </p>
                <div className="mt-4 space-y-2">
                  {requiredBettors.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span>{p.nickname}</span>
                      <span className={p.bettingReady ? 'text-[var(--color-accent-green)]' : ''}>
                        {p.bettingReady ? '완료' : '대기'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : bettingPhase && isActivePlayer ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                <p>그래프를 완료해주세요</p>
                <p className="mt-2 text-xs">그리는 동안은 배팅 불가</p>
              </div>
            ) : isAnimating && isActivePlayer ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                <p>그래프를 그린 턴입니다</p>
                <p className="mt-2 text-xs">결과를 알고 있어 매수·매도 불가 · 관전만 가능</p>
              </div>
            ) : isAnimating && sidePanel === 'sell' && canSell && (me?.positions.length ?? 0) > 0 ? (
              <SellPanel
                positions={me?.positions ?? []}
                currentPrice={room.currentPrice}
                onSell={handleSell}
              />
            ) : bettingPhase && !isActivePlayer && !isSpectator && (me?.balance ?? 0) < MIN_BET ? (
              <div className="p-4 text-center text-sm text-[var(--color-accent-red)]">
                잔액 부족 (10만원 미만) — 이번 턴 배팅 불가
              </div>
            ) : isAnimating && sidePanel === 'sell' && !isSpectator && (me?.positions.length ?? 0) === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">보유 포지션 없음</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">매수 탭에서 추가 매수 가능</p>
              </div>
            ) : isAnimating && sidePanel === 'trade' && !isSpectator && (me?.balance ?? 0) < MIN_BET ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">
                잔액 부족 (10만원 미만) — 추가 매수 불가
              </div>
            ) : isSpectator ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-secondary)]">관전 중...</div>
            ) : (
              <PlayerList
                players={room.players}
                activePlayerId={room.activePlayerId}
                currentPlayerId={playerId}
                hostId={room.hostId}
              />
            )}
          </div>

          {/* Positions summary at bottom */}
          {me && me.positions.length > 0 && isAnimating && (
            <div className="border-t border-[var(--color-border)] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">내 포지션</span>
                <span
                  className={`font-mono font-bold ${
                    me.unrealizedPnl >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'
                  }`}
                >
                  {me.unrealizedPnl >= 0 ? '+' : ''}{formatKRW(me.unrealizedPnl)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <ChatPanel
        messages={chatMessages}
        currentPlayerId={playerId}
        onSend={(message) => socketService.sendChat(room.id, message)}
      />
    </div>
  );
}
