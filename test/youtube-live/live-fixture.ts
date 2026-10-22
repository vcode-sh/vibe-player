import { writeFile } from "node:fs/promises";
import {
  test as base,
  type CDPSession,
  expect,
  type Page,
} from "@playwright/test";
import type { LiveYouTubeProbe } from "./fixture/probe";

const providerHost =
  /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com|ytimg\.com)$/;
const readers = new WeakMap<Page, CDPSession>();

function publicUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? `${url.origin}${url.pathname}`
      : url.protocol;
  } catch {
    return "unavailable";
  }
}

/** Records real provider/browser outcomes; no provider requests are intercepted. */
export const test = base.extend({
  page: async ({ browser, page }, use, testInfo) => {
    readers.set(page, await page.context().newCDPSession(page));
    const consoleMessages: string[] = [];
    const failures: object[] = [];
    const responses: object[] = [];
    page.on("console", (message) => {
      if (consoleMessages.length < 100) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      failures.push({
        error: request.failure()?.errorText,
        type: request.resourceType(),
        url: publicUrl(request.url()),
      });
    });
    page.on("response", (response) => {
      if (
        providerHost.test(new URL(response.url()).hostname) &&
        responses.length < 100
      ) {
        responses.push({
          contentType: response.headers()["content-type"],
          status: response.status(),
          type: response.request().resourceType(),
          url: publicUrl(response.url()),
        });
      }
    });
    await use(page);
    const frames = await Promise.all(
      page.frames().map(async (frame) => ({
        body: (
          await frame
            .locator("body")
            .ariaSnapshot({ timeout: 1000 })
            .catch(() => "Unavailable")
        ).slice(0, 4000),
        url: publicUrl(frame.url()),
      }))
    );
    const probe = await readProbe(page).catch(() => null);
    const evidencePath = testInfo.outputPath("live-youtube-evidence.json");
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          browser: browser.version(),
          channel: testInfo.project.use.channel,
          consoleMessages,
          failures,
          frames,
          headless: testInfo.project.use.headless ?? true,
          launchArguments: testInfo.project.use.launchOptions?.args ?? [],
          origin: "http://127.0.0.1:5203",
          probe,
          responses,
          videoId: "M7lc1UVf-VE",
        },
        null,
        2
      )
    );
    await testInfo.attach("live-youtube-evidence", {
      contentType: "application/json",
      path: evidencePath,
    });
  },
});

export async function readProbe(page: Page): Promise<LiveYouTubeProbe> {
  const reader = readers.get(page);
  if (!reader) {
    throw new Error("Missing activation-free browser reader.");
  }
  const result = await reader.send("Runtime.evaluate", {
    expression: "JSON.stringify(window.youtubeAcceptance)",
    returnByValue: true,
    userGesture: false,
  });
  const raw: unknown = result.result.value;
  if (typeof raw !== "string") {
    throw new Error("Live YouTube fixture has not initialized.");
  }
  return JSON.parse(raw) as LiveYouTubeProbe;
}

export async function waitForReady(page: Page): Promise<void> {
  await expect
    .poll(async () => (await readProbe(page))?.load ?? "pending")
    .not.toBe("pending");
  const probe = await readProbe(page);
  expect(probe.load, probe.loadError ?? JSON.stringify(probe.state.error)).toBe(
    "ready"
  );
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.locator("iframe")).toBeVisible();
}

export { expect } from "@playwright/test";
