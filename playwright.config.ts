import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 5000 },
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      testIgnore: "**/webkit*.browser.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testMatch: [
        "**/webkit*.browser.ts",
        "**/host-frame.browser.ts",
        "**/host-frame-parking.browser.ts",
        "**/native-media.browser.ts",
        "**/selection.browser.ts",
        "**/seek-thumbnails.browser.ts",
        "**/scrub-frame.browser.ts",
        "**/frame-picker.browser.ts",
      ],
      use: {
        ...devices["Desktop Safari"],
        launchOptions: {
          env: { ...process.env, WEBKIT_GST_ENABLE_HLS_SUPPORT: "1" },
        },
      },
    },
  ],
  reporter: process.env.CI ? "github" : "list",
  testDir: "./test/browser",
  testMatch: "**/*.browser.ts",
  timeout: 20_000,
  use: {
    baseURL: "http://127.0.0.1:5197",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "timeout --foreground --signal=TERM --kill-after=5s 900s bunx vite --config test/browser/vite.config.ts --host 127.0.0.1 --port 5197 --strictPort",
    reuseExistingServer: false,
    timeout: 30_000,
    url: "http://127.0.0.1:5197",
  },
  workers: 1,
});
