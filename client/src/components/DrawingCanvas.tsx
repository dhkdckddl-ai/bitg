import { useRef, useEffect, useState, useCallback } from 'react';
import { PricePoint } from '../types';

interface Props {
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  onSubmit: (path: PricePoint[]) => void;
  disabled?: boolean;
}

export default function DrawingCanvas({ minPrice, maxPrice, currentPrice, onSubmit, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const priceRange = maxPrice - minPrice;

  const priceToY = useCallback(
    (price: number, height: number) => {
      const ratio = (price - minPrice) / priceRange;
      return height - ratio * height * 0.9 - height * 0.05;
    },
    [minPrice, priceRange]
  );

  const yToPrice = useCallback(
    (y: number, height: number) => {
      const ratio = (height - y - height * 0.05) / (height * 0.9);
      return minPrice + ratio * priceRange;
    },
    [minPrice, priceRange]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#1a1f27';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const price = maxPrice - (priceRange / 10) * i;
      ctx.fillStyle = '#848e9c';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`₩${(price / 10000).toFixed(0)}만`, width - 4, y + 12);
    }

    for (let i = 0; i <= 12; i++) {
      const x = (width / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      const hour = Math.floor((i / 12) * 24);
      ctx.fillStyle = '#848e9c';
      ctx.textAlign = 'center';
      ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, x, height - 4);
    }

    // Current price line
    const currentY = priceToY(currentPrice, height);
    ctx.strokeStyle = '#f0b90b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f0b90b';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`현재가 ₩${Math.round(currentPrice).toLocaleString()}`, 8, currentY - 6);

    // ±50% bounds
    ctx.strokeStyle = '#f6465d33';
    ctx.lineWidth = 1;
    const maxY = priceToY(maxPrice, height);
    const minY = priceToY(minPrice, height);
    ctx.fillStyle = '#3861fb08';
    ctx.fillRect(0, maxY, width, minY - maxY);

    // Drawn path
    if (points.length > 0) {
      ctx.strokeStyle = '#3861fb';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Glow effect
      ctx.strokeStyle = '#3861fb44';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
  }, [points, currentPrice, minPrice, maxPrice, priceToY, priceRange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setPoints([pos]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    setPoints((prev) => [...prev, pos]);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const { width, height } = canvas;
    const sampled: PricePoint[] = [];
    const sampleCount = 100;

    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      const targetX = t * width;

      let closest = points[0];
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.x - targetX);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }

      const price = yToPrice(closest.y, height);
      const clamped = Math.max(minPrice, Math.min(maxPrice, price));
      sampled.push({ t, price: clamped });
    }

    sampled[0] = { t: 0, price: currentPrice };
    sampled[sampled.length - 1] = { ...sampled[sampled.length - 1], t: 1 };

    onSubmit(sampled);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold">24시간 그래프 그리기</h3>
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            ±50% 범위 내에서 하루치 가격 경로를 그려주세요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={disabled || points.length === 0}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:bg-[var(--color-bg-hover)] disabled:opacity-40"
          >
            지우기
          </button>
          <button
            onClick={handleSubmit}
            disabled={disabled || points.length < 2}
            className="rounded bg-[var(--color-accent-yellow)] px-4 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            완료
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 bg-[#0d1015]">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}`}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>
    </div>
  );
}
