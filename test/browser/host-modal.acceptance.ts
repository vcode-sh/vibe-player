import { expect, type Locator, test } from "@playwright/test";
import { mediaState } from "./host-helpers";

async function assertContained(surface: Locator) {
  const geometry = await surface.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const visibleButtons = Array.from(
      element.querySelectorAll("button")
    ).filter((button) => {
      const style = getComputedStyle(button);
      return (
        button.getBoundingClientRect().width > 0 &&
        style.visibility !== "hidden" &&
        !button.closest("[inert]")
      );
    });
    return {
      bottom: box.bottom,
      controlsFit: visibleButtons.every((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth + 1 &&
          rect.bottom <= window.innerHeight + 1
        );
      }),
      left: box.left,
      ratio: box.width / box.height,
      right: box.right,
      top: box.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  expect(geometry.controlsFit).toBe(true);
  return geometry.ratio;
}

for (const width of [400, 1280]) {
  for (const name of ["portrait", "landscape"]) {
    test(`${name} modal fits ${width}x900 with reachable playback controls`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto(`/host.html?scenario=modal&name=${name}`);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.evaluate(async (element) => {
        const animations = element
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !==
              Number.POSITIVE_INFINITY
          );
        await Promise.all(
          animations.map((animation) =>
            animation.finished.catch(() => undefined)
          )
        );
      });
      const stage = dialog.getByRole("region");
      const expectedRatio = name === "portrait" ? 9 / 16 : 16 / 9;
      expect(await assertContained(stage)).toBeCloseTo(expectedRatio, 2);
      // Opening the viewer starts playback; nothing needs a second press.
      await expect
        .poll(async () => (await mediaState(stage)).currentTime)
        .toBeGreaterThan(0.2);
      expect((await mediaState(stage)).paused).toBe(false);
      await expect(
        dialog.getByText(`${name} clip`, { exact: true })
      ).toHaveCount(1);
      expect(await assertContained(stage)).toBeCloseTo(expectedRatio, 2);
      await page.screenshot({
        path: testInfo.outputPath(`${name}-modal-${width}-playing.png`),
      });
      await expect
        .poll(async () => (await mediaState(stage)).ended, { timeout: 15_000 })
        .toBe(true);
      await expect(
        stage.getByRole("button", { exact: true, name: "Replay" }).first()
      ).toBeVisible();
      await assertContained(stage);
      await page.screenshot({
        path: testInfo.outputPath(`${name}-modal-${width}-ended.png`),
      });
      await stage
        .getByRole("button", { exact: true, name: "Replay" })
        .first()
        .click();
      await expect
        .poll(async () => (await mediaState(stage)).currentTime)
        .toBeGreaterThan(0.2);
      expect((await mediaState(stage)).currentTime).toBeLessThan(3);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });
  }
}
