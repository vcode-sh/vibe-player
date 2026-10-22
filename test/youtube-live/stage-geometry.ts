import { expect, type Page } from "@playwright/test";

const packageSurfaces = [
  ".vibe-player-controls__top",
  ".vibe-player-controls__bottom",
  ".vibe-player-stage__status",
  ".vibe-player-tooltip__bubble",
  ".vibe-player-timeline__tooltip",
  ".vibe-player-volume-control__popover",
];

/** Asserts that no rendered package surface intersects the provider iframe. */
export async function expectEmbedUncovered(page: Page): Promise<void> {
  const result = await page.evaluate((selectors) => {
    const frame = document.querySelector("iframe")?.getBoundingClientRect();
    if (!frame) {
      return { covering: ["missing iframe"], height: 0, width: 0 };
    }
    const covering = selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const overlaps =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right - 0.5 > frame.left &&
          frame.right - 0.5 > rect.left &&
          rect.bottom - 0.5 > frame.top &&
          frame.bottom - 0.5 > rect.top;
        return overlaps ? [selector] : [];
      })
    );
    return { covering, height: frame.height, width: frame.width };
  }, packageSurfaces);
  expect(result.covering).toEqual([]);
  expect(result.width).toBeGreaterThanOrEqual(200);
  expect(result.height).toBeGreaterThanOrEqual(200);
}

export async function readStageSnapshot(page: Page) {
  return await page.evaluate(
    () => window.youtubeStageAcceptance.state?.snapshot ?? null
  );
}
