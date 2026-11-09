import { expect, type Page, test } from "@playwright/test";
import type { HlsRecoveryProbe } from "./fixture/hls-recovery-player";
import { readMedia } from "./helpers";

interface HlsRecoveryWindow {
  hlsRecovery: {
    controller: {
      getState(): { error: { kind: string } | null };
      play(): Promise<void>;
    };
    probe: HlsRecoveryProbe;
  };
}

/** The scrambled segment starts at 8 s; its first broken frame is soon after. */
const pastGlitchSeconds = 10;

async function playGlitch(page: Page, glitch: "always" | "once") {
  await page.goto(`/hls-recovery.html?glitch=${glitch}`);
  await page.waitForFunction(() => "hlsRecovery" in window);
  await page.evaluate(() =>
    (window as unknown as HlsRecoveryWindow).hlsRecovery.controller.play()
  );
}

/**
 * The media element's own errors. hls.js may add nonfatal diagnostics of its
 * own (such as a buffer stall) around them; those carry `details`.
 */
function elementErrors(events: HlsRecoveryProbe["events"]) {
  return events
    .filter((event) => event.type === "error" && event.details === undefined)
    .map(({ code, fatal }) => ({ code, fatal }));
}

function readProbe(page: Page) {
  return page.evaluate(
    () => (window as unknown as HlsRecoveryWindow).hlsRecovery.probe
  );
}

function readError(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as HlsRecoveryWindow).hlsRecovery.controller.getState()
        .error
  );
}

test("managed HLS recovers a segment the decoder rejected once and keeps playing", async ({
  page,
}) => {
  test.setTimeout(40_000);
  await playGlitch(page, "once");

  await expect
    .poll(async () => (await readMedia(page)).currentTime, { timeout: 25_000 })
    .toBeGreaterThan(pastGlitchSeconds);
  expect((await readMedia(page)).paused).toBe(false);
  expect(await readError(page)).toBeNull();
  const { errors, events } = await readProbe(page);
  expect(errors).toEqual([]);
  expect(events.filter((event) => event.type === "pause")).toEqual([]);
  // The media element's own decode error, recovered and reported nonfatal.
  expect(elementErrors(events)).toEqual([{ code: 3, fatal: false }]);
});

test("managed HLS fails a segment that never decodes after its recoveries", async ({
  page,
}) => {
  test.setTimeout(40_000);
  await playGlitch(page, "always");

  await expect
    .poll(async () => (await readProbe(page)).errors, { timeout: 25_000 })
    .toEqual([{ kind: "decode", phase: "playback" }]);
  expect(await readError(page)).toMatchObject({ kind: "decode" });
  expect(elementErrors((await readProbe(page)).events)).toEqual([
    { code: 3, fatal: false },
    { code: 3, fatal: false },
    { code: 3, fatal: true },
  ]);
});
