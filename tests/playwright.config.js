// Playwright config — smoke suite for /tmp/sr-repo/index.html (register item E1, test half).
// Static app served by python3 http.server on 4173; app itself calls live Supabase (anon reads)
// and fetches ./geo/* — hence generous timeouts.
const { defineConfig } = require('@playwright/test');

// If the chromium download is unavailable, set PW_CHANNEL=chrome to run against system Chrome.
const channel = process.env.PW_CHANNEL || undefined;

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
    navigationTimeout: 20000,
    ...(channel ? { channel } : {}),
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/sr-repo',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    timeout: 20000,
  },
});
