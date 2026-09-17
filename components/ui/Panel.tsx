'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A dashboard panel that collapses on mobile and never collapses on desktop.
 *
 * The mobile dashboard was a single column of full-height blocks — reaching the
 * activity feed meant five screens of scrolling. Collapsed headers turn that
 * into a contents page you open one section at a time. Desktop has the room, so
 * it keeps every panel open and never renders a toggle.
 *
 * Open/closed is remembered per panel, so a section you keep open stays open.
 */
export default function Panel({
  id, title, icon, subtitle, right, className = '', glow = '', defaultOpen = false,
  alwaysOpen = false, children,
}: {
  /** Stable key for remembering this panel's state. */
  id: string;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  /** Controls in the header — hidden on mobile while the panel is closed. */
  right?: React.ReactNode;
  className?: string;
  glow?: string;
  defaultOpen?: boolean;
  /** Never collapsible, at any width. */
  alwaysOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Read after mount: the server has no localStorage, and rendering the stored
  // state directly would mismatch the markup it sent.
  useEffect(() => {
    if (alwaysOpen) return;
    try {
      const saved = localStorage.getItem(`gq_panel_${id}`);
      if (saved !== null) setOpen(saved === '1');
    } catch { /* private mode — the default stands */ }
  }, [id, alwaysOpen]);

  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(`gq_panel_${id}`, o ? '0' : '1'); } catch { /* ignore */ }
      return !o;
    });
  };

  const header = (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0 flex-1 text-left">
        <h2 className="font-semibold text-fg flex items-center gap-2 min-w-0">
          {icon}
          <span className="section-title truncate">{title}</span>
        </h2>
        {subtitle && (
          <p className={`text-sm text-muted mt-1 break-words ${open ? '' : 'hidden lg:block'}`}>
            {subtitle}
          </p>
        )}
      </div>

      {right && <div className={`flex-shrink-0 ${open ? '' : 'hidden lg:block'}`}>{right}</div>}

      {!alwaysOpen && (
        <ChevronDown
          aria-hidden
          className={`lg:hidden h-4 w-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      )}
    </div>
  );

  return (
    <section className={`card-glow ${glow} rounded-2xl p-4 sm:p-5 ${className}`}>
      {alwaysOpen ? (
        header
      ) : (
        <>
          {/* One tap target across the whole header row, rather than a small
              chevron you have to aim at. Desktop has nothing to toggle. */}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="w-full lg:hidden"
          >
            {header}
          </button>
          <div className="hidden lg:block">{header}</div>
        </>
      )}

      <div className={`mt-4 ${alwaysOpen || open ? '' : 'hidden lg:block'}`}>{children}</div>
    </section>
  );
}
