'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders an overlay straight under <body>, outside whatever page it was
 * opened from.
 *
 * Overlays used to render in place, inside page layouts — and page layouts
 * style their children. The goal page spaces its sections with `space-y-5`,
 * which gave every overlay opened there a 20px top margin: Focus Mode, the
 * delete dialog and the duration prompt all sat 20px low with a strip of the
 * page showing above them. An overlay inside an animated section is also
 * trapped in that section's stacking context and can end up beneath
 * unrelated content. Under <body>, neither can happen.
 *
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  // Available on the very first client render, not one effect later: a dialog
  // that focuses its safe button on mount must find that button already in
  // the document, or focus is left behind on the page. Overlays only open
  // after an interaction, so none is ever part of the server-rendered HTML.
  const [target, setTarget] = useState<HTMLElement | null>(
    () => (typeof document === 'undefined' ? null : document.body),
  );
  useEffect(() => { if (!target) setTarget(document.body); }, [target]);
  return target ? createPortal(children, target) : null;
}
