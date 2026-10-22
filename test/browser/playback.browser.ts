import { expect, test } from "@playwright/test";
import { readMedia, selectHls, startPlayback, waitForMedia } from "./helpers";

const mediaSourceUrl = /^blob:/;

test("file playback survives fresh host callbacks and equal source values", async ({
  page,
}) => {
  await page.goto("/");
  await startPlayback(page);
  const previousVideo = await page.locator("video").elementHandle();
  if (!previousVideo) {
    throw new Error("Missing playing video.");
  }
  const before = (await readMedia(page)).currentTime;

  await page
    .getByRole("button", { exact: true, name: "Rerender host" })
    .click();

  await expect(page.getByRole("status", { name: "Host revision" })).toHaveText(
    "1"
  );
  expect(await previousVideo.evaluate((video) => video.isConnected)).toBe(true);
  expect((await readMedia(page)).currentTime).toBeGreaterThanOrEqual(before);
  expect((await readMedia(page)).paused).toBe(false);
  await expect(page.getByRole("status", { name: "Opened events" })).toHaveText(
    "1"
  );
  await page.getByRole("button", { exact: true, name: "Pause" }).click();
  await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
});

test("provider replacement disposes the old media and leaves one working video", async ({
  page,
}) => {
  await page.goto("/");
  await startPlayback(page);
  const previousVideo = await page.locator("video").elementHandle();
  if (!previousVideo) {
    throw new Error("Missing old video.");
  }

  await selectHls(page);

  expect(
    await previousVideo.evaluate((video: HTMLVideoElement) => ({
      connected: video.isConnected,
      paused: video.paused,
      source: video.getAttribute("src"),
    }))
  ).toEqual({ connected: false, paused: true, source: null });
  await startPlayback(page);
  expect((await readMedia(page)).source).toMatch(mediaSourceUrl);
  await expect(page.locator("video")).toHaveCount(1);
});

test("inline playback keeps caption toggles independent from media playback", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { exact: true, name: "Inline layout" })
    .click();
  await startPlayback(page);
  await expect(
    page.getByText("Local caption proof", { exact: true })
  ).toBeVisible();

  await page
    .getByRole("button", { exact: true, name: "Hide captions" })
    .click();

  await expect(
    page.getByText("Local caption proof", { exact: true })
  ).toHaveCount(0);
  expect((await readMedia(page)).paused).toBe(false);
  await page
    .getByRole("button", { exact: true, name: "Show captions" })
    .click();
  await expect(
    page.getByText("Local caption proof", { exact: true })
  ).toBeVisible();
});

test("headless bindings own loading, playback and layout disposal", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { exact: true, name: "Headless layout" })
    .click();
  await waitForMedia(page);
  await page.getByRole("button", { exact: true, name: "Custom play" }).click();
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(0.2);
  await expect(
    page.getByRole("status", { name: "Headless playback" })
  ).toHaveText("playing");

  await page.getByRole("button", { exact: true, name: "Custom pause" }).click();

  await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
  await page.getByRole("button", { exact: true, name: "Stage layout" }).click();
  await waitForMedia(page);
  await expect(
    page.getByRole("region", { name: "Headless player" })
  ).toHaveCount(0);
  await expect(page.locator("video")).toHaveCount(1);
});
