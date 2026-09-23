'use client';

import { useEffect, useState } from 'react';
import { RankEmblem } from '@/components/ui/icons';

/**
 * Rank-up: the old emblem cracks and shatters, and the new one rises out of it.
 *
 * A rank changes rarely — a handful of times across months of work — so it
 * earns more than a level-up's rings. It is built from the emblem artwork
 * itself (clipped into shards) rather than a video, so it needs no new assets
 * and every tier gets the same treatment.
 *
 * It waits for a tap rather than timing out on its own. Something the user
 * worked months for should not disappear while they are reading it.
 */

/** The old emblem is cut into these pieces, each flying off its own way. */
const SHARDS = [
  { clip: 'polygon(50% 50%, 0 0, 50% 0)',        dx: -70, dy: -90, r: -35 },
  { clip: 'polygon(50% 50%, 50% 0, 100% 0)',     dx: 60,  dy: -95, r: 30 },
  { clip: 'polygon(50% 50%, 100% 0, 100% 55%)',  dx: 105, dy: -20, r: 50 },
  { clip: 'polygon(50% 50%, 100% 55%, 100% 100%, 70% 100%)', dx: 85, dy: 85, r: 25 },
  { clip: 'polygon(50% 50%, 70% 100%, 25% 100%)', dx: 0,  dy: 115, r: -15 },
  { clip: 'polygon(50% 50%, 25% 100%, 0 100%, 0 60%)', dx: -90, dy: 75, r: -40 },
  { clip: 'polygon(50% 50%, 0 60%, 0 0)',         dx: -110, dy: -10, r: 20 },
];

export default function RankUpOverlay({
  fromSlug, fromName, toSlug, toName, toColor, level, onDone,
}: {
  fromSlug: string;
  fromName: string;
  toSlug: string;
  toName: string;
  toColor: string;
  level: number;
  onDone: () => void;
}) {
  // Holds the dismiss until the reveal has actually played, so a stray tap in
  // the first second doesn't throw the moment away.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1600);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onDone]);

  const size = 132;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rank up: ${fromName} to ${toName}`}
      onClick={() => ready && onDone()}
      className="fixed inset-0 z-[96] flex items-center justify-center p-6 animate-fade-in cursor-pointer"
      style={{ ['--rank' as string]: toColor }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative flex flex-col items-center text-center">
        <p className="rankup-label text-[11px] uppercase tracking-[0.4em] text-muted mb-5">Rank Up</p>

        <div className="relative" style={{ width: size, height: size }}>
          {/* Light burst behind the reveal. */}
          <span className="rankup-burst absolute inset-0 rounded-full" aria-hidden />
          {[0, 0.3, 0.6].map(d => (
            <span
              key={d}
              aria-hidden
              className="rankup-ring absolute inset-0 rounded-full border-2"
              style={{ borderColor: toColor, animationDelay: `${1.15 + d}s` }}
            />
          ))}

          {/* The old emblem: shakes, cracks, then breaks into shards. */}
          <div className="rankup-old absolute inset-0" aria-hidden>
            <RankEmblem slug={fromSlug} size={size} />
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path className="rankup-crack" d="M50 50 L42 30 L47 18 L40 4" />
              <path className="rankup-crack" style={{ animationDelay: '0.55s' }} d="M50 50 L66 40 L74 22 L92 12" />
              <path className="rankup-crack" style={{ animationDelay: '0.65s' }} d="M50 50 L58 66 L52 82 L60 98" />
              <path className="rankup-crack" style={{ animationDelay: '0.72s' }} d="M50 50 L32 58 L20 54 L4 66" />
            </svg>
          </div>

          <div className="absolute inset-0" aria-hidden>
            {SHARDS.map((s, i) => (
              <span
                key={i}
                className="rankup-shard absolute inset-0"
                style={{
                  clipPath: s.clip,
                  ['--dx' as string]: `${s.dx}px`,
                  ['--dy' as string]: `${s.dy}px`,
                  ['--r' as string]: `${s.r}deg`,
                }}
              >
                <RankEmblem slug={fromSlug} size={size} />
              </span>
            ))}
          </div>

          {/* The new emblem, revealed out of the break. */}
          <div className="rankup-new absolute inset-0">
            <RankEmblem slug={toSlug} size={size} />
          </div>
        </div>

        <div className="rankup-text mt-7">
          <p className="text-sm text-muted">
            <span className="line-through decoration-muted/60">{fromName}</span>
            <span className="mx-2 text-muted-dim">→</span>
          </p>
          <h2 className="font-display text-4xl tracking-wide mt-1" style={{ color: toColor }}>
            {toName.toUpperCase()}
          </h2>
          <p className="text-sm text-muted mt-2">Level {level}</p>
          <p className={`text-xs text-muted-dim mt-6 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            Tap anywhere to continue
          </p>
        </div>
      </div>
    </div>
  );
}
