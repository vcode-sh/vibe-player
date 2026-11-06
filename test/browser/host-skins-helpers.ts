import { expect, type Locator, type Page } from "@playwright/test";

export const skins = [
  { hideMs: 1400, name: "glass" },
  { hideMs: 1200, name: "chips" },
] as const;

export function skinPlayer(page: Page) {
  return page.locator(".vibe-player-compact");
}

export async function openSkin(page: Page, parameters: string) {
  await page.goto(`/skins.html?${parameters}`);
  const surface = skinPlayer(page);
  await expect(surface).toHaveAttribute("data-state", "idle");
  await page.mouse.move(2, 2);
  return surface;
}

export async function videoTime(surface: Locator) {
  return await surface
    .locator("video")
    .evaluate((video: HTMLVideoElement) => video.currentTime);
}

export async function isPaused(surface: Locator) {
  return await surface
    .locator("video")
    .evaluate((video: HTMLVideoElement) => video.paused);
}

export async function frame(surface: Locator) {
  const box = await surface.boundingBox();
  if (!box) {
    throw new Error("The player frame is missing.");
  }
  return { ...box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
}

/** Elements of the skin overlay that currently paint over the video. */
export async function paintedParts(surface: Locator) {
  return await surface.evaluate((root) => {
    const overlay = root.querySelector(".vibe-player-surface");
    if (!overlay) {
      return [];
    }
    // Parts and glyphs draw; wrappers without a part only position them.
    return Array.from(overlay.querySelectorAll<HTMLElement>("[data-part], svg"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        let opacity = 1;
        for (
          let node: HTMLElement | null = element;
          node && node !== root;
          node = node.parentElement
        ) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        return (
          style.visibility === "visible" &&
          opacity > 0.02 &&
          box.width > 0 &&
          box.height > 0
        );
      })
      .map((element) => element.dataset?.part ?? element.tagName);
  });
}

/** Clicks the centre and waits for real playback. */
export async function startPlayback(page: Page, surface: Locator) {
  const box = await frame(surface);
  await page.mouse.click(box.cx, box.cy);
  await expect.poll(() => videoTime(surface)).toBeGreaterThan(0.2);
  await expect(surface).toHaveAttribute("data-state", "playing");
}
