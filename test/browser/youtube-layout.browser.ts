import { expect, type Locator, type Page, test } from "@playwright/test";

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

const captionsLabel = /captions/i;
const qualityLabel = /quality/i;
const mutedVolumeLabel = /^Mute, volume/;

// Package surfaces that must never paint over the provider iframe.
const packageSurfaces = [
  ".vibe-player-controls__top",
  ".vibe-player-controls__bottom",
  ".vibe-player-controls__scrim",
  ".vibe-player-stage__status",
  ".vibe-player-tooltip__bubble",
  ".vibe-player-timeline__tooltip",
  ".vibe-player-volume-control__popover",
  ".vibe-player-quality-control__menu",
];

async function box(locator: Locator): Promise<Box> {
  const result = await locator.boundingBox();
  if (!result) {
    throw new Error("Expected a rendered element.");
  }
  return result;
}

function overlaps(a: Box, b: Box): boolean {
  const tolerance = 0.5;
  return (
    a.x + a.width - tolerance > b.x &&
    b.x + b.width - tolerance > a.x &&
    a.y + a.height - tolerance > b.y &&
    b.y + b.height - tolerance > a.y
  );
}

function contains(outer: Box, inner: Box): boolean {
  const tolerance = 0.5;
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

async function openLayout(page: Page, query: string): Promise<Locator> {
  await page.goto(`/youtube-layout.html?${query}`);
  const iframe = page.locator("iframe.vibe-player-youtube-adapter-frame");
  await expect(iframe).toBeVisible();
  return iframe;
}

/** Every rendered package surface stays outside the iframe and inside the stage. */
async function expectNothingCovers(page: Page, iframe: Locator): Promise<void> {
  const frame = await box(iframe);
  expect(frame.width).toBeGreaterThanOrEqual(200);
  expect(frame.height).toBeGreaterThanOrEqual(200);
  const stage = await box(page.locator(".vibe-player-stage"));
  const surfaces = await page.evaluate(
    (selectors) =>
      selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0
            ? [
                {
                  box: {
                    height: rect.height,
                    width: rect.width,
                    x: rect.x,
                    y: rect.y,
                  },
                  selector,
                },
              ]
            : [];
        })
      ),
    packageSurfaces
  );
  expect(surfaces.length).toBeGreaterThan(1);
  for (const surface of surfaces) {
    expect(
      overlaps(surface.box, frame),
      `${surface.selector} covers media`
    ).toBe(false);
    expect(contains(stage, surface.box), `${surface.selector} is clipped`).toBe(
      true
    );
  }
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
    { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 }
  );
  expect(hit).toBe("IFRAME");
}

async function expectSurfacesWhileOpen(
  page: Page,
  iframe: Locator
): Promise<void> {
  await page.getByRole("button", { exact: true, name: "Play" }).hover();
  await expect(page.getByRole("tooltip", { name: "Play" })).toBeVisible();
  await expectNothingCovers(page, iframe);

  await page.getByRole("button", { exact: true, name: "Close" }).hover();
  await expect(page.getByRole("tooltip", { name: "Close" })).toBeVisible();
  await expectNothingCovers(page, iframe);

  const seek = page.getByRole("slider", { exact: true, name: "Seek" });
  const seekBox = await box(seek);
  await page.mouse.move(seekBox.x + seekBox.width * 0.6, seekBox.y + 2);
  await expect(page.locator(".vibe-player-timeline__tooltip")).toBeVisible();
  await expectNothingCovers(page, iframe);

  await page.getByRole("button", { name: mutedVolumeLabel }).hover();
  const volume = page.getByRole("slider", { exact: true, name: "Volume" });
  await expect(volume).toBeVisible();
  await expectNothingCovers(page, iframe);
}

for (const width of [960, 320]) {
  test(`custom controls stay outside the embed in a ${width}px container`, async ({
    page,
  }, testInfo) => {
    const iframe = await openLayout(page, `width=${width}&thumbnails`);
    expect(await page.evaluate(() => window.youtubeLayout.sessions)).toEqual([
      { captionLanguage: "en", controls: "custom" },
    ]);
    await expect(
      page.getByRole("button", { exact: true, name: "Play" })
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: captionsLabel })).toHaveCount(
      0
    );
    await expect(page.getByRole("button", { name: qualityLabel })).toHaveCount(
      0
    );
    await expectNothingCovers(page, iframe);
    await expectSurfacesWhileOpen(page, iframe);
    await page.screenshot({ path: testInfo.outputPath(`custom-${width}.png`) });
  });
}

async function settle(locator: Locator): Promise<void> {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished))
  );
}

/** Captures the iframe's outer edge strips, where package shadows would bleed. */
async function captureFrameEdges(page: Page, iframe: Locator) {
  const frame = await box(iframe);
  const strip = { height: 40, width: frame.width, x: frame.x };
  return await Promise.all([
    page.screenshot({ clip: { ...strip, y: frame.y } }),
    page.screenshot({ clip: { ...strip, y: frame.y + frame.height - 40 } }),
  ]);
}

test("package popovers and their shadows never paint over the embed", async ({
  page,
}) => {
  const iframe = await openLayout(page, "width=960");
  await page.mouse.move(0, 0);
  const [top, bottom] = await captureFrameEdges(page, iframe);

  await page.getByRole("button", { name: mutedVolumeLabel }).hover();
  const popover = page.locator(".vibe-player-volume-control__popover");
  await expect(popover).toBeVisible();
  await settle(popover);
  const [, bottomWithVolume] = await captureFrameEdges(page, iframe);
  expect(bottomWithVolume.equals(bottom)).toBe(true);

  await page.getByRole("button", { exact: true, name: "Close" }).hover();
  const tooltip = page.getByRole("tooltip", { name: "Close" });
  await expect(tooltip).toBeVisible();
  await settle(tooltip);
  const [topWithTooltip] = await captureFrameEdges(page, iframe);
  expect(topWithTooltip.equals(top)).toBe(true);
});

test("horizontal volume slider follows the pointer along its width", async ({
  page,
}) => {
  await openLayout(page, "width=960");
  await page.getByRole("button", { name: mutedVolumeLabel }).hover();
  const volume = page.getByRole("slider", { exact: true, name: "Volume" });
  const slider = await box(volume);
  await page.mouse.move(slider.x + slider.width * 0.25, slider.y + 4);
  await page.mouse.down();
  await page.mouse.up();
  await expect(volume).toHaveAttribute("aria-valuenow", "25");
});

test("keyboard focus reaches package controls and the provider iframe", async ({
  page,
}) => {
  await openLayout(page, "width=960");
  await page.locator(".vibe-player-stage").focus();
  const reached = new Set<string>();
  for (let index = 0; index < 16; index += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: focus traversal is sequential by definition.
    await page.keyboard.press("Tab");
    reached.add(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active?.tagName === "IFRAME"
          ? "IFRAME"
          : (active?.getAttribute("aria-label") ?? active?.textContent ?? "");
      })
    );
  }
  expect(reached).toContain("IFRAME");
  expect(reached).toContain("Play");
  expect(reached).toContain("Close");
});

test("native controls leave playback UI to the provider", async ({
  page,
}, testInfo) => {
  const iframe = await openLayout(page, "controls=native&width=640");
  expect(
    await page.evaluate(() => window.youtubeLayout.sessions[0]?.controls)
  ).toBe("native");
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Play" })
  ).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "Close" }).hover();
  await expect(page.getByRole("tooltip", { name: "Close" })).toBeVisible();
  await expectNothingCovers(page, iframe);
  await page.screenshot({ path: testInfo.outputPath("native-640.png") });
});

test("fullscreen keeps surrounding controls outside the embed", async ({
  page,
}, testInfo) => {
  const iframe = await openLayout(page, "width=960");
  test.skip(
    !(await page.evaluate(() => document.fullscreenEnabled)),
    "This browser does not expose fullscreen support."
  );
  await page.getByRole("button", { exact: true, name: "Full screen" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("vibe-player-stage")
      )
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { exact: true, name: "Exit full screen" })
  ).toBeVisible();
  await expectNothingCovers(page, iframe);
  await expectSurfacesWhileOpen(page, iframe);
  await page.screenshot({ path: testInfo.outputPath("custom-fullscreen.png") });
  await page.evaluate(() => document.exitFullscreen());
});
