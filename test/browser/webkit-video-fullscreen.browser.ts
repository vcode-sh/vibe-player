import { expect, type Page, test } from "@playwright/test";
import { readMedia, startPlayback } from "./helpers";

interface WebKitFullscreenVideo extends HTMLVideoElement {
  webkitDisplayingFullscreen?: boolean;
  webkitExitFullscreen?: () => void;
}

/** Linux WebKit ignores an exit during its enter transition, which has no signal. */
const settleRetry = { intervals: [250, 500, 1000], timeout: 5000 };

function isDisplaying(page: Page) {
  return page
    .locator("video")
    .evaluate(
      (element: WebKitFullscreenVideo) => element.webkitDisplayingFullscreen
    );
}

/**
 * iPhone Safari offers fullscreen only on the video element. Removing the
 * element Fullscreen API before the page runs reproduces that gap; the
 * video's own WebKit fullscreen and its events stay the real engine's.
 */
test("WebKit falls back to video fullscreen without the element Fullscreen API", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Element.prototype, "requestFullscreen");
    Reflect.deleteProperty(Element.prototype, "webkitRequestFullscreen");
  });
  await page.goto("/webkit.html");
  await startPlayback(page);
  const enter = page.getByRole("button", { exact: true, name: "Full screen" });
  const exit = page.getByRole("button", {
    exact: true,
    name: "Exit full screen",
  });
  await expect(enter).toHaveCount(1);

  await enter.click();
  await expect.poll(() => isDisplaying(page)).toBe(true);
  await expect(exit).toHaveCount(1);
  // The platform's own Done control, outside the package chrome.
  await expect(async () => {
    await page
      .locator("video")
      .evaluate((element: WebKitFullscreenVideo) =>
        element.webkitExitFullscreen?.()
      );
    await expect.poll(() => isDisplaying(page), { timeout: 500 }).toBe(false);
  }).toPass(settleRetry);
  await expect(enter).toHaveCount(1);
  expect((await readMedia(page)).paused).toBe(false);

  // The package command leaves through the same API. The fullscreen video
  // covers the page chrome, so the click is dispatched.
  await enter.click();
  await expect.poll(() => isDisplaying(page)).toBe(true);
  await expect(async () => {
    if (await isDisplaying(page)) {
      await exit.dispatchEvent("click", undefined, { timeout: 1000 });
    }
    await expect.poll(() => isDisplaying(page), { timeout: 500 }).toBe(false);
  }).toPass(settleRetry);
  await expect(enter).toHaveCount(1);
});
