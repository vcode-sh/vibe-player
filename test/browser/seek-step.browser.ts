import { expect, type Locator, type Page, test } from "@playwright/test";
import { readMedia, waitForMedia } from "./helpers";

// The fixture plays a 24 s file; compact skins are 360 px wide feed players.
const ripple = '[data-part="seek-ripple"]';

/** Opens a player, plays it once and parks it paused at `seconds`. */
async function openPaused(page: Page, query: string, seconds: number) {
  await page.goto(`/seek-step.html?${query}`);
  await page.getByRole("button", { exact: true, name: "Play" }).first().click();
  await waitForMedia(page);
  await expect.poll(async () => (await readMedia(page)).paused).toBe(false);
  await page.locator("video").evaluate((video: HTMLVideoElement, at) => {
    video.pause();
    video.currentTime = at;
  }, seconds);
  await expectTime(page, seconds);
  return page.locator(".vibe-player-stage");
}

async function expectTime(page: Page, seconds: number) {
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeCloseTo(seconds, 0);
}

/** Taps `fraction` of the picture's width, 30 % down (clear of the bar). */
async function tapPicture(page: Page, root: Locator, fraction: number) {
  const box = await root.locator("video").boundingBox();
  if (!box) {
    throw new Error("Missing video geometry");
  }
  await page.touchscreen.tap(
    box.x + box.width * fraction,
    box.y + box.height * 0.3
  );
}

test.describe("double-tap seek on touch", () => {
  test.use({ hasTouch: true });

  test("compact: each side accumulates, shows the total and fades", async ({
    page,
  }) => {
    const root = await openPaused(page, "skin=glass&doubleTap&step=5", 12);
    await tapPicture(page, root, 0.15);
    await tapPicture(page, root, 0.15);
    const indicator = root.locator(ripple);
    await expect(indicator).toHaveAttribute("data-side", "backward");
    await expect(indicator).toHaveAttribute("data-active", "true");
    await expect(indicator).toHaveText("5 seconds");
    await expectTime(page, 7);
    await tapPicture(page, root, 0.15);
    await expect(indicator).toHaveText("10 seconds");
    await expectTime(page, 2);
    await expect(indicator).toHaveAttribute("data-active", "false");
    await expect(indicator).toBeHidden();
    // The double tap replaced the single tap, which would have played.
    expect((await readMedia(page)).paused).toBe(true);

    await tapPicture(page, root, 0.85);
    await tapPicture(page, root, 0.85);
    await tapPicture(page, root, 0.85);
    await expect(indicator).toHaveAttribute("data-side", "forward");
    await expect(indicator).toHaveText("10 seconds");
    await expectTime(page, 12);
  });

  test("compact: a double tap on a control never seeks", async ({ page }) => {
    const root = await openPaused(page, "skin=glass&doubleTap", 12);
    const mute = root.getByRole("button", { exact: true, name: "Mute" });
    const box = await mute.boundingBox();
    if (!box) {
      throw new Error("Missing mute geometry");
    }
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(400);
    await expect(root.locator(ripple)).toHaveCount(0);
    expect((await readMedia(page)).currentTime).toBeCloseTo(12, 0);
  });

  test("full stage: on by default, by the default 10 s step", async ({
    page,
  }) => {
    const root = await openPaused(page, "skin=stage", 6);
    await tapPicture(page, root, 0.85);
    await tapPicture(page, root, 0.85);
    await expect(root.locator(ripple)).toHaveText("10 seconds");
    await expectTime(page, 16);
  });

  test("reduced motion keeps the indicator without the travelling wave", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const root = await openPaused(page, "skin=chips&doubleTap", 12);
    await tapPicture(page, root, 0.15);
    await tapPicture(page, root, 0.15);
    await expect(root.locator(ripple)).toBeVisible();
    await expect(root.locator(`${ripple} > span`).first()).toHaveCSS(
      "display",
      "none"
    );
    await expectTime(page, 2);
  });
});

for (const skin of ["glass", "stage"] as const) {
  test(`${skin}: arrows and J/L move by the same step`, async ({ page }) => {
    const root = await openPaused(page, `skin=${skin}`, 12);
    await root.evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press("ArrowLeft");
    await expectTime(page, 2);
    await page.keyboard.press("l");
    await expectTime(page, 12);
    await page.keyboard.press("j");
    await expectTime(page, 2);
    await page.keyboard.press("ArrowRight");
    await expectTime(page, 12);
  });
}

for (const skin of ["glass", "chips", "stage"] as const) {
  test(`${skin}: skip buttons move by a configured 15 s`, async ({ page }) => {
    const root = await openPaused(page, `skin=${skin}&skip&step=15`, 20);
    await root.getByRole("button", { name: "Back 15 seconds" }).click();
    await expectTime(page, 5);
    await root.getByRole("button", { name: "Forward 15 seconds" }).click();
    await expectTime(page, 20);
  });
}
