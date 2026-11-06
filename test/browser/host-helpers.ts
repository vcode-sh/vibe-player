import { expect, type Locator, type Page } from "@playwright/test";

export const mediaOrigin = "http://127.0.0.1:5222";

export function player(page: Page, name = "portrait") {
  return page.getByRole("region", { exact: true, name: `${name} player` });
}

export async function mediaState(surface: Locator) {
  return await surface.locator("video").evaluate((video: HTMLVideoElement) => ({
    currentTime: video.currentTime,
    duration: video.duration,
    ended: video.ended,
    height: video.videoHeight,
    paused: video.paused,
    readyState: video.readyState,
    source: video.currentSrc,
    width: video.videoWidth,
  }));
}

export async function play(surface: Locator) {
  await surface
    .getByRole("button", { exact: true, name: "Play" })
    .first()
    .click();
  await expect(surface.locator("video")).toHaveCount(1);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(0.2);
  await expect.poll(async () => (await mediaState(surface)).paused).toBe(false);
}

export async function assertNoOverflow(page: Page, surface: Locator) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  const outside = await surface.evaluate((section) => {
    const box = section.getBoundingClientRect();
    return Array.from(section.querySelectorAll("button, input, video")).some(
      (element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < box.left - 1 || rect.right > box.right + 1)
        );
      }
    );
  });
  expect(outside).toBe(false);
}
