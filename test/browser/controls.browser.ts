import { expect, test } from "@playwright/test";
import { readMedia, selectHls, startPlayback } from "./helpers";

const highQualityOption = /^180p /;

test("managed HLS quality selection keeps the active media playing", async ({
  page,
}) => {
  await page.goto("/");
  await selectHls(page);
  await startPlayback(page);
  const video = await page.locator("video").elementHandle();
  if (!video) {
    throw new Error("Missing HLS video.");
  }
  const before = (await readMedia(page)).currentTime;
  await page.getByRole("button", { exact: true, name: "Quality Auto" }).click();
  await page.getByRole("option", { name: highQualityOption }).click();

  await expect(
    page.getByRole("button", { exact: true, name: "Quality 180p" })
  ).toBeVisible();
  expect(await video.evaluate((element) => element.isConnected)).toBe(true);
  expect((await readMedia(page)).currentTime).toBeGreaterThanOrEqual(before);
  expect((await readMedia(page)).paused).toBe(false);
});

for (const width of [320, 390, 768]) {
  test(`HLS controls remain reachable at ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");
    await selectHls(page);
    await expectControlsFit(page);
  });
}

for (const width of [240, 280]) {
  test(`controls adapt to a ${width}px embedded player in a wide viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1100 });
    await page.goto(`/?width=${width}`);
    await selectHls(page);
    await expectControlsFit(page);
  });
}

test("fullscreen keeps package controls and toggles back to inline presentation", async ({
  page,
}) => {
  await page.goto("/");
  await startPlayback(page);
  const supported = await page.evaluate(() => document.fullscreenEnabled);
  test.skip(!supported, "This browser does not expose fullscreen support.");
  await page.getByRole("button", { exact: true, name: "Full screen" }).click();

  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  expect(
    await page.evaluate(() => {
      const fullscreen = document.fullscreenElement;
      const video = document.querySelector("video");
      return Boolean(
        fullscreen &&
          video &&
          fullscreen !== video &&
          fullscreen.contains(video)
      );
    })
  ).toBe(true);
  await expect(
    page.getByRole("button", { exact: true, name: "Pause" })
  ).toBeVisible();
  const caption = page.getByText("Local caption proof", { exact: true });
  await expect(caption).toBeVisible();
  expect(
    await caption.evaluate((element) =>
      document.fullscreenElement?.contains(element)
    )
  ).toBe(true);
  await page
    .getByRole("button", { exact: true, name: "Exit full screen" })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  expect((await readMedia(page)).paused).toBe(false);
});

async function expectControlsFit(page: Parameters<typeof selectHls>[0]) {
  const stage = await page.locator(".vibe-player-stage").boundingBox();
  if (!stage) {
    throw new Error("Missing player geometry.");
  }
  const seek = page.getByRole("slider", { exact: true, name: "Seek" });
  const timeline = await seek.boundingBox();
  expect(timeline?.width).toBeGreaterThan(40);
  const names = [
    "Play",
    "Mute, volume 100%",
    "Playback speed 1x",
    "Quality Auto",
    "Hide captions",
    "Full screen",
    "Picture in picture",
  ];
  await Promise.all(
    names.map(async (name) => {
      const control = page.getByRole("button", { exact: true, name });
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      if (!box) {
        throw new Error(`Missing ${name} geometry.`);
      }
      expect(box.x).toBeGreaterThanOrEqual(stage.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(
        stage.y + stage.height + 1
      );
      expect(
        await control.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2
            )
          );
        })
      ).toBe(true);
    })
  );
  await seek.focus();
  await seek.press("ArrowRight");
  await expect(seek).toBeFocused();
}
