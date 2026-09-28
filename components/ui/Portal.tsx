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
 * Renders nothing until mounted, since there is no document on the server.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted ? createPortal(children, document.body) : null;
}
