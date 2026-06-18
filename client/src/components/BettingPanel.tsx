import { useState } from 'react';
import { MIN_BET, MAX_LEVERAGE, formatKRW } from '../types';

interface Props {
  balance: number;
  turnBetTotal: number;
  onBet: (type: 'long' | 'short', margin: number, leverage: number) => void;
  onReady: () => void;
  disabled?: boolean;
  bettingReady?: boolean;
  liveTrading?: boolean;
}

export default function BettingPanel({
  balance,
  turnBetTotal,
  onBet,
  onReady,
  disabled,
  bettingReady,
  liveTrading = false,
}: Props) {
  const [betType, setBetType] = useState<'long' | 'short'>('long');
  const [margin, setMargin] = useState(MIN_BET);
  const [leverage, setLeverage] = useState(1);

  const notional = margin * leverage;
  const liquidationPct = (100 / leverage).toFixed(1);
  const canReady = turnBetTotal >= MIN_BET && !bettingReady;
  const remainingRequired = Math.max(0, MIN_BET - turnBetTotal);

  const handleBet = () => {
    if (margin < MIN_BET || margin > balance) return;
    onBet(betType, margin, leverage);
  };

  const quickAmounts = [100_000, 500_000, 1_000_000, 3_000_000, 5_000_000];

  return (
    <div className="flex flex-col gap-4 p-4">
      {liveTrading ? (
        <div className="rounded-lg border border-[var(--color-accent-green)]/30 bg-[var(--color-accent-green)]/5 p-3 text-xs">
          <p className="font-semibold text-[var(--color-accent-green)]">실시간 매매</p>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            그래프가 그려지는 동안 언제든 추가 매수·매도 가능합니다
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-accent-yellow)]/30 bg-[var(--color-accent-yellow)]/5 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">이번 턴 배팅액</span>
            <span className={`font-mono font-bold ${turnBetTotal >= MIN_BET ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
              {formatKRW(turnBetTotal)} / {formatKRW(MIN_BET)}
            </span>
          </div>
          {remainingRequired > 0 && (
            <p className="mt-1 text-[var(--color-accent-red)]">
              {formatKRW(remainingRequired)} 더 배팅해야 완료 가능
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-[var(--color-bg-tertiary)] p-1">
        <button
          onClick={() => setBetType('long')}
          disabled={disabled}
          className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
            betType === 'long'
              ? 'bg-[var(--color-accent-green)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          롱 (Long)
        </button>
        <button
          onClick={() => setBetType('short')}
          disabled={disabled}
          className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
            betType === 'short'
              ? 'bg-[var(--color-accent-red)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          숏 (Short)
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs text-[var(--color-text-secondary)]">배팅 금액</label>
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">
            잔액: {formatKRW(balance)}
          </span>
        </div>
        <input
          type="range"
          min={MIN_BET}
          max={Math.max(MIN_BET, balance)}
          step={10_000}
          value={Math.min(margin, Math.max(MIN_BET, balance))}
          onChange={(e) => setMargin(Number(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="mt-1 flex items-center justify-between">
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(Math.max(MIN_BET, Number(e.target.value)))}
            disabled={disabled}
            min={MIN_BET}
            max={balance}
            step={10_000}
            className="w-32 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 font-mono text-sm outline-none focus:border-[var(--color-accent-yellow)]"
          />
          <span className="font-mono text-sm">{formatKRW(margin)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setMargin(Math.min(amt, balance))}
              disabled={disabled || amt > balance}
              className="rounded border border-[var(--color-border)] px-2 py-1 text-[10px] transition hover:bg-[var(--color-bg-hover)] disabled:opacity-30"
            >
              {(amt / 10000).toFixed(0)}만
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs text-[var(--color-text-secondary)]">레버리지</label>
          <span className="font-mono text-sm font-bold text-[var(--color-accent-yellow)]">{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={MAX_LEVERAGE}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-secondary)]">
          <span>1x</span>
          <span>청산: ±{liquidationPct}%</span>
          <span>{MAX_LEVERAGE}x</span>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-3 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-secondary)]">포지션 규모</span>
          <span className="font-mono">{formatKRW(notional)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[var(--color-text-secondary)]">청산까지</span>
          <span className="font-mono text-[var(--color-accent-red)]">±{liquidationPct}%</span>
        </div>
      </div>

      <button
        onClick={handleBet}
        disabled={disabled || margin < MIN_BET || margin > balance}
        className={`w-full rounded-lg py-3 text-sm font-bold transition disabled:opacity-40 ${
          betType === 'long'
            ? 'bg-[var(--color-accent-green)] text-white hover:brightness-110'
            : 'bg-[var(--color-accent-red)] text-white hover:brightness-110'
        }`}
      >
        {betType === 'long' ? (liveTrading ? '롱 추가 매수' : '롱 매수') : (liveTrading ? '숏 추가 매수' : '숏 매수')}
      </button>

      {!liveTrading && (
        <button
          onClick={onReady}
          disabled={disabled || !canReady}
          className={`w-full rounded-lg border py-3 text-sm font-semibold transition ${
            bettingReady
              ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]'
              : 'border-[var(--color-accent-yellow)] text-[var(--color-accent-yellow)] hover:bg-[var(--color-accent-yellow)]/10'
          } disabled:opacity-40`}
        >
          {bettingReady ? '✓ 배팅 완료' : `배팅 완료 (최소 ${(MIN_BET / 10000).toFixed(0)}만원 필수)`}
        </button>
      )}
    </div>
  );
}
