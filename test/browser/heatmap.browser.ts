import { expect, type Locator, type Page, test } from "@playwright/test";
import { waitForMedia } from "./helpers";

// The fixture plays a 24 s file; its replay values peak at 50 % and its four
// 160 × 90 sprite tiles cover six seconds each.
const heatmap = ".vibe-player-heatmap";
const graph = `${heatmap}__graph`;

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) {
    throw new Error("Missing geometry");
  }
  return result;
}

/** Opens a compact player and pauses it once the duration is known. */
async function openCompact(page: Page, query: string) {
  await page.setViewportSize({ height: 600, width: 760 });
  await page.goto(`/heatmap.html?${query}`);
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
  const x = rail.x + rail.width * fraction;
  await page.mouse.move(x, rail.y + rail.height / 2);
  return x;
}

function clipPath(page: Page) {
  return page
    .locator(graph)
    .evaluate((element) => getComputedStyle(element).clipPath);
}

test("glide is absent at rest, draws on hover and retracts on leave", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=glass&thumbnails");
  const root = page.locator(heatmap);
  await expect(root).toHaveCSS("visibility", "hidden");
  expect(await clipPath(page)).toBe("inset(-8px 100% -2px 0px)");

  const peakX = await hoverAt(page, track, 0.5);
  await expect(root).toHaveAttribute("data-active", "");
  await expect(root).toHaveCSS("visibility", "visible");
  await expect.poll(() => clipPath(page)).toBe("inset(-8px -2px -2px)");
  await expect(root).toContainText("0:12Most replayed");
  const dot = page.locator(`${heatmap}__dot`);
  const peakDot = await box(dot);
  expect(peakDot.x + peakDot.width / 2).toBeCloseTo(peakX, 0);

  const tailX = await hoverAt(page, track, 0.8);
  await expect(root).toContainText("of viewers");
  const tailDot = await box(dot);
  expect(tailDot.x + tailDot.width / 2).toBeCloseTo(tailX, 0);
  // The line is lower away from the peak.
  expect(tailDot.y).toBeGreaterThan(peakDot.y + 10);

  await page.mouse.move(10, 10);
  await expect(root).not.toHaveAttribute("data-active", "");
  await expect(root).toHaveCSS("visibility", "hidden");
  await expect.poll(() => clipPath(page)).toBe("inset(-8px 100% -2px 0px)");
});

test("leaving mid-reveal retracts from where the line got to", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=glass");
  await hoverAt(page, track, 0.3);
  await page.waitForTimeout(120);
  await page.mouse.move(10, 10);
  const from = await page.locator(graph).evaluate((element) => {
    const [transition] = element.getAnimations();
    return transition?.effect instanceof KeyframeEffect
      ? transition.effect.getKeyframes()[0]?.clipPath
      : undefined;
  });
  // A reversed transition starts from the partial reveal, not either end.
  expect(from).toBeDefined();
  expect(from).not.toBe("inset(-8px -2px -2px)");
  expect(from).not.toBe("inset(-8px 100% -2px 0px)");
});

test("reduced motion reaches the drawn state at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const track = await openCompact(page, "skin=glass");
  await hoverAt(page, track, 0.5);
  await expect(page.locator(heatmap)).toHaveAttribute("data-active", "");
  expect(await clipPath(page)).toBe("inset(-8px -2px -2px)");
  expect(
    await page.locator(graph).evaluate((element) => element.getAnimations())
  ).toHaveLength(0);
});

test("the frame shows the hovered sprite tile inside the player", async ({
  page,
}) => {
  const track = await openCompact(page, "skin=glass&thumbnails");
  const frame = page.locator(`${heatmap}__frame`);
  const image = frame.locator("img");
  const player = await box(page.locator(".vibe-player-compact"));

  // 8.5 s: tile 1, the top-right quarter of the sheet.
  await hoverAt(page, track, 8.5 / 24);
  await expect(frame).toBeVisible();
  let crop = await box(frame);
  let sheet = await box(image);
  expect(sheet.width / crop.width).toBeCloseTo(2);
  expect(sheet.x).toBeCloseTo(crop.x - crop.width, 0);
  expect(sheet.y).toBeCloseTo(crop.y, 0);

  // 20 s: tile 3, the bottom-right quarter.
  await hoverAt(page, track, 20 / 24);
  crop = await box(frame);
  sheet = await box(image);
  expect(sheet.x).toBeCloseTo(crop.x - crop.width, 0);
  expect(sheet.y).toBeCloseTo(crop.y - crop.height, 0);

  for (const fraction of [0.01, 0.99]) {
    // biome-ignore lint/performance/noAwaitInLoops: one pointer visits each edge in turn.
    await hoverAt(page, track, fraction);
    const preview = await box(page.locator(`${heatmap}__preview`));
    expect(preview.x).toBeGreaterThanOrEqual(player.x);
    expect(preview.x + preview.width).toBeLessThanOrEqual(
      player.x + player.width
    );
    expect(preview.y).toBeGreaterThanOrEqual(player.y);
  }
});

test("keyboard and touch scrubs show the graph only while they last", async ({
  browser,
}) => {
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  try {
    const track = await openCompact(page, "skin=glass");
    const root = page.locator(heatmap);
    await track.focus();
    await track.press("Home");
    await expect(root).toHaveAttribute("data-active", "");
    await expect(root).toContainText("0:00");
    await expect(root).not.toHaveAttribute("data-active", "");

    const rail = await box(track.locator(".vibe-player-scrubber__rail"));
    const y = rail.y + rail.height / 2;
    const cdp = await context.newCDPSession(page);
    const touch = (type: "touchEnd" | "touchMove" | "touchStart", x: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
        type,
      });
    await touch("touchStart", rail.x + rail.width * 0.2);
    await touch("touchMove", rail.x + rail.width * 0.5);
    await expect(root).toHaveAttribute("data-active", "");
    await expect(root).toContainText("Most replayed");
    await touch("touchEnd", 0);
    await expect(root).not.toHaveAttribute("data-active", "");
  } finally {
    await context.close();
  }
});

test("chips and the full stage show the same preview instead of their readouts", async ({
  page,
}) => {
  const chips = await openCompact(page, "skin=chips&thumbnails");
  await chips.focus();
  await chips.press("Home");
  await expect(page.locator(heatmap)).toHaveAttribute("data-active", "");
  await expect(page.locator(".vibe-player-chips__bubble")).toBeHidden();

  await page.goto("/heatmap.html?skin=stage&thumbnails&variant=curve");
  await waitForMedia(page);
  const timeline = await box(page.locator("[data-vibe-player-timeline]"));
  await page.mouse.move(
    timeline.x + timeline.width * 0.5,
    timeline.y + timeline.height / 2
  );
  await expect(page.locator(heatmap)).toHaveAttribute("data-active", "");
  await expect(page.locator(heatmap)).toContainText("Most replayed");
  await expect(page.locator(`${heatmap}__frame`)).toBeVisible();
  await expect(page.locator(".vibe-player-timeline__tooltip")).toBeHidden();

  // A click focuses the range input; only keyboard focus keeps the graph.
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(timeline.x + timeline.width / 2, timeline.y - 200);
  await expect(page.locator(heatmap)).not.toHaveAttribute("data-active", "");
});
