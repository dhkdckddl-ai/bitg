import { useState } from 'react';
import { Position } from '../types';
import { formatKRW, formatPercent } from '../types';

interface Props {
  positions: Position[];
  currentPrice: number;
  onSell: (positionId: string, percentage: number) => void;
  disabled?: boolean;
}

function calcPnl(position: Position, currentPrice: number): number {
  const notional = position.remainingMargin * position.leverage;
  let pnl: number;
  if (position.type === 'long') {
    pnl = (notional * (currentPrice - position.entryPrice)) / position.entryPrice;
  } else {
    pnl = (notional * (position.entryPrice - currentPrice)) / position.entryPrice;
  }
  return Math.max(pnl, -position.remainingMargin);
}

function calcPnlPercent(position: Position, currentPrice: number): number {
  const pnl = calcPnl(position, currentPrice);
  return (pnl / position.remainingMargin) * 100;
}

export default function SellPanel({ positions, currentPrice, onSell, disabled }: Props) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(
    positions[0]?.id ?? null
  );
  const [sellPercent, setSellPercent] = useState(100);

  const position = positions.find((p) => p.id === selectedPosition);

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">보유 포지션이 없습니다</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          배팅 단계에서 매수하거나, 매도하지 않은 포지션이 여기 표시됩니다
        </p>
      </div>
    );
  }

  const pnl = position ? calcPnl(position, currentPrice) : 0;
  const pnlPct = position ? calcPnlPercent(position, currentPrice) : 0;
  const isProfit = pnl >= 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">포지션 매도</h3>

      {disabled && (
        <div className="rounded-lg border border-[var(--color-accent-yellow)]/30 bg-[var(--color-accent-yellow)]/5 p-3 text-xs text-[var(--color-accent-yellow)]">
          자신이 그린 턴에는 매도할 수 없습니다
        </div>
      )}

      <div className="space-y-2">
        {positions.map((pos) => {
          const posPnl = calcPnl(pos, currentPrice);
          const posPnlPct = calcPnlPercent(pos, currentPrice);
          const isSelected = pos.id === selectedPosition;

          return (
            <button
              key={pos.id}
              onClick={() => setSelectedPosition(pos.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-[var(--color-accent-yellow)] bg-[var(--color-bg-tertiary)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${pos.type === 'long' ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                  {pos.type === 'long' ? 'LONG' : 'SHORT'} {pos.leverage}x
                </span>
                <span className={`font-mono text-xs ${posPnl >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                  {formatPercent(posPnlPct)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-secondary)]">
                <span>증거금: {formatKRW(pos.remainingMargin)}</span>
                <span className={posPnl >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}>
                  {formatKRW(posPnl)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {position && (
        <>
          <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-3">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">미실현 손익</span>
              <span className={`font-mono font-bold ${isProfit ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                {formatKRW(pnl)} ({formatPercent(pnlPct)})
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">진입가</span>
              <span className="font-mono">{formatKRW(position.entryPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">현재가</span>
              <span className="font-mono">{formatKRW(currentPrice)}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-[var(--color-text-secondary)]">매도 비율</label>
              <span className="font-mono text-sm font-bold">{sellPercent}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={sellPercent}
              onChange={(e) => setSellPercent(Number(e.target.value))}
              disabled={disabled}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-secondary)]">
              <span>10%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <div className="mt-2 flex gap-1">
              {[10, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSellPercent(pct)}
                  disabled={disabled}
                  className={`flex-1 rounded py-1 text-[10px] transition ${
                    sellPercent === pct
                      ? 'bg-[var(--color-accent-yellow)] text-black font-bold'
                      : 'border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSell(position.id, sellPercent)}
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-accent-yellow)] py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {sellPercent}% 매도 ({formatKRW(position.remainingMargin * sellPercent / 100 + pnl * sellPercent / 100)})
          </button>
        </>
      )}
    </div>
  );
}
