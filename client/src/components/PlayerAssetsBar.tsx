import { PublicPlayer, formatKRW, canPlayerParticipate } from '../types';

interface Props {
  players: PublicPlayer[];
  activePlayerId: string | null;
  currentPlayerId: string;
  hostId: string;
  startingBalance: number;
  turnNumber: number;
}

export default function PlayerAssetsBar({
  players,
  activePlayerId,
  currentPlayerId,
  hostId,
  startingBalance,
  turnNumber,
}: Props) {
  const sorted = [...players].sort((a, b) => b.totalEquity - a.totalEquity);

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          실시간 총자산
        </span>
        <span className="text-[10px] text-[var(--color-text-secondary)]">순위 · 보유자산</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {sorted.map((player, idx) => {
          const isMe = player.id === currentPlayerId;
          const isActive = player.id === activePlayerId;
          const isHost = player.id === hostId;
          const pnl = player.totalEquity - startingBalance;
          const pnlPct = startingBalance > 0 ? (pnl / startingBalance) * 100 : 0;

          const isWaiting = !canPlayerParticipate(player, turnNumber);

          return (
            <div
              key={player.id}
              className={`flex min-w-[140px] shrink-0 flex-col rounded-lg border px-3 py-2 transition ${
                isMe
                  ? 'border-[var(--color-accent-yellow)]/50 bg-[var(--color-accent-yellow)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)]'
              } ${player.isEliminated ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">#{idx + 1}</span>
                <span className={`truncate text-xs font-semibold ${isMe ? 'text-[var(--color-accent-yellow)]' : ''}`}>
                  {player.nickname}
                  {isMe && ' (나)'}
                  {isHost && ' 👑'}
                </span>
                {isActive && (
                  <span className="rounded bg-[var(--color-accent-yellow)] px-1 py-0.5 text-[8px] font-bold text-black">
                    TURN
                  </span>
                )}
                {isWaiting && !player.isEliminated && (
                  <span className="rounded bg-[var(--color-accent-blue)]/20 px-1 py-0.5 text-[8px] text-[var(--color-accent-blue)]">
                    T{player.joinsFromTurn}
                  </span>
                )}
              </div>
              <span className="mt-1 font-mono text-sm font-bold">{formatKRW(player.totalEquity)}</span>
              {!player.isEliminated && pnl !== 0 && (
                <span
                  className={`font-mono text-[10px] ${
                    pnl >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'
                  }`}
                >
                  {pnl >= 0 ? '+' : ''}{formatKRW(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                </span>
              )}
              {player.isEliminated && (
                <span className="text-[10px] text-[var(--color-accent-red)]">탈락</span>
              )}
              {!player.isConnected && !player.isEliminated && (
                <span className="text-[10px] text-[var(--color-text-secondary)]">오프라인</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
