import { expect, type Page } from "@playwright/test";

const qualityName = /^Quality /;

export async function readMedia(page: Page) {
  return await page.locator("video").evaluate((video: HTMLVideoElement) => ({
    currentTime: video.currentTime,
    muted: video.muted,
    paused: video.paused,
    readyState: video.readyState,
    source: video.currentSrc,
  }));
}

export async function waitForMedia(page: Page) {
  await expect(page.locator("video")).toHaveCount(1);
  await expect
    .poll(async () => (await readMedia(page)).readyState)
    .toBeGreaterThanOrEqual(2);
}

export async function startPlayback(page: Page) {
  await waitForMedia(page);
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect.poll(async () => (await readMedia(page)).paused).toBe(false);
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(0.2);
}

export async function selectHls(page: Page) {
  await page.getByRole("button", { exact: true, name: "HLS source" }).click();
  await expect(page.getByRole("button", { name: qualityName })).toBeVisible();
  await waitForMedia(page);
}
