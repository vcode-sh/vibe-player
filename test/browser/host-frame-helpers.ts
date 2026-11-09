import { expect, type Page } from "@playwright/test";
import { readMedia } from "./helpers";

export interface Probe {
  events: string[];
  posters: number;
  states: string[];
}

export const player = ".vibe-player-compact";

/** Records media reloads, poster insertions and chrome phases from now on. */
export async function instrument(page: Page) {
  await page.evaluate((selector) => {
    const probe: Probe = { events: [], posters: 0, states: [] };
    const root = document.querySelector(selector);
    const video = root?.querySelector("video");
    if (!(root && video)) {
      throw new Error("Missing player media.");
    }
    for (const type of ["abort", "emptied", "loadstart"]) {
      video.addEventListener(type, () => probe.events.push(type));
    }
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === "data-state") {
          probe.states.push(root.getAttribute("data-state") ?? "");
        }
        for (const node of record.addedNodes) {
          if (node instanceof HTMLImageElement) {
            probe.posters += 1;
          }
        }
      }
    }).observe(root, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
    });
    Object.assign(window, { vibePlayerProbe: probe });
  }, player);
}

export function readProbe(page: Page): Promise<Probe> {
  return page.evaluate(
    () => (window as unknown as { vibePlayerProbe: Probe }).vibePlayerProbe
  );
}

export async function expectAdvancing(page: Page) {
  const from = (await readMedia(page)).currentTime;
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(from + 0.4);
  expect((await readMedia(page)).paused).toBe(false);
}

export async function startPlayback(page: Page, query = "") {
  await page.goto(`/host-frame.html${query}`);
  await expect(page.locator(`${player} [data-part="poster"]`)).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.locator(player)).toHaveAttribute("data-state", "playing");
  await expectAdvancing(page);
}

export async function togglePlayback(page: Page, name: "Pause" | "Play") {
  await page.locator(player).hover();
  await page
    .locator(`${player} [data-part="controls"]`)
    .getByRole("button", { exact: true, name })
    .click();
}

/** Seeks ahead with ArrowRight (a controller seek) and lets media play on. */
export async function stepForward(page: Page, beyond: number) {
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(beyond);
  await expectAdvancing(page);
}

export async function readSeeks(page: Page) {
  const text = await page
    .getByRole("status", { name: "Seek analytics" })
    .textContent();
  return JSON.parse(text ?? "[]") as {
    currentTime: number;
    from: number;
    initiator: string;
    type: string;
  }[];
}

export function hostOf(page: Page) {
  return page
    .locator("video")
    .evaluate((video) =>
      video
        .closest("[aria-label]:is(section, aside):not(.vibe-player-compact)")
        ?.getAttribute("aria-label")
    );
}
