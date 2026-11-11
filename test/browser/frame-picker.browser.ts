import { expect, type Page, test } from "@playwright/test";
import { readMedia } from "./helpers";

// The fixture renders a 24 s picker, 480 px wide, that starts at 3 s.
const fullDuration = /^2[34]/;

async function openPicker(page: Page, provider: "file" | "hls") {
  await page.goto(`/frame-picker.html?provider=${provider}`);
  const slider = page.getByRole("slider", { name: "Cover frame" });
  // The media loads eagerly although the adapter defaults to preload none.
  await expect(slider).not.toHaveAttribute("aria-disabled", "true");
  await expect(slider).toHaveAttribute("aria-valuemax", fullDuration);
  return slider;
}

async function expectFrameAt(page: Page, seconds: number) {
  await expect
    .poll(async () => {
      const media = await readMedia(page);
      return media.readyState >= 2 && Math.abs(media.currentTime - seconds);
    })
    .toBeLessThan(0.05);
}

for (const provider of ["file", "hls"] as const) {
  test(`${provider}: shows a paused, muted frame at the picked time`, async ({
    page,
  }) => {
    const slider = await openPicker(page, provider);
    await expectFrameAt(page, 3);

    await slider.focus();
    await page.keyboard.press("PageUp");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("output")).toHaveText("4.1");
    await expectFrameAt(page, 4.1);

    // Click 75 % along the rail: 18 s of 24.
    const box = await slider.boundingBox();
    if (!box) {
      throw new Error("Missing rail geometry");
    }
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const picked = Number(await page.locator("output").textContent());
    expect(picked).toBeCloseTo(18, 0);
    await expectFrameAt(page, picked);
    await expect(slider).toBeFocused();

    const media = await readMedia(page);
    expect(media.paused).toBe(true);
    expect(media.muted).toBe(true);
  });
}

test("the rail keeps a 44 px target and draws the filmstrip", async ({
  page,
}) => {
  const slider = await openPicker(page, "file");
  const box = await slider.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("[data-part='strip'] img").first()).toBeVisible();
});
