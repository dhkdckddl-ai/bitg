import { PublicPlayer, formatKRW, canPlayerParticipate } from '../types';

interface Props {
  players: PublicPlayer[];
  activePlayerId: string | null;
  currentPlayerId: string;
  hostId: string;
  turnNumber: number;
}

export default function PlayerList({ players, activePlayerId, currentPlayerId, hostId, turnNumber }: Props) {
  const sorted = [...players].sort((a, b) => b.totalEquity - a.totalEquity);

  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">플레이어 ({players.length})</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((player, idx) => {
          const isActive = player.id === activePlayerId;
          const isMe = player.id === currentPlayerId;
          const isHost = player.id === hostId;

          const isWaiting = !canPlayerParticipate(player, turnNumber);

          return (
            <div
              key={player.id}
              className={`border-b border-[var(--color-border)] px-4 py-3 transition ${
                isActive ? 'bg-[var(--color-accent-yellow)]/5' : ''
              } ${player.isEliminated || isWaiting ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--color-text-secondary)]">
                  {idx + 1}
                </span>
                <span className={`text-sm font-medium ${isMe ? 'text-[var(--color-accent-yellow)]' : ''}`}>
                  {player.nickname}
                  {isMe && ' (나)'}
                  {isHost && ' 👑'}
                </span>
                {isActive && (
                  <span className="rounded bg-[var(--color-accent-yellow)] px-1.5 py-0.5 text-[9px] font-bold text-black">
                    TURN
                  </span>
                )}
                {player.isEliminated && (
                  <span className="rounded bg-[var(--color-accent-red)]/20 px-1.5 py-0.5 text-[9px] text-[var(--color-accent-red)]">
                    탈락
                  </span>
                )}
                {isWaiting && !player.isEliminated && (
                  <span className="rounded bg-[var(--color-accent-blue)]/20 px-1.5 py-0.5 text-[9px] text-[var(--color-accent-blue)]">
                    턴{player.joinsFromTurn} 참여
                  </span>
                )}
                {!player.isConnected && !player.isEliminated && (
                  <span className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-secondary)]">
                    오프라인
                  </span>
                )}
                {player.bettingReady && !player.isEliminated && (
                  <span className="text-[var(--color-accent-green)] text-xs">✓</span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between pl-7">
                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                  {formatKRW(player.totalEquity)}
                </span>
                {player.unrealizedPnl !== 0 && (
                  <span
                    className={`font-mono text-[10px] ${
                      player.unrealizedPnl >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'
                    }`}
                  >
                    {player.unrealizedPnl >= 0 ? '+' : ''}{formatKRW(player.unrealizedPnl)}
                  </span>
                )}
              </div>
              {player.positions.length > 0 && (
                <div className="mt-1 pl-7">
                  {player.positions.map((pos) => (
                    <div key={pos.id} className="text-[10px] text-[var(--color-text-secondary)]">
                      {pos.type === 'long' ? '🟢' : '🔴'} {pos.leverage}x · {formatKRW(pos.remainingMargin)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
