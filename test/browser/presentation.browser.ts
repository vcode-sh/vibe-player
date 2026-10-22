import { expect, test } from "@playwright/test";
import { readMedia, startPlayback } from "./helpers";

test("F toggles fullscreen and external browser exit updates package controls", async ({
  page,
}) => {
  await page.goto("/");
  await startPlayback(page);
  test.skip(
    !(await page.evaluate(() => document.fullscreenEnabled)),
    "This browser does not expose fullscreen support."
  );
  await page.locator(".vibe-player-stage").focus();
  await page.keyboard.press("f");
  await expect(
    page.getByRole("button", { exact: true, name: "Exit full screen" })
  ).toBeVisible();

  await page.keyboard.press("f");

  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement !== null))
    .toBe(true);

  await page.evaluate(() => document.exitFullscreen());

  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await expect(
    page.getByRole("button", { exact: true, name: "Full screen" })
  ).toBeVisible();
  expect((await readMedia(page)).paused).toBe(false);
});

test("picture in picture enters and exits through package controls", async ({
  page,
}) => {
  await page.goto("/");
  await startPlayback(page);
  test.skip(
    !(await page.evaluate(() => document.pictureInPictureEnabled)),
    "This browser does not expose picture-in-picture support."
  );
  await page
    .getByRole("button", { exact: true, name: "Picture in picture" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.pictureInPictureElement === document.querySelector("video")
      )
    )
    .toBe(true);

  await page
    .getByRole("button", { exact: true, name: "Exit picture in picture" })
    .click();

  await expect
    .poll(() => page.evaluate(() => document.pictureInPictureElement === null))
    .toBe(true);
  await expect(
    page.getByRole("button", { exact: true, name: "Picture in picture" })
  ).toBeVisible();
  expect((await readMedia(page)).paused).toBe(false);
});
