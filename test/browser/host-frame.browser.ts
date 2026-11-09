import { expect, test } from "@playwright/test";
import { readMedia } from "./helpers";
import {
  expectAdvancing,
  hostOf,
  instrument,
  player,
  readProbe,
  readSeeks,
  startPlayback,
  stepForward,
  togglePlayback,
} from "./host-frame-helpers";

test("resuming from a pause keeps the paused frame instead of the poster", async ({
  page,
}) => {
  await startPlayback(page);
  await togglePlayback(page, "Pause");
  await expect(page.locator(player)).toHaveAttribute("data-state", "paused");
  await instrument(page);

  await togglePlayback(page, "Play");
  await expectAdvancing(page);

  const probe = await readProbe(page);
  expect(probe.posters).toBe(0);
  expect(probe.states).not.toContain("loading");
  expect(probe.states.at(-1)).toBe("playing");
  expect(probe.events).toEqual([]);
});

test("native seeks flush observed playback and leave skipped time out of the next batch", async ({
  page,
}) => {
  await startPlayback(page);
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(1);
  const target = await page
    .locator("video")
    .evaluate((video: HTMLVideoElement) => {
      const next = video.currentTime + 0.5;
      video.currentTime = next;
      return next;
    });
  const output = page.getByRole("status", { name: "Watched ranges" });
  await expect(output).not.toHaveText("none");
  const before = JSON.parse((await output.textContent()) ?? "null");
  expect(before).toMatchObject({ reason: "seek", sequence: 1 });
  expect(before.ranges.at(-1).end).toBeLessThan(target - 0.45);

  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(target + 0.7);
  await expect(page.locator(player)).toHaveAttribute("data-state", "playing");
  await expect(page.locator(player)).toHaveAttribute("data-busy", "false");
  await togglePlayback(page, "Pause");
  await expect(output).toContainText('"reason":"pause"');
  const after = JSON.parse((await output.textContent()) ?? "null");
  expect(after.ranges[0].start).toBeGreaterThanOrEqual(target - 0.05);
  expect(after).toMatchObject({ playbackId: before.playbackId, sequence: 2 });
  const seeks = await readSeeks(page);
  expect(seeks).toHaveLength(1);
  expect(seeks[0]).toMatchObject({ initiator: "media", type: "seek" });
  expect(seeks[0]?.currentTime).toBeCloseTo(target, 1);
  expect(seeks[0]?.from).toBeLessThan(target);
});

test("a controller seek reports once and a replay after the end is a new playback", async ({
  page,
}) => {
  await startPlayback(page);
  await page.locator(player).focus();
  // Two 10 s steps through the 24 s file, each followed by real progress.
  await stepForward(page, 10);
  await stepForward(page, 20);
  await expect(page.locator(player)).toHaveAttribute("data-state", "ended", {
    timeout: 10_000,
  });
  const output = page.getByRole("status", { name: "Watched ranges" });
  const ended = JSON.parse((await output.textContent()) ?? "null");
  expect(ended).toMatchObject({ reason: "ended", sequence: 3 });

  await page
    .locator(player)
    .getByRole("button", { exact: true, name: "Replay" })
    .click();
  await expectAdvancing(page);
  await togglePlayback(page, "Pause");
  await expect(output).toContainText('"reason":"pause"');
  const replayed = JSON.parse((await output.textContent()) ?? "null");
  expect(replayed.sequence).toBe(1);
  expect(replayed.playbackId).not.toBe(ended.playbackId);
  // The media echoed both seeks; neither the echoes nor the replay rewind count.
  const seeks = await readSeeks(page);
  expect(seeks.map(({ initiator }) => initiator)).toEqual([
    "controller",
    "controller",
  ]);
});

for (const provider of ["file", "hls"] as const) {
  test(`${provider} playback keeps playing while it moves between hosts`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      provider === "hls" && browserName === "webkit",
      "Managed HLS needs MediaSource; WebKit runs its native-HLS fixture."
    );
    await startPlayback(page, provider === "hls" ? "?provider=hls" : "");
    const video = await page.locator("video").elementHandle();
    await instrument(page);
    expect(await hostOf(page)).toBe("Inline slot");

    await page
      .getByRole("button", { exact: true, name: "Float player" })
      .click();
    expect(await hostOf(page)).toBe("Floating host");
    await expectAdvancing(page);

    await togglePlayback(page, "Pause");
    await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
    const report = JSON.parse(
      (await page
        .getByRole("status", { name: "Watched ranges" })
        .textContent()) ?? "null"
    );
    expect(report).toMatchObject({
      reason: "pause",
      sourceId: `host-${provider}`,
    });
    expect(report.ranges).toHaveLength(1);
    const pausedAt = (await readMedia(page)).currentTime;

    await page
      .getByRole("button", { exact: true, name: "Dock player" })
      .click();
    expect(await hostOf(page)).toBe("Inline slot");
    expect((await readMedia(page)).currentTime).toBeCloseTo(pausedAt, 1);
    await togglePlayback(page, "Play");
    await expectAdvancing(page);

    expect(await video?.evaluate((element) => element.isConnected)).toBe(true);
    await expect(page.locator("video")).toHaveCount(1);
    expect(await page.locator("video").elementHandle()).toBeTruthy();
    expect(
      await page.evaluate(
        (element) => element === document.querySelector("video"),
        video
      )
    ).toBe(true);
    expect((await readProbe(page)).events).toEqual([]);
  });
}

test("the heatmap spans the scrubber under its fill", async ({ page }) => {
  await startPlayback(page);
  await page.locator(player).hover();
  const geometry = await page.evaluate((selector) => {
    const width = (part: string) =>
      document.querySelector(`${selector} ${part}`)?.getBoundingClientRect()
        .width ?? 0;
    return {
      heatmap: width('[data-part="heatmap"]'),
      rail: width(".vibe-player-scrubber__rail"),
    };
  }, player);
  expect(geometry.rail).toBeGreaterThan(40);
  expect(geometry.heatmap).toBeCloseTo(geometry.rail, 0);
});
