import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './frontend/e2e', testMatch: '**/*.spec.mjs', workers: 1, fullyParallel: false,
  timeout: 45000, expect: { timeout: 10000 }, reporter: 'list',
  use: { trace: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
});
