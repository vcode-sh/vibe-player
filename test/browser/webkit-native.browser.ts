import { expect, test } from "@playwright/test";
import { readMedia, startPlayback, waitForMedia } from "./helpers";

const nativeManifest = /\/media\/master\.m3u8$/;
const qualityControl = /^Quality /;

test("native HLS decodes local segments without managed quality controls", async ({
  page,
}) => {
  await page.goto("/webkit.html");
  await startPlayback(page);

  expect((await readMedia(page)).source).toMatch(nativeManifest);
  await expect(page.getByRole("button", { name: qualityControl })).toHaveCount(
    0
  );
  await expect(
    page.getByText("Local caption proof", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Pause" }).click();
  await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
});

test("native HLS modal contains keyboard focus and restores the opener", async ({
  page,
}) => {
  await page.goto("/webkit.html");
  const opener = page.getByRole("button", {
    exact: true,
    name: "Open native modal",
  });
  await opener.click();
  await waitForMedia(page);
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Local HLS video player",
  });
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true);
  const close = dialog.getByRole("button", { exact: true, name: "Close" });
  await close.focus();
  for (let step = 0; step < 14; step += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: each key depends on the previous focus transition.
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement)
      )
    ).toBe(true);
  }
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) => element.contains(document.activeElement))
  ).toBe(true);
  await close.focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
