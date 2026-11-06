import { expect, type Locator, type Page, test } from "@playwright/test";
import { mediaState, player } from "./host-helpers";

const elapsed = /^0:0\d$/;

async function controlsOpacity(surface: Locator) {
  return await surface
    .locator('[data-part="controls"]')
    .evaluate((element) => Number(getComputedStyle(element).opacity));
}

async function expectHidden(surface: Locator, timeout: number) {
  // Visually gone: WebKit may still report the last fraction of the fade.
  await expect
    .poll(() => controlsOpacity(surface), { timeout })
    .toBeLessThan(0.02);
  await expect(
    surface.getByRole("button", { exact: true, name: "Pause" })
  ).toHaveCount(0);
  expect((await mediaState(surface)).paused).toBe(false);
}

async function center(page: Page, surface: Locator) {
  const box = await surface.locator(".host-frame").boundingBox();
  if (!box) {
    throw new Error("The player frame is missing.");
  }
  return { box, x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

for (const variant of ["compact", "feed"]) {
  test(`${variant}: a pointer Play clears the controls while playing and reveals them on movement`, async ({
    page,
  }, testInfo) => {
    const width = variant === "feed" ? 400 : 236;
    await page.goto(
      `/host.html?scenario=layout&variant=${variant}&name=portrait&width=${width}`
    );
    const surface = player(page);
    await expect(surface.locator('[data-part="duration"]')).toHaveText("0:08");
    // A real pointer press: move, down, up on the Play button.
    await surface.getByRole("button", { exact: true, name: "Play" }).click();
    await expect
      .poll(async () => (await mediaState(surface)).currentTime)
      .toBeGreaterThan(0.2);
    const region = surface.getByRole("region", {
      name: "portrait clip video player",
    });
    await expect(region).toBeFocused();
    const time = surface.locator('[data-part="time"]');
    // Below 260 px the capsule drops its time; the scrubber stays.
    if (width >= 260) {
      await expect(time).toHaveText(elapsed);
      expect(
        await time.evaluate((node) => node.scrollWidth <= node.clientWidth)
      ).toBe(true);
    } else {
      await expect(time).toBeHidden();
    }
    const icon = await surface
      .locator('[data-part="toggle"] [data-visible="true"] svg')
      .first()
      .evaluate((svg) => svg.getBoundingClientRect().width);
    expect(icon).toBeGreaterThanOrEqual(18);

    // The pointer rests on the player; 1.5 s without movement hides chrome.
    await expectHidden(surface, 2600);
    // Nothing draws over playing video, not even a progress hairline.
    await expect
      .poll(() =>
        surface.evaluate(
          (section) =>
            Array.from(
              section.querySelectorAll(".vibe-player-surface [data-part]")
            ).filter((part) => getComputedStyle(part).visibility === "visible")
              .length
        )
      )
      .toBe(0);
    await expect(region).toBeFocused();
    await page.screenshot({
      path: testInfo.outputPath(`${variant}-playing-clear.png`),
    });

    const { x, y, box } = await center(page, surface);
    await page.mouse.move(x + 4, y + 4);
    await expect.poll(() => controlsOpacity(surface)).toBeGreaterThan(0.9);
    await page.mouse.move(box.x + box.width + 40, y);
    await expectHidden(surface, 400);

    // Space still reaches the player after its chrome hid.
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await mediaState(surface)).paused)
      .toBe(true);
  });
}

test("keyboard focus on a control keeps the compact controls visible", async ({
  page,
}) => {
  await page.goto("/host.html?scenario=layout&name=portrait&width=236");
  const surface = player(page);
  await page.getByRole("textbox", { name: "Message composer" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    surface.getByRole("button", { exact: true, name: "Play" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(0.2);
  await expect(
    surface.getByRole("region", { name: "portrait clip video player" })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  // Firefox also makes the video element itself a Tab stop.
  if (
    await surface.locator("video").evaluate((video) => video.matches(":focus"))
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(
    surface.getByRole("button", { exact: true, name: "Pause" })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(surface.getByRole("slider", { name: "Seek" })).toBeFocused();
  await expect(surface.locator(".vibe-player-compact")).toHaveAttribute(
    "data-hold",
    "keyboard-focus"
  );
  await page.waitForTimeout(2600);
  expect(await controlsOpacity(surface)).toBe(1);
  expect((await mediaState(surface)).paused).toBe(false);
});
