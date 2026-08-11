'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eases a number toward its target instead of snapping — used for XP, counts, percentages. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); return; }
    const from = fromRef.current;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  useEffect(() => { fromRef.current = value; }, [value]);
  return value;
}

export function AnimatedNumber({ value, decimals = 0, suffix = '', className, duration }: {
  value: number; decimals?: number; suffix?: string; className?: string; duration?: number;
}) {
  const animated = useCountUp(value, duration);
  return <span className={className}>{animated.toFixed(decimals)}{suffix}</span>;
}

/** True only on renders after the value actually increased — drives celebration effects. */
export function useDidIncrease(value: number) {
  const prev = useRef(value);
  const [increased, setIncreased] = useState(false);
  useEffect(() => {
    if (value > prev.current) {
      setIncreased(true);
      const t = setTimeout(() => setIncreased(false), 1500);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return increased;
}

/** Reveals children once they scroll into view, so long pages animate progressively. */
export function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.5s var(--ease-out) ${delay}ms, transform 0.5s var(--ease-out) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Checkbox whose tick draws itself, with a ring that bursts outward on completion. */
export function AnimatedCheck({ checked, onClick, size = 24, color = 'var(--brand)', label }: {
  checked: boolean; onClick: () => void; size?: number; color?: string; label?: string;
}) {
  const [burst, setBurst] = useState(false);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked && !wasChecked.current) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 600);
      wasChecked.current = checked;
      return () => clearTimeout(t);
    }
    wasChecked.current = checked;
  }, [checked]);

  return (
    <button
      onClick={onClick}
      aria-label={label ?? (checked ? 'Mark incomplete' : 'Mark complete')}
      aria-pressed={checked}
      className="relative flex-shrink-0 press rounded-full"
      style={{ width: size, height: size }}
    >
      {burst && (
        <span
          className="ring-burst absolute inset-0 rounded-full border pointer-events-none"
          style={{ borderColor: color }}
        />
      )}
      <span
        className="absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
        style={{
          borderColor: checked ? color : 'var(--muted)',
          backgroundColor: checked ? color : 'transparent',
          transform: checked ? 'scale(1)' : 'scale(0.94)',
        }}
      >
        {checked && (
          <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" aria-hidden>
            <path
              className="check-draw"
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#0B0F10"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}

/** Small particle spray, anchored to wherever a task was completed. */
export function Sparks({ x, y, color = '#5DBC70' }: { x: number; y: number; color?: string }) {
  const sparks = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 28 + Math.random() * 26;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, i };
  });
  return (
    <div className="pointer-events-none fixed z-[85]" style={{ left: x, top: y }}>
      {sparks.map(s => (
        <span
          key={s.i}
          className="spark absolute block rounded-full"
          style={{
            width: 5, height: 5, backgroundColor: color,
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            animationDelay: `${s.i * 12}ms`,
          }}
        />
      ))}
    </div>
  );
}

/** Full-screen celebration when the user gains a level. */
export function LevelUpOverlay({ level, rankName, rankColor, onDone }: {
  level: number; rankName: string; rankColor: string; onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative text-center animate-scale-in">
        <div className="relative mx-auto mb-5 h-28 w-28 flex items-center justify-center">
          {[0, 0.35, 0.7].map(d => (
            <span
              key={d}
              className="level-ring absolute inset-0 rounded-full border-2"
              style={{ borderColor: rankColor, animationDelay: `${d}s` }}
            />
          ))}
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center text-4xl font-black float-y"
            style={{ backgroundColor: `${rankColor}22`, border: `2px solid ${rankColor}`, color: rankColor }}
          >
            {level}
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted mb-1">Level Up</p>
        <h2 className="text-3xl font-black text-fg">Level {level}</h2>
        <p className="text-sm font-semibold mt-1" style={{ color: rankColor }}>{rankName}</p>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 space-y-5">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-11 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-28" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-44" />)}
      </div>
    </div>
  );
}

export { Check };
