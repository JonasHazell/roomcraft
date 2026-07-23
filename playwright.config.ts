import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end validation for RoomCraft's UI.
 *
 * Every feature/UI change is exercised in TWO viewports — a desktop browser and
 * a mobile device — so we catch layout, touch-target and responsive regressions
 * before they ship. The `desktop` and `mobile` projects run the same specs; write
 * one test and it is validated in both modes.
 *
 * The pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH) is used for both — do not
 * run `playwright install`.
 */

const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

// Use the Chromium that ships with the environment rather than downloading one.
// Explicit override wins; otherwise use the symlink under PLAYWRIGHT_BROWSERS_PATH
// if present; otherwise fall back to Playwright's bundled browser (local dev).
function resolveChromium(): string | undefined {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override && existsSync(override)) return override;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base) {
    const linked = join(base, 'chromium');
    if (existsSync(linked)) return linked;
  }
  return undefined;
}

const executablePath = resolveChromium();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Many specs drive a full WebGL scene (the 3D furnish view), and the
  // shared CI runner is markedly slower than a dev machine — a run that takes
  // ~16 min locally can take 30–36 min there, with several 3D-heavy tests
  // brushing up against Playwright's default 30 s per-test budget and flaking a
  // different random subset each run. Give every test real headroom (and a
  // slightly longer default assertion wait) so a slow-but-correct run passes
  // instead of tripping the timeout; a genuine hang still fails, just later.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Diagnostics that make a failed validation easy to inspect.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], launchOptions: { executablePath } },
    },
  ],
  // Start (or reuse) the Vite dev server for the duration of the run.
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
