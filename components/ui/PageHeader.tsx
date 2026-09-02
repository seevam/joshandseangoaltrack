'use client';

import { Icon } from './icons';

/**
 * The reference's page-identity pattern: a small letterspaced eyebrow naming
 * the area, a large display title, an optional explanation, and a right-hand
 * slot for status or actions. Used on every route so pages announce
 * themselves the same way.
 */
export default function PageHeader({
  eyebrow, icon, title, accent, subtitle, right,
}: {
  /** e.g. "PROGRESSION / PLAYER MENU" */
  eyebrow: string;
  icon?: string;
  /** e.g. "LOADOUT" */
  title: string;
  /** Leading fragment of the title rendered in brand colour, e.g. "LOAD". */
  accent?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const accentPart = accent && title.startsWith(accent) ? accent : '';
  const rest = accentPart ? title.slice(accentPart.length) : title;

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap animate-slide-up">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] tracking-[0.22em] text-brand/80 uppercase mb-1.5">
          {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
          <span className="break-words">{eyebrow}</span>
        </p>
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] tracking-wide">
          {accentPart && <span className="text-brand-gradient">{accentPart}</span>}
          <span className="text-fg">{rest}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-muted mt-2.5 max-w-2xl leading-relaxed break-words">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </header>
  );
}

/** Small letterspaced eyebrow + display heading, for panels inside a page. */
export function PanelHeading({
  eyebrow, icon, title, right,
}: {
  eyebrow: string;
  icon?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-brand/80 uppercase mb-1">
          {icon && <Icon name={icon} className="h-3 w-3" />}
          <span className="break-words">{eyebrow}</span>
        </p>
        <h2 className="section-title text-lg text-fg">{title}</h2>
      </div>
      {right && <div className="flex-shrink-0 text-xs text-muted text-right max-w-xs">{right}</div>}
    </div>
  );
}
