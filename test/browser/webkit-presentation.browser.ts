import { expect, test } from "@playwright/test";
import { readMedia, startPlayback } from "./helpers";

interface PresentationVideo extends HTMLVideoElement {
  webkitPresentationMode?: string;
  webkitSetPresentationMode?: (mode: "inline" | "picture-in-picture") => void;
  webkitSupportsPresentationMode?: (mode: "picture-in-picture") => boolean;
}

test("WebKit fullscreen preserves native HLS, captions and package controls", async ({
  page,
}) => {
  await page.goto("/webkit.html");
  await startPlayback(page);
  const supported = await page.evaluate(
    () =>
      document.fullscreenEnabled &&
      Boolean(HTMLElement.prototype.requestFullscreen)
  );
  const enter = page.getByRole("button", { exact: true, name: "Full screen" });
  if (!supported) {
    test.info().annotations.push({
      description: "This WebKit platform has no container fullscreen API.",
      type: "unsupported-platform-api",
    });
    await expect(enter).toHaveCount(0);
    return;
  }
  await enter.click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement !== null))
    .toBe(true);
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

test("WebKit picture-in-picture controls match the actual platform capability", async ({
  page,
}) => {
  await page.goto("/webkit.html");
  await startPlayback(page);
  const supported = await page.locator("video").evaluate((element) => {
    const video = element as PresentationVideo;
    return Boolean(
      (document.pictureInPictureEnabled && video.requestPictureInPicture) ||
        (video.webkitSetPresentationMode &&
          video.webkitSupportsPresentationMode?.("picture-in-picture"))
    );
  });
  const enter = page.getByRole("button", {
    exact: true,
    name: "Picture in picture",
  });
  if (!supported) {
    test.info().annotations.push({
      description: "This WebKit platform has no picture-in-picture API.",
      type: "unsupported-platform-api",
    });
    await expect(enter).toHaveCount(0);
    return;
  }
  await enter.click();
  await expect.poll(() => hasPictureInPicture(page)).toBe(true);
  await page
    .getByRole("button", { exact: true, name: "Exit picture in picture" })
    .click();
  await expect.poll(() => hasPictureInPicture(page)).toBe(false);
  expect((await readMedia(page)).paused).toBe(false);
});

async function hasPictureInPicture(page: Parameters<typeof startPlayback>[0]) {
  return await page.locator("video").evaluate((element) => {
    const video = element as PresentationVideo;
    return (
      document.pictureInPictureElement === video ||
      video.webkitPresentationMode === "picture-in-picture"
    );
  });
}
