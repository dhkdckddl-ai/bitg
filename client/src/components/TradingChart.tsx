import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  ColorType,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import { PricePoint } from '../types';

interface Props {
  currentPrice: number;
  pricePath: PricePoint[];
  animationProgress: number;
  phase: string;
  minPrice: number;
  maxPrice: number;
  isAnimating: boolean;
}

function generateCandlesticks(
  pricePath: PricePoint[],
  progress: number,
  currentPrice: number
): CandlestickData<Time>[] {
  const candles: CandlestickData<Time>[] = [];
  const totalPoints = pricePath.length || 1;
  const visiblePoints = Math.max(2, Math.floor(totalPoints * progress));

  if (pricePath.length === 0) {
    const baseTime = Math.floor(Date.now() / 1000) - 60;
    candles.push({
      time: baseTime as Time,
      open: currentPrice,
      high: currentPrice * 1.001,
      low: currentPrice * 0.999,
      close: currentPrice,
    });
    return candles;
  }

  const groupSize = Math.max(1, Math.floor(visiblePoints / 40));
  const baseTime = Math.floor(Date.now() / 1000) - visiblePoints * 15;

  for (let i = 0; i < visiblePoints; i += groupSize) {
    const slice = pricePath.slice(i, Math.min(i + groupSize, visiblePoints));
    if (slice.length === 0) continue;

    const prices = slice.map((p) => p.price);
    const open = slice[0].price;
    const close = slice[slice.length - 1].price;
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    candles.push({
      time: (baseTime + Math.floor(i / groupSize) * 15) as Time,
      open,
      high,
      low,
      close,
    });
  }

  return candles;
}

export default function TradingChart({
  currentPrice,
  pricePath,
  animationProgress,
  phase,
  minPrice,
  maxPrice,
  isAnimating,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#12161c' },
        textColor: '#848e9c',
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1a1f27' },
        horzLines: { color: '#1a1f27' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#f0b90b', width: 1, style: 2, labelBackgroundColor: '#f0b90b' },
        horzLine: { color: '#f0b90b', width: 1, style: 2, labelBackgroundColor: '#f0b90b' },
      },
      rightPriceScale: {
        borderColor: '#2b3139',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3861fb',
      lineWidth: 2,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    lineSeriesRef.current = lineSeries;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lineSeriesRef.current = null;
    };
  }, []);

  const updateChart = useCallback(() => {
    if (!seriesRef.current || !lineSeriesRef.current || !chartRef.current) return;

    const progress = phase === 'animating' ? animationProgress : phase === 'turn_end' ? 1 : 0;

    if (phase === 'drawing' || phase === 'betting') {
      lineSeriesRef.current.applyOptions({ visible: true });
      seriesRef.current.applyOptions({ visible: false });

      if (pricePath.length > 0) {
        const baseTime = Math.floor(Date.now() / 1000) - pricePath.length * 15;
        const lineData = pricePath.map((p, i) => ({
          time: (baseTime + i * 15) as Time,
          value: p.price,
        }));
        lineSeriesRef.current.setData(lineData);
      } else {
        lineSeriesRef.current.setData([]);
      }
    } else {
      lineSeriesRef.current.applyOptions({ visible: false });
      seriesRef.current.applyOptions({ visible: true });

      const candles = generateCandlesticks(pricePath, progress || (phase === 'waiting' ? 0 : 1), currentPrice);
      seriesRef.current.setData(candles);
    }

    chartRef.current.timeScale().scrollToRealTime();
  }, [currentPrice, pricePath, animationProgress, phase]);

  useEffect(() => {
    updateChart();
  }, [updateChart]);

  const priceChange = pricePath.length > 1
    ? ((currentPrice - pricePath[0].price) / pricePath[0].price) * 100
    : 0;

  const isUp = priceChange >= 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end gap-4 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">BTC/KRW</span>
            {isAnimating && (
              <span className="rounded bg-[var(--color-accent-red)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent-red)] animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className={`font-mono text-2xl font-bold ${isUp ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
              ₩{Math.round(currentPrice).toLocaleString('ko-KR')}
            </span>
            <span className={`font-mono text-sm ${isUp ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
              {isUp ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-6 text-xs text-[var(--color-text-secondary)]">
          <div>
            <span className="block text-[10px] uppercase">24h High</span>
            <span className="font-mono text-[var(--color-accent-green)]">₩{Math.round(maxPrice).toLocaleString('ko-KR')}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase">24h Low</span>
            <span className="font-mono text-[var(--color-accent-red)]">₩{Math.round(minPrice).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
