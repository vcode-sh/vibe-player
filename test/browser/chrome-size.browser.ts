import { expect, type Page, test } from "@playwright/test";
import { readMedia, waitForMedia } from "./helpers";

// Expected values are the 0.6.0 compact chrome (defaults) and the fixture's
// `--vibe-player-compact-*` overrides in chrome-size.css.

interface Box {
  height: number;
  width: number;
}

interface Chrome {
  buttons: Box[];
  center: Box | null;
  /** Capsule (glass) or the play chip's hit area (chips). */
  controls: Box & { bottom: number; left: number; right: number };
  railHeight: number;
  timeSize: number;
}

/** Opens a player, plays it once and leaves it paused with chrome shown. */
async function openPaused(page: Page, skin: string, size: string) {
  await page.goto(`/chrome-size.html?skin=${skin}&size=${size}`);
  await page.getByRole("button", { exact: true, name: "Play" }).first().click();
  await waitForMedia(page);
  await expect.poll(async () => (await readMedia(page)).paused).toBe(false);
  await page.locator("video").evaluate((video: HTMLVideoElement) => {
    video.pause();
  });
  await expect(page.locator(".vibe-player-compact")).toHaveAttribute(
    "data-state",
    "paused"
  );
  // Measure settled chrome, not a reveal mid-transition.
  await page.waitForFunction(
    () =>
      !document.getAnimations().some((item) => item instanceof CSSTransition)
  );
}

function measure(page: Page, skin: string): Promise<Chrome> {
  return page.evaluate((chips) => {
    const frame = document.querySelector(".vibe-player-compact");
    const controls = document.querySelector(
      chips ? ".vibe-player-chips__primary" : '[data-part="controls"]'
    );
    if (!(frame && controls)) {
      throw new Error("Missing compact chrome");
    }
    const outer = frame.getBoundingClientRect();
    const box = controls.getBoundingClientRect();
    const size = (rect: DOMRect) => ({
      height: rect.height,
      width: rect.width,
    });
    const shown = [
      ...frame.querySelectorAll<HTMLElement>(".vibe-player-surface button"),
    ].filter((button) => {
      const style = getComputedStyle(button);
      return button.offsetParent !== null && style.visibility === "visible";
    });
    const center = document.querySelector('[data-part="play-button"]');
    const centerShown =
      !chips && center && getComputedStyle(center).visibility === "visible";
    const rail = frame.querySelector(".vibe-player-scrubber__rail");
    const time = frame.querySelector(
      chips ? ".vibe-player-chips__face" : '[data-part="time"]'
    );
    return {
      buttons: shown.map((button) => size(button.getBoundingClientRect())),
      center: centerShown ? size(center.getBoundingClientRect()) : null,
      controls: {
        ...size(box),
        bottom: outer.bottom - box.bottom,
        left: box.left - outer.left,
        right: outer.right - box.right,
      },
      railHeight: rail ? rail.getBoundingClientRect().height : 0,
      timeSize: time ? Number.parseFloat(getComputedStyle(time).fontSize) : 0,
    };
  }, skin === "chips");
}

/** Space between the capsule's Play toggle and the next drawn part. */
function toggleGap(page: Page) {
  return page.locator('[data-part="toggle"]').evaluate((toggle) => {
    let next = toggle.nextElementSibling;
    // Skip buttons are not drawn below 280 px.
    while (next && next.getBoundingClientRect().width === 0) {
      next = next.nextElementSibling;
    }
    if (!next) {
      throw new Error("Missing capsule geometry");
    }
    const left = toggle.getBoundingClientRect().right;
    return next.getBoundingClientRect().left - left;
  });
}

test.describe("compact chrome sizing variables", () => {
  test("glass keeps its 0.6.0 geometry without variables", async ({ page }) => {
    await openPaused(page, "glass", "default");
    const chrome = await measure(page, "glass");
    expect(chrome.controls).toMatchObject({ bottom: 8, height: 44, left: 8 });
    expect(chrome.controls.right).toBe(8);
    for (const button of chrome.buttons.filter((b) => b.width !== 56)) {
      expect(button).toEqual({ height: 44, width: 44 });
    }
    expect(chrome.center).toEqual({ height: 56, width: 56 });
    expect(chrome.railHeight).toBe(4);
    expect(chrome.timeSize).toBe(12);
    expect(await toggleGap(page)).toBe(0);
  });

  test("chips keeps its 0.6.0 geometry without variables", async ({ page }) => {
    await openPaused(page, "chips", "default");
    const chrome = await measure(page, "chips");
    expect(chrome.controls).toMatchObject({ bottom: 2, height: 44, left: 2 });
    for (const button of chrome.buttons.filter((b) => b.height === b.width)) {
      expect(button).toEqual({ height: 44, width: 44 });
    }
    const dot = await page
      .locator('[data-part="mute"] .vibe-player-chips__dot')
      .boundingBox();
    expect(dot).toMatchObject({ height: 28, width: 28 });
    expect(chrome.railHeight).toBe(6);
    expect(chrome.timeSize).toBe(12);
  });

  test("glass scales with container units in a 200 px frame", async ({
    page,
  }) => {
    await openPaused(page, "glass", "small");
    const chrome = await measure(page, "glass");
    // 14cqw of the 200 px player; against the viewport it would clamp to 44.
    expect(chrome.controls).toMatchObject({ bottom: 6, height: 28, left: 6 });
    expect(chrome.center).toEqual({ height: 36, width: 36 });
    expect(chrome.railHeight).toBe(3);
    expect(chrome.timeSize).toBe(11);
    expect(await toggleGap(page)).toBe(2);
    const icon = await page
      .locator('[data-part="toggle"] svg')
      .first()
      .boundingBox();
    expect(icon).toMatchObject({ height: 14, width: 14 });
    for (const button of chrome.buttons.filter((b) => b.width !== 36)) {
      expect(button).toEqual({ height: 28, width: 28 });
    }
  });

  test("chips scales in a 200 px frame", async ({ page }) => {
    await openPaused(page, "chips", "small");
    const chrome = await measure(page, "chips");
    expect(chrome.controls).toMatchObject({ bottom: 6, height: 28, left: 6 });
    const dot = await page
      .locator('[data-part="mute"] .vibe-player-chips__dot')
      .boundingBox();
    expect(dot).toMatchObject({ height: 22, width: 22 });
    expect(chrome.railHeight).toBe(3);
    expect(chrome.timeSize).toBe(11);
  });

  for (const skin of ["glass", "chips"]) {
    test(`${skin} hit areas never drop below 24 px`, async ({ page }) => {
      await openPaused(page, skin, "tiny");
      const chrome = await measure(page, skin);
      expect(chrome.buttons.length).toBeGreaterThan(1);
      for (const button of chrome.buttons) {
        expect(button.width).toBeGreaterThanOrEqual(24);
        expect(button.height).toBeGreaterThanOrEqual(24);
      }
      if (skin === "glass") {
        expect(chrome.center).toEqual({ height: 24, width: 24 });
      }
    });
  }
});
