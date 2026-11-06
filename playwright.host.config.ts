import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 8000 },
  fullyParallel: false,
  outputDir: "build/host-browser-results",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        launchOptions: {
          env: { ...process.env, WEBKIT_GST_ENABLE_HLS_SUPPORT: "1" },
        },
      },
    },
  ],
  reporter: "list",
  testDir: "./test/browser",
  testMatch: "**/host-*.acceptance.ts",
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:5221",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { height: 900, width: 1280 },
  },
  webServer: {
    command:
      "timeout --foreground --signal=TERM --kill-after=5s 900s bunx vite --config test/browser/host-vite.config.ts --host 127.0.0.1 --port 5221 --strictPort",
    reuseExistingServer: false,
    timeout: 30_000,
    url: "http://127.0.0.1:5221/host.html",
  },
  workers: 1,
});
