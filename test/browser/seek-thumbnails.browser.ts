import { expect, test } from "@playwright/test";
import { readMedia, waitForMedia } from "./helpers";

for (const width of [240, 320, 390, 1100]) {
  test(`seek preview follows hover, drag and keyboard within a ${width}px player`, async ({
    page,
  }) => {
    await page.setViewportSize({
      height: 900,
      width: width < 400 ? Math.max(320, width) : 1200,
    });
    await page.goto(`/?thumbnails&width=${width}`);
    await waitForMedia(page);
    const seek = page.getByRole("slider", { name: "Seek" });
    const timeline = await page
      .locator("[data-vibe-player-timeline]")
      .boundingBox();
    if (!timeline) {
      throw new Error("Missing timeline geometry");
    }
    const preview = page.locator(".vibe-player-timeline__tooltip");
    const frame = page.locator(".vibe-player-seek-thumbnail");
    const image = frame.locator("img");
    const y = timeline.y + timeline.height / 2;
    await page.mouse.move(
      Math.round(timeline.x + timeline.width * (8.5 / 24)),
      y
    );
    await expect(frame).toBeVisible();
    await expect(preview).toContainText("00:08");
    await expect(image).toHaveAttribute("src", "/media/seek-sprite.jpg");
    const crop = await frame.boundingBox();
    const sheet = await image.boundingBox();
    if (!(crop && sheet)) {
      throw new Error("Missing sprite geometry");
    }
    expect(sheet.width / crop.width).toBeCloseTo(2);
    expect(sheet.x).toBeCloseTo(crop.x - crop.width, 1);
    expect((await readMedia(page)).currentTime).toBe(0);
    expect((await readMedia(page)).paused).toBe(true);

    for (const fraction of [0.01, 0.99]) {
      // biome-ignore lint/performance/noAwaitInLoops: one pointer visits each edge sequentially.
      await page.mouse.move(timeline.x + timeline.width * fraction, y);
      await expect(frame).toBeVisible();
      const box = await preview.boundingBox();
      const stage = await page.locator(".vibe-player-stage").boundingBox();
      if (!(box && stage)) {
        throw new Error("Missing preview geometry");
      }
      expect(box.x).toBeGreaterThanOrEqual(stage.x);
      expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
      expect(box.y).toBeGreaterThanOrEqual(stage.y);
      expect(box.y + box.height).toBeLessThanOrEqual(timeline.y);
    }

    const dragX = Math.floor(timeline.x + timeline.width * 0.8);
    await page.mouse.move(dragX, y);
    await page.mouse.down();
    await expect
      .poll(async () => (await readMedia(page)).currentTime)
      .toBeCloseTo(((dragX - timeline.x) / timeline.width) * 24, 1);
    const lastCrop = await frame.boundingBox();
    const lastSheet = await image.boundingBox();
    if (!(lastCrop && lastSheet)) {
      throw new Error("Missing last sprite geometry");
    }
    expect(lastSheet.y).toBeCloseTo(lastCrop.y - lastCrop.height, 1);
    await page.mouse.up();
    await seek.focus();
    // Home exercises keyboard priority without backend end-of-file seek behavior.
    await seek.press("Home");
    await expect(preview).toContainText("00:00");
    await expect(frame).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((video: HTMLVideoElement) => video.seeking)
      )
      .toBe(false);
    await seek.press("ArrowRight");
    await expect
      .poll(async () => (await readMedia(page)).currentTime)
      .toBeCloseTo(0.1);

    await page.mouse.move(timeline.x + timeline.width * 0.6, y);
    await expect(image).toHaveAttribute("src", "/media/seek-frame.jpg");
    await expect(frame).toBeVisible();
    await page
      .locator(".vibe-player-stage")
      .screenshot({ path: `test-results/seek-preview-${width}.png` });
  });
}

test("failed thumbnail keeps the time tooltip and working seek", async ({
  page,
}) => {
  await page.route("**/media/seek-sprite.jpg", (route) => route.abort());
  await page.goto("/?thumbnails");
  await waitForMedia(page);
  const seek = page.getByRole("slider", { name: "Seek" });
  await seek.focus();
  await expect(page.locator(".vibe-player-timeline__tooltip")).toContainText(
    "00:00"
  );
  await expect(page.locator(".vibe-player-seek-thumbnail")).toHaveCount(0);
  await seek.press("ArrowRight");
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeCloseTo(0.1);
});
