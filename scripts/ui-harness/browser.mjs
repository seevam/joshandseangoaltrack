// Shared Chromium launcher for harness scripts.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
export const BASE = 'http://127.0.0.1:8765/index.html';
export function launch() {
  const executablePath = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
  return chromium.launch(executablePath ? { executablePath } : {});
}
