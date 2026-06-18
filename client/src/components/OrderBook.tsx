interface Props {
  currentPrice: number;
}

export default function OrderBook({ currentPrice }: Props) {
  const generateOrders = (side: 'bid' | 'ask') => {
    const orders = [];
    for (let i = 0; i < 8; i++) {
      const offset = (i + 1) * (currentPrice * 0.001);
      const price = side === 'bid' ? currentPrice - offset : currentPrice + offset;
      const amount = (Math.random() * 2 + 0.1).toFixed(4);
      const total = (price * parseFloat(amount) / 10000).toFixed(0);
      orders.push({ price, amount, total });
    }
    return orders;
  };

  const asks = generateOrders('ask').reverse();
  const bids = generateOrders('bid');

  return (
    <div className="flex h-full flex-col text-[11px] font-mono">
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <h3 className="text-xs font-semibold font-sans">호가창</h3>
      </div>
      <div className="flex-1 overflow-hidden px-2 py-1">
        {asks.map((order, i) => (
          <div key={`ask-${i}`} className="relative flex justify-between py-0.5">
            <div
              className="absolute inset-y-0 right-0 bg-[var(--color-accent-red)]/8"
              style={{ width: `${20 + Math.random() * 60}%` }}
            />
            <span className="relative text-[var(--color-accent-red)]">
              {Math.round(order.price).toLocaleString()}
            </span>
            <span className="relative text-[var(--color-text-secondary)]">{order.amount}</span>
          </div>
        ))}

        <div className="my-1 border-y border-[var(--color-border)] py-1.5 text-center">
          <span className="text-sm font-bold text-[var(--color-accent-yellow)]">
            ₩{Math.round(currentPrice).toLocaleString()}
          </span>
        </div>

        {bids.map((order, i) => (
          <div key={`bid-${i}`} className="relative flex justify-between py-0.5">
            <div
              className="absolute inset-y-0 right-0 bg-[var(--color-accent-green)]/8"
              style={{ width: `${20 + Math.random() * 60}%` }}
            />
            <span className="relative text-[var(--color-accent-green)]">
              {Math.round(order.price).toLocaleString()}
            </span>
            <span className="relative text-[var(--color-text-secondary)]">{order.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
