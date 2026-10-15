'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { X, ArrowLeft, ArrowRight, MousePointerClick } from 'lucide-react';
import Portal from './Portal';

/**
 * A guided tour: one element at a time is lifted out of a dimmed page, with a
 * card beside it saying what it is for.
 *
 * Targets are found by `data-tour="…"` rather than refs, so any component can
 * be a stop without the tour reaching into it. A stop whose element is absent
 * or hidden (the sidebar on a phone, a panel with nothing in it) is skipped
 * rather than pointing at empty space.
 *
 * The highlighted element stays live: clicks inside the cut-out reach it, and
 * clicks anywhere else are absorbed. A step with `action` asks the user to
 * click the element and moves on when they do — that is how the tour guides
 * clicks rather than only describing them.
 */
export interface TourStep {
  /** Matches a `data-tour` attribute. */
  target: string;
  title: string;
  body: string;
  /** "Click it to …" — the step advances when the element is clicked. */
  action?: string;
}

const PAD = 8;

function findTarget(id: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`));
  // The first one actually on screen — the same stop can exist in a desktop
  // and a mobile variant, only one of which is displayed.
  return all.find(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

export default function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  /** Only the stops that exist right now. Decided once, when the tour opens. */
  const [live] = useState(() => steps.filter(s => findTarget(s.target)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = live[i];

  const next = useCallback(() => {
    if (i + 1 >= live.length) onClose();
    else setI(i + 1);
  }, [i, live.length, onClose]);

  // Bring the stop into view, then track it while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) { next(); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let frame = 0;
    const track = () => {
      setRect(prev => {
        const r = el.getBoundingClientRect();
        return prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
          ? prev : r;
      });
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [step, next]);

  // An action step moves on when its element is actually clicked.
  useEffect(() => {
    if (!step?.action) return;
    const el = findTarget(step.target);
    if (!el) return;
    const onClick = () => setTimeout(next, 0);
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [step, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, onClose]);

  useEffect(() => { if (live.length === 0) onClose(); }, [live.length, onClose]);
  if (!step || !rect) return null;

  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
  const hole = {
    top: Math.max(rect.top - PAD, 0),
    left: Math.max(rect.left - PAD, 0),
    width: Math.min(rect.width + PAD * 2, vw),
    height: rect.height + PAD * 2,
  };

  // The card goes below the stop when there is room, above it otherwise; on a
  // phone it is pinned to the bottom edge where it can never cover the stop's
  // own controls off-screen.
  const CARD_W = Math.min(340, vw - 32);
  const below = hole.top + hole.height + 12;
  const roomBelow = vh - below > 200;
  const narrow = vw < 640;
  const cardStyle: React.CSSProperties = narrow
    ? { left: 16, right: 16, bottom: 16 }
    : {
        width: CARD_W,
        left: Math.min(Math.max(hole.left, 16), vw - CARD_W - 16),
        ...(roomBelow ? { top: below } : { bottom: Math.max(vh - hole.top + 12, 16) }),
      };

  const block = 'fixed z-[97] bg-transparent';
  return (
    <Portal>
      {/* Click shields around the cut-out: the page is paused, the stop is not. */}
      <div className={block} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
      <div className={block} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
      <div className={block} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
      <div className={block} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />

      <div
        aria-hidden
        className="fixed z-[97] rounded-2xl border-2 border-brand pointer-events-none transition-all duration-300 ease-out"
        style={{ ...hole, boxShadow: '0 0 0 9999px rgba(0,0,0,0.72), 0 0 32px 4px color-mix(in srgb, var(--brand) 45%, transparent)' }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="fixed z-[98] rounded-2xl border border-line bg-card p-4 shadow-2xl animate-pop-in"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-brand">
            Tutorial · {i + 1} of {live.length}
          </p>
          <button onClick={onClose} aria-label="End tutorial" className="-m-1 p-1 rounded-lg text-muted hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="tour-title" className="mt-1.5 text-base font-semibold text-fg">{step.title}</h2>
        <p className="mt-1.5 text-sm text-muted leading-relaxed">{step.body}</p>
        {step.action && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-brand">
            <MousePointerClick className="h-3.5 w-3.5 flex-shrink-0" /> {step.action}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-fg"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI(n => Math.max(0, n - 1))}
                aria-label="Previous step"
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-fg glow-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-black hover:bg-[var(--brand-dark)]"
            >
              {i + 1 >= live.length ? 'Finish' : step.action ? 'Skip step' : 'Next'}
              {i + 1 < live.length && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
