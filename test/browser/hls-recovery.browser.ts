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
  const failures = elementErrors((await readProbe(page)).events);
  const recovered = failures.slice(0, -1);
  expect(failures.at(-1)).toEqual({ code: 3, fatal: true });
  expect(recovered.every((failure) => failure.code === 3)).toBe(true);
  expect(recovered.every((failure) => failure.fatal === false)).toBe(true);
  // Which limit ends playback depends on how fast each recovery reaches the
  // broken frame again: within 3 s the ladder fails it after two recoveries;
  // on a slower machine each fault starts the ladder over and the cap of
  // four recoveries a minute fails it.
  test.info().annotations.push({
    description: String(recovered.length),
    type: "recovered-faults",
  });
  expect(recovered.length).toBeGreaterThanOrEqual(2);
  expect(recovered.length).toBeLessThanOrEqual(4);
});
