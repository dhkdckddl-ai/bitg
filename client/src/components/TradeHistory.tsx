interface Props {
  currentPrice: number;
}

export default function TradeHistory({ currentPrice }: Props) {
  const trades = Array.from({ length: 12 }, (_, i) => {
    const isBuy = Math.random() > 0.5;
    const priceOffset = (Math.random() - 0.5) * currentPrice * 0.002;
    return {
      id: i,
      price: currentPrice + priceOffset,
      amount: (Math.random() * 1.5 + 0.01).toFixed(4),
      isBuy,
      time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    };
  });

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <h3 className="text-xs font-semibold font-sans">체결 내역</h3>
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-[var(--color-border)] px-3 py-1 text-[9px] text-[var(--color-text-secondary)]">
        <span>가격(KRW)</span>
        <span className="text-right">수량(BTC)</span>
        <span className="text-right">시간</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.map((trade) => (
          <div key={trade.id} className="grid grid-cols-3 gap-1 px-3 py-0.5">
            <span className={trade.isBuy ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}>
              {Math.round(trade.price).toLocaleString()}
            </span>
            <span className="text-right text-[var(--color-text-secondary)]">{trade.amount}</span>
            <span className="text-right text-[var(--color-text-secondary)]">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
