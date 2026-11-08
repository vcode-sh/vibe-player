import { expect, type Locator, type Page, test } from "@playwright/test";

// The fixture plays a 24 s file with four 160 × 90 sprite tiles, six seconds
// each; `heatmap=off` drops its replay graph.
const frame = ".vibe-player-scrub-frame";

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) {
    throw new Error("Missing geometry");
  }
  return result;
}

async function openCompact(page: Page, query: string) {
  await page.setViewportSize({ height: 600, width: 760 });
  await page.goto(`/heatmap.html?thumbnails&${query}`);
  await page.getByRole("button", { exact: true, name: "Play" }).first().click();
  await expect(page.locator(".vibe-player-compact")).toHaveAttribute(
    "data-state",
    "playing"
  );
  await page
    .locator("[data-part='controls']")
    .getByRole("button", { exact: true, name: "Pause" })
    .click();
  return page.getByRole("slider", { name: "Seek" });
}

async function hoverAt(page: Page, track: Locator, fraction: number) {
  const rail = await box(track.locator(".vibe-player-scrubber__rail"));
  await page.mouse.move(
    rail.x + rail.width * fraction,
    rail.y + rail.height / 2
  );
}

function visibleFrames(page: Page) {
  return page
    .locator(".vibe-player-compact img")
    .evaluateAll(
      (images) =>
        images.filter((image) =>
          image.checkVisibility({ opacityProperty: true })
        ).length
    );
}

test("glass without a heatmap shows the hovered tile above the time", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=glass&heatmap=off");
  const root = page.locator(frame);
  const crop = page.locator(`${frame}__frame`);
  const image = crop.locator("img");
  const player = await box(page.locator(".vibe-player-compact"));
  await expect(root).not.toHaveAttribute("data-active", "");

  // 8.5 s: tile 1, the top-right quarter of the sheet.
  await hoverAt(page, track, 8.5 / 24);
  await expect(root).toHaveAttribute("data-active", "");
  await expect(crop).toBeVisible();
  await expect(page.locator(`${frame}__time`)).toHaveText("0:08");
  let tile = await box(crop);
  let sheet = await box(image);
  expect(sheet.width / tile.width).toBeCloseTo(2);
  expect(sheet.x).toBeCloseTo(tile.x - tile.width, 0);
  expect(sheet.y).toBeCloseTo(tile.y, 0);
  // Same frame box as the heatmap preview: 132 px wide, 16:9, rounded.
  expect(tile.width).toBeCloseTo(132, 0);
  expect(tile.height).toBeCloseTo(74.25, 0);
  await expect(crop).toHaveCSS("border-radius", "9px");
  const time = await box(page.locator(`${frame}__time`));
  expect(time.y).toBeGreaterThan(tile.y + tile.height);
  await expect(page.locator(".vibe-player-glass__bubble")).toBeHidden();
  await expect.poll(() => visibleFrames(page)).toBe(1);

  // 20 s: tile 3, the bottom-right quarter.
  await hoverAt(page, track, 20 / 24);
  tile = await box(crop);
  sheet = await box(image);
  expect(sheet.x).toBeCloseTo(tile.x - tile.width, 0);
  expect(sheet.y).toBeCloseTo(tile.y - tile.height, 0);

  for (const fraction of [0.01, 0.99]) {
    // biome-ignore lint/performance/noAwaitInLoops: one pointer visits each edge in turn.
    await hoverAt(page, track, fraction);
    const preview = await box(page.locator(`${frame}__preview`));
    expect(preview.x).toBeGreaterThanOrEqual(player.x);
    expect(preview.x + preview.width).toBeLessThanOrEqual(
      player.x + player.width
    );
    expect(preview.y).toBeGreaterThanOrEqual(player.y);
  }

  await page.mouse.move(10, 10);
  await expect(root).not.toHaveAttribute("data-active", "");
});

test("a heatmap keeps its own preview, so only one frame shows", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=glass");
  await hoverAt(page, track, 8.5 / 24);
  await expect(page.locator(".vibe-player-heatmap")).toHaveAttribute(
    "data-active",
    ""
  );
  await expect(page.locator(".vibe-player-heatmap__frame")).toBeVisible();
  await expect(page.locator(frame)).toBeHidden();
  // Polled: the heatmap preview fades in over 140 ms.
  await expect.poll(() => visibleFrames(page)).toBe(1);
});

test("a chips keyboard seek shows the frame in place of the readout", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=chips&heatmap=off");
  await track.focus();
  await track.press("End");
  await expect(page.locator(frame)).toHaveAttribute("data-active", "");
  await expect(page.locator(`${frame}__frame`)).toBeVisible();
  await expect(page.locator(`${frame}__time`)).toHaveText("0:24");
  await expect(page.locator(".vibe-player-chips__bubble")).toBeHidden();
  await expect(page.locator(frame)).not.toHaveAttribute("data-active", "");
});

test("reduced motion shows the frame without a fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const track = await openCompact(page, "skin=glass&heatmap=off");
  await hoverAt(page, track, 0.5);
  const preview = page.locator(`${frame}__preview`);
  await expect(preview).toHaveCSS("opacity", "1");
  expect(
    await preview.evaluate((element) => element.getAnimations())
  ).toHaveLength(0);
});
