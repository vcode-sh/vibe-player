import { expect, type Page, test } from "@playwright/test";
import { readMedia } from "./helpers";

async function changeMotion(
  page: Page,
  reducedMotion: "reduce" | "no-preference"
) {
  const notification = await page.evaluateHandle(() => ({
    changed: new Promise<void>((resolve) => {
      window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .addEventListener("change", () => resolve(), { once: true });
    }),
  }));
  await page.emulateMedia({ reducedMotion });
  await notification.evaluate(({ changed }) => changed);
  await notification.dispose();
}

async function expectPlaybackAfter(page: Page, seconds: number) {
  await expect.poll(async () => (await readMedia(page)).paused).toBe(false);
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(seconds + 0.2);
}

test("ambient preview respects live motion policy, host pause and unmount", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/preview.html");
  await expect(page.locator("video")).toHaveCount(1);
  await expect
    .poll(async () => (await readMedia(page)).readyState)
    .toBeGreaterThanOrEqual(1);
  expect(await readMedia(page)).toMatchObject({
    currentTime: 0,
    muted: true,
    paused: true,
  });

  await changeMotion(page, "no-preference");
  await expectPlaybackAfter(page, 0);
  await changeMotion(page, "reduce");
  await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
  const motionPauseTime = (await readMedia(page)).currentTime;
  await changeMotion(page, "no-preference");
  await expectPlaybackAfter(page, motionPauseTime);

  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
  const hostPauseTime = (await readMedia(page)).currentTime;
  await changeMotion(page, "reduce");
  await changeMotion(page, "no-preference");
  expect(await readMedia(page)).toMatchObject({
    currentTime: hostPauseTime,
    paused: true,
  });

  await page.getByRole("button", { name: "Resume preview" }).click();
  await expectPlaybackAfter(page, hostPauseTime);
  const oldVideo = await page.locator("video").elementHandle();
  if (!oldVideo) {
    throw new Error("Missing playing preview video.");
  }
  await page.getByRole("button", { name: "Unmount preview" }).click();
  await expect(page.locator("video")).toHaveCount(0);
  expect(
    await oldVideo.evaluate((video: HTMLVideoElement) => ({
      connected: video.isConnected,
      paused: video.paused,
    }))
  ).toEqual({ connected: false, paused: true });
});
