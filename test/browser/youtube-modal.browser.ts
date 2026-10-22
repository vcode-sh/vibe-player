import { expect, test } from "@playwright/test";

for (const viewport of [
  { height: 800, width: 1280 },
  { height: 844, width: 390 },
]) {
  test(`modal fits outside controls in a ${viewport.width}x${viewport.height} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/youtube-modal.html");
    const iframe = page.locator("iframe.vibe-player-youtube-adapter-frame");
    await expect(iframe).toBeVisible();
    await page
      .locator(".vibe-player-modal__frame")
      .evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished)
        )
      );
    const stage = await page.locator(".vibe-player-stage").boundingBox();
    const frame = await iframe.boundingBox();
    const bar = await page
      .locator(".vibe-player-controls__bottom")
      .boundingBox();
    if (!(stage && frame && bar)) {
      throw new Error("Expected stage, iframe and playback bar boxes.");
    }
    expect(stage.y).toBeGreaterThanOrEqual(0);
    expect(stage.y + stage.height).toBeLessThanOrEqual(viewport.height);
    expect(frame.height).toBeGreaterThanOrEqual(200);
    expect(bar.y).toBeGreaterThanOrEqual(frame.y + frame.height - 0.5);
  });
}
