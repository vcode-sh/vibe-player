import { expect, test } from "@playwright/test";
import {
  frame,
  isPaused,
  openSkin,
  paintedParts,
  skins,
  startPlayback,
  videoTime,
} from "./host-skins-helpers";

const anyValue = /.+/;
const timeOfDuration = /.+ of .+/;

for (const skin of skins) {
  test.describe(`${skin.name} skin`, () => {
    test("playing clears the frame; movement reveals, leaving hides at once", async ({
      page,
    }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=236&name=portrait`
      );
      await startPlayback(page, surface);
      const box = await frame(surface);
      // The pointer rests on the picture: the idle timer alone hides.
      await page.mouse.move(box.cx + 3, box.cy + 3);
      await expect(surface).toHaveAttribute("data-controls", "visible");
      await page.waitForTimeout(skin.hideMs - 400);
      await expect(surface).toHaveAttribute("data-controls", "visible");
      await expect(surface).toHaveAttribute("data-controls", "hidden", {
        timeout: 900,
      });
      await expect.poll(() => paintedParts(surface)).toEqual([]);
      expect(await isPaused(surface)).toBe(false);

      await page.mouse.move(box.cx - 6, box.cy);
      await expect(surface).toHaveAttribute("data-controls", "visible");
      await page.mouse.move(box.x + box.width + 30, box.cy);
      await expect(surface).toHaveAttribute("data-controls", "hidden", {
        timeout: 100,
      });
      await expect.poll(() => paintedParts(surface)).toEqual([]);
      // A pointer click on a control never pins it: the timer still hides.
      await page.mouse.move(box.cx, box.cy);
      await surface.getByRole("button", { exact: true, name: "Mute" }).click();
      await expect(surface).not.toHaveAttribute("data-hold", anyValue);
      await expect(surface).toHaveAttribute("data-controls", "hidden", {
        timeout: skin.hideMs + 600,
      });
    });

    test("a first touch tap reveals and never pauses; a second hides", async ({
      browser,
      browserName,
    }) => {
      test.skip(browserName === "firefox", "No touch emulation in Firefox.");
      const context = await browser.newContext({
        hasTouch: true,
        viewport: { height: 900, width: 400 },
      });
      try {
        const page = await context.newPage();
        const surface = await openSkin(
          page,
          `skin=${skin.name}&width=236&name=portrait`
        );
        const box = await frame(surface);
        await page.touchscreen.tap(box.cx, box.cy);
        await expect.poll(() => videoTime(surface)).toBeGreaterThan(0.2);
        await expect(surface).toHaveAttribute("data-controls", "hidden", {
          timeout: skin.hideMs + 800,
        });
        await page.touchscreen.tap(box.cx, box.cy - 40);
        await expect(surface).toHaveAttribute("data-controls", "visible");
        expect(await isPaused(surface)).toBe(false);
        await page.touchscreen.tap(box.cx, box.cy - 40);
        await expect(surface).toHaveAttribute("data-controls", "hidden");
        expect(await isPaused(surface)).toBe(false);
        for (const target of await surface.getByRole("button").all()) {
          // biome-ignore lint/performance/noAwaitInLoops: Each visible target is measured once.
          const size = await target.boundingBox();
          if (size) {
            expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(
              44
            );
          }
        }
      } finally {
        await context.close();
      }
    });

    test("scrubbing previews, then commits the new time", async ({ page }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=480&name=landscape`
      );
      await startPlayback(page, surface);
      const box = await frame(surface);
      await page.mouse.move(box.cx, box.cy);
      const before = await videoTime(surface);
      if (skin.name === "glass") {
        const track = await surface
          .getByRole("slider", { name: "Seek" })
          .boundingBox();
        if (!track) {
          throw new Error("The seek track is missing.");
        }
        await page.mouse.move(track.x + track.width * 0.2, track.y + 22);
        await page.mouse.down();
        await page.mouse.move(track.x + track.width * 0.75, track.y + 22, {
          steps: 6,
        });
      } else {
        await page.mouse.move(box.x + box.width * 0.2, box.cy);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.8, box.cy, { steps: 8 });
      }
      await expect(surface).toHaveAttribute("data-scrubbing", "true");
      await expect(surface.locator('[data-part="scrub-bubble"]')).toBeVisible();
      await page.mouse.up();
      await expect(surface).toHaveAttribute("data-scrubbing", "false");
      await expect.poll(() => videoTime(surface)).toBeGreaterThan(before + 3);
      expect(await isPaused(surface)).toBe(false);
    });

    test("arrow keys on the focused player seek with scrub feedback", async ({
      page,
    }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=236&name=portrait`
      );
      await startPlayback(page, surface);
      await page.keyboard.press("Space");
      await expect.poll(() => isPaused(surface)).toBe(true);
      const before = await videoTime(surface);
      await page.keyboard.press("ArrowRight");
      await expect(surface).toHaveAttribute("data-scrubbing", "true");
      await expect.poll(() => videoTime(surface)).toBeGreaterThan(before + 2);
      const slider = surface.getByRole("slider", { name: "Seek" });
      await expect(slider).toHaveAttribute("aria-valuetext", timeOfDuration);
      await expect(surface).toHaveAttribute("data-scrubbing", "false");
    });

    test("ended keeps a Replay action that starts again", async ({ page }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=236&name=portrait`
      );
      await startPlayback(page, surface);
      await surface.locator("video").evaluate((video: HTMLVideoElement) => {
        video.currentTime = video.duration - 0.2;
      });
      await page.mouse.move(2, 2);
      await expect(surface).toHaveAttribute("data-state", "ended");
      const replay = surface.getByRole("button", {
        exact: true,
        name: "Replay",
      });
      await expect(replay).toBeVisible();
      await replay.click();
      await expect(surface).toHaveAttribute("data-state", "playing");
      await expect.poll(() => videoTime(surface)).toBeLessThan(3);
    });

    test("an error shows the designed panel with its retry action", async ({
      page,
    }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=236&name=portrait&scenario=error`
      );
      const box = await frame(surface);
      await page.mouse.click(box.cx, box.cy);
      await expect(surface).toHaveAttribute("data-state", "error");
      const panel = surface.locator('[data-part="error"]');
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("This video is unavailable");
      const retry = panel.getByRole("button", { name: "Try again" });
      await expect(retry).toBeVisible();
      const renewals = page.getByRole("status", { name: "Renewals" });
      const count = Number(await renewals.textContent());
      await retry.click();
      await expect(renewals).toHaveText(String(count + 1));
    });

    test("the renewal indicator waits 600 ms and covers nothing else", async ({
      page,
    }) => {
      const surface = await openSkin(
        page,
        `skin=${skin.name}&width=480&name=long&scenario=expiry&lifetime=3000&renewDelay=2000`
      );
      await startPlayback(page, surface);
      await page.mouse.move(2, 2);
      // Record transition times in the page; polling would blur them.
      await surface.evaluate((root) => {
        const marks: Record<string, number> = {};
        Object.assign(window, { renewalMarks: marks });
        new MutationObserver(() => {
          const state = root.getAttribute("data-state");
          const busy = root.getAttribute("data-busy");
          if (state === "renewing") {
            marks.renewing ??= performance.now();
            if (busy === "true") {
              marks.busy ??= performance.now();
            }
          }
        }).observe(root, { attributes: true });
      });
      await page.waitForFunction(
        () =>
          (window as unknown as { renewalMarks: Record<string, number> })
            .renewalMarks.busy !== undefined,
        null,
        { timeout: 15_000 }
      );
      const marks = await page.evaluate(
        () =>
          (window as unknown as { renewalMarks: Record<string, number> })
            .renewalMarks
      );
      expect((marks.busy ?? 0) - (marks.renewing ?? 0)).toBeGreaterThanOrEqual(
        580
      );
      const indicator = skin.name === "glass" ? "renewing" : "play-button";
      await expect.poll(() => paintedParts(surface)).toContain(indicator);
      await expect(surface).toHaveAttribute("data-state", "playing", {
        timeout: 15_000,
      });
    });
  });
}
