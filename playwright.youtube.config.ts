import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 12_000 },
  fullyParallel: false,
  outputDir: "test-results/youtube-live",
  projects: [{ name: "chrome-live", use: { channel: "chrome" } }],
  reporter: "list",
  retries: 0,
  testDir: "./test/youtube-live",
  testMatch: "**/*.live.ts",
  timeout: 35_000,
  use: {
    baseURL: "http://127.0.0.1:5203",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { height: 800, width: 1280 },
  },
  webServer: {
    command:
      "bunx vite --config test/youtube-live/vite.config.ts --host 127.0.0.1 --port 5203 --strictPort",
    reuseExistingServer: false,
    timeout: 30_000,
    url: "http://127.0.0.1:5203",
  },
  workers: 1,
});
