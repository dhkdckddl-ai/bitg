import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  ColorType,
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

const DAY_SECONDS = 24 * 60 * 60;

function pathToLineData(path: PricePoint[]): { time: Time; value: number }[] {
  if (path.length === 0) return [];
  const baseTime = Math.floor(Date.now() / 1000) - DAY_SECONDS;
  return path.map((p, i) => ({
    time: (baseTime + Math.floor(p.t * DAY_SECONDS)) as Time,
    value: p.price,
  }));
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
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const animationStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (phase === 'animating' && animationProgress === 0) {
      animationStartRef.current = Date.now();
    }
  }, [phase, animationProgress]);

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
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3861fb',
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
    });

    chartRef.current = chart;
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
      lineSeriesRef.current = null;
    };
  }, []);

  const updateChart = useCallback(() => {
    if (!lineSeriesRef.current || !chartRef.current) return;

    const isDrawingPhase = phase === 'animating' || phase === 'turn_end';

    if (isDrawingPhase && pricePath.length > 0) {
      const lineData = pathToLineData(pricePath);
      lineSeriesRef.current.setData(lineData);
      lineSeriesRef.current.applyOptions({
        color: '#3861fb',
        lineWidth: 2.5,
      });
    } else {
      const baseTime = Math.floor(Date.now() / 1000) - DAY_SECONDS;
      lineSeriesRef.current.setData([
        { time: baseTime as Time, value: currentPrice },
        { time: (baseTime + DAY_SECONDS) as Time, value: currentPrice },
      ]);
      lineSeriesRef.current.applyOptions({
        color: '#848e9c',
        lineWidth: 1,
      });
    }

    if (isDrawingPhase && pricePath.length > 1) {
      chartRef.current.timeScale().fitContent();
    }
  }, [currentPrice, pricePath, phase]);

  useEffect(() => {
    updateChart();
  }, [updateChart]);

  const startPrice = pricePath[0]?.price ?? currentPrice;
  const priceChange =
    phase === 'animating' || phase === 'turn_end'
      ? ((currentPrice - startPrice) / startPrice) * 100
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
            {(phase === 'animating' || phase === 'turn_end') && (
              <span className={`font-mono text-sm ${isUp ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                {isUp ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex gap-6 text-xs text-[var(--color-text-secondary)]">
          {isAnimating && (
            <div>
              <span className="block text-[10px] uppercase">그래프 진행</span>
              <span className="font-mono text-[var(--color-accent-yellow)]">
                {Math.round(animationProgress * 100)}%
              </span>
            </div>
          )}
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
      <div ref={containerRef} className="relative flex-1 min-h-0">
        {phase === 'betting' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#12161c]/60">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 px-6 py-4 text-center">
              <p className="text-sm font-semibold text-[var(--color-accent-blue)]">🔒 그래프 비공개</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">배팅 완료 후 그래프가 그려지기 시작합니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
