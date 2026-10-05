import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/artifacts', // keep test-results/screens untouched by Playwright's cleanup
  // 3D scenes starve each other on the CPU renderer; run serially with generous waits.
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  forbidOnly: !!process.env.CI,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/brick-birthday/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/brick-birthday/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 1024 } },
      // The GPU-less CI runner software-renders the 3D zones far too slowly in Chromium; WebKit
      // covers every zone flow there in seconds, so CI keeps Chromium for the smoke-only checks
      // (canvas pixels, network isolation, pack import). Locally both projects run everything.
      ...(process.env.CI ? { testMatch: /smoke\.spec\.ts$/ } : {}),
    },
    {
      name: 'ipad-webkit',
      use: { ...devices['iPad (gen 7) landscape'], hasTouch: true },
    },
  ],
});
