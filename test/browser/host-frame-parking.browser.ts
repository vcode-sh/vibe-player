import { expect, test } from "@playwright/test";
import {
  expectAdvancing,
  hostOf,
  instrument,
  player,
  readProbe,
  startPlayback,
} from "./host-frame-helpers";

for (const atomic of [true, false]) {
  test(`playback survives its host leaving the page${atomic ? "" : " without moveBefore"}`, async ({
    page,
  }) => {
    if (!atomic) {
      await page.addInitScript(() => {
        Reflect.deleteProperty(Element.prototype, "moveBefore");
      });
    }
    await startPlayback(page);
    const video = await page.locator("video").elementHandle();
    await instrument(page);

    await page
      .getByRole("button", { exact: true, name: "Remove slot" })
      .click();
    await expect(page.getByRole("region", { name: "Inline slot" })).toHaveCount(
      0
    );
    expect(await hostOf(page)).toBeUndefined();
    expect(await video?.evaluate((element) => element.isConnected)).toBe(true);
    expect(
      await video?.evaluate((element) =>
        Boolean(element.closest(".vibe-player-parking[inert]"))
      )
    ).toBe(true);
    // Parked media stays alive and keeps playing.
    await expectAdvancing(page);

    await page
      .getByRole("button", { exact: true, name: "Restore slot" })
      .click();
    await expect.poll(() => hostOf(page)).toBe("Inline slot");
    await expectAdvancing(page);
    expect(
      await page.evaluate(
        (element) => element === document.querySelector("video"),
        video
      )
    ).toBe(true);
    expect(await page.locator(".vibe-player-parking").count()).toBe(0);
    expect((await readProbe(page)).events).toEqual([]);
  });
}

test("a parked player keeps playing under the default offscreen release", async ({
  page,
}) => {
  await startPlayback(page, "?offscreen=default");
  await instrument(page);
  await page.getByRole("button", { exact: true, name: "Remove slot" }).click();
  await expect(page.locator(".vibe-player-parking video")).toHaveCount(1);
  // Long enough for the observer to report the parking root as offscreen.
  await expectAdvancing(page);
  await expectAdvancing(page);
  await expect(page.locator(player)).toHaveAttribute("data-state", "playing");

  await page.getByRole("button", { exact: true, name: "Restore slot" }).click();
  await expect.poll(() => hostOf(page)).toBe("Inline slot");
  await expectAdvancing(page);
  expect((await readProbe(page)).events).toEqual([]);
});
