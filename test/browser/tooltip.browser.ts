import { expect, test } from "@playwright/test";
import { waitForMedia } from "./helpers";

test("edge tooltips stay inside the player after repeated layout notifications", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?width=240");
  await waitForMedia(page);
  // Consumer positioning makes the centered caption tooltip cross the edge.
  // Keep real layout measurements and the actual package control.
  await page.addStyleTag({
    content: `.vibe-player-tooltip:has(> button[aria-label="Hide captions"]) {
      position: absolute; right: 0; bottom: 0;
    }`,
  });
  await page.getByRole("button", { name: "Hide captions" }).focus();
  const tooltip = page.getByRole("tooltip", { name: "Hide captions C" });
  await expect(tooltip).toBeVisible();
  const stage = page.locator(".vibe-player-stage");
  const bounds = await stage.boundingBox();
  if (!bounds) {
    throw new Error("Missing player bounds.");
  }
  await expect
    .poll(async () => (await tooltip.boundingBox())?.x ?? -1)
    .toBeGreaterThanOrEqual(bounds.x + 7);

  for (const event of ["resize", "scroll", "resize"]) {
    // biome-ignore lint/performance/noAwaitInLoops: each notification challenges the previous correction.
    await page.evaluate(async (name) => {
      window.dispatchEvent(new Event(name));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    }, event);
    const bubble = await tooltip.boundingBox();
    if (!bubble) {
      throw new Error("Missing visible tooltip.");
    }
    expect(bubble.x).toBeGreaterThanOrEqual(bounds.x + 7);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(
      bounds.x + bounds.width - 7
    );
  }
});
