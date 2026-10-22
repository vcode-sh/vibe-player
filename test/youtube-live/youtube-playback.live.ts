import { expect, readProbe, test, waitForReady } from "./live-fixture";

test("official sample plays, pauses, applies provider rates and survives repeated mount", async ({
  page,
}) => {
  await page.goto("/");
  await waitForReady(page);
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect
    .poll(async () => (await readProbe(page)).state.snapshot.currentTime)
    .toBeGreaterThan(0.2);
  expect((await readProbe(page)).state.snapshot.paused).toBe(false);

  const rates = (await readProbe(page)).state.snapshot.playbackRates ?? [];
  expect(rates).toContain(1);
  expect(rates.every((rate) => Number.isFinite(rate) && rate > 0)).toBe(true);
  const alternative = rates.find((rate) => rate !== 1);
  if (alternative === undefined) {
    expect((await readProbe(page)).state.capabilities?.canSetPlaybackRate).toBe(
      false
    );
  } else {
    await page.getByLabel("Playback rate").selectOption(String(alternative));
    await expect
      .poll(async () => (await readProbe(page)).state.snapshot.playbackRate)
      .toBe(alternative);
  }

  const iframe = await page.locator("iframe").elementHandle();
  const playerFrame = await iframe?.contentFrame();
  if (!playerFrame) {
    throw new Error("Expected the live YouTube player frame.");
  }
  let iframeNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === playerFrame) {
      iframeNavigations += 1;
    }
  });
  const before = (await readProbe(page)).state.snapshot.currentTime;
  const navigationsBefore = iframeNavigations;
  await page.getByRole("button", { name: "Mount same target again" }).click();
  await expect.poll(async () => (await readProbe(page)).remounts).toBe(1);
  expect(
    await page
      .locator("iframe")
      .evaluate((current, previous) => current === previous, iframe)
  ).toBe(true);
  await expect
    .poll(async () => (await readProbe(page)).state.snapshot.currentTime)
    .toBeGreaterThan(before + 0.2);
  expect(iframeNavigations).toBe(navigationsBefore);

  await page.getByRole("button", { exact: true, name: "Pause" }).click();
  await expect
    .poll(async () => (await readProbe(page)).state.snapshot.paused)
    .toBe(true);
  await expect
    .poll(
      async () =>
        await page
          .frameLocator("iframe")
          .locator("video")
          .evaluate((video: HTMLVideoElement) => video.paused)
    )
    .toBe(true);
  expect((await readProbe(page)).commandError).toBeNull();
  await page.getByRole("button", { name: "Dispose" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});
