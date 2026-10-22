import { expect, test } from "@playwright/test";
import { readMedia, selectHls } from "./helpers";

test("modal focuses, contains keyboard navigation, closes and restores its opener", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", { exact: true, name: "Open modal" });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Local file video player",
  });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true);
  for (let step = 0; step < 14; step += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: each key depends on the previous focus transition.
    await page.keyboard.press("Tab");
    const focus = await dialog.evaluate((element) => ({
      contained: element.contains(document.activeElement),
      focused: document.activeElement?.outerHTML.slice(0, 200),
    }));
    expect(focus.contained, `Tab ${step + 1}: ${focus.focused}`).toBe(true);
  }
  await dialog
    .getByRole("button", { exact: true, name: "Rerender player host" })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { exact: true, name: "Picture in picture" })
  ).toBeFocused();

  await dialog.getByRole("button", { exact: true, name: "Close" }).focus();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("closing releases live media and reopening creates one new playable source", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Open modal" }).click();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(0.2);
  const old = await page.locator("video").elementHandle();
  if (!old) {
    throw new Error("Missing modal video.");
  }

  await page.getByRole("button", { exact: true, name: "Close" }).click();

  expect(
    await old.evaluate((video: HTMLVideoElement) => ({
      connected: video.isConnected,
      paused: video.paused,
    }))
  ).toEqual({ connected: false, paused: true });
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "Open modal" }).click();
  await expect(page.locator("video")).toHaveCount(1);
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(0.2);
});

test("Escape closes a volume popover before dismissing its modal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Open modal" }).click();
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Local file video player",
  });
  const volume = dialog.getByRole("button", {
    exact: true,
    name: "Mute, volume 100%",
  });
  await volume.focus();
  const slider = dialog.getByRole("slider", { exact: true, name: "Volume" });
  await expect(slider).toBeVisible();
  await slider.focus();

  await page.keyboard.press("Escape");

  await expect(slider).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(volume).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("Escape closes a clicked quality menu before dismissing its modal", async ({
  page,
}) => {
  await page.goto("/");
  await selectHls(page);
  await page.getByRole("button", { exact: true, name: "Open modal" }).click();
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Local HLS video player",
  });
  const quality = dialog.getByRole("button", {
    exact: true,
    name: "Quality Auto",
  });
  await quality.click();
  const menu = dialog.getByRole("listbox", { exact: true, name: "Quality" });
  await expect(menu).toBeVisible();
  await expect(quality).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(menu).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(quality).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
