import { expect, test } from "./live-fixture";
import { expectEmbedUncovered, readStageSnapshot } from "./stage-geometry";

const captionedVideoId = "8S0FDjFBj8o";
const captionsButton = /^Subtitles\/CC/;
const mutedVolume = /^Unmute, volume/;
const unmutedVolume = /^Mute, volume/;

async function currentTime(page: Parameters<typeof readStageSnapshot>[0]) {
  return (await readStageSnapshot(page))?.currentTime ?? 0;
}

test("default custom controls drive the official SDK from outside the embed", async ({
  page,
}, testInfo) => {
  await page.goto("/stage.html");
  const iframe = page.locator("iframe");
  await expect(iframe).toBeVisible();
  const src = new URL((await iframe.getAttribute("src")) ?? "");
  expect(src.searchParams.get("controls")).toBe("0");
  expect(src.searchParams.has("cc_load_policy")).toBe(false);
  const play = page.getByRole("button", { exact: true, name: "Play" });
  await expect(play).toHaveCount(1);
  await expect(page.getByRole("button", { name: captionsButton })).toHaveCount(
    0
  );
  await expectEmbedUncovered(page);

  await play.click();
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0.5);
  await page.getByRole("slider", { exact: true, name: "Seek" }).focus();
  const beforeSeek = await currentTime(page);
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(() => currentTime(page)).toBeGreaterThan(beforeSeek + 4);
  await expectEmbedUncovered(page);

  await page.getByRole("button", { name: unmutedVolume }).click();
  await expect
    .poll(async () => (await readStageSnapshot(page))?.muted)
    .toBe(true);
  await page.getByRole("button", { name: mutedVolume }).hover();
  const volume = page.getByRole("slider", { exact: true, name: "Volume" });
  await volume.focus();
  await page.keyboard.press("Home");
  await expect
    .poll(async () => (await readStageSnapshot(page))?.volume)
    .toBe(0);
  await page.keyboard.press("End");
  await expect
    .poll(async () => (await readStageSnapshot(page))?.volume)
    .toBe(1);
  await expectEmbedUncovered(page);

  const rates = (await readStageSnapshot(page))?.playbackRates ?? [];
  const nextRate = rates.find((rate) => rate > 1);
  if (nextRate !== undefined) {
    await page.getByRole("button", { name: "Playback speed 1x" }).click();
    await expect
      .poll(async () => (await readStageSnapshot(page))?.playbackRate)
      .toBe(nextRate);
  }

  await page.getByRole("button", { exact: true, name: "Pause" }).click();
  await expect
    .poll(
      async () =>
        await page
          .frameLocator("iframe")
          .locator("video")
          .evaluate((video: HTMLVideoElement) => video.paused)
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath("custom-controls.png") });
  await page.getByRole("button", { exact: true, name: "Close" }).click();
  await expect(iframe).toHaveCount(0);
});

test("native controls expose provider caption and settings menus", async ({
  page,
}, testInfo) => {
  await page.goto(
    `/stage.html?controls=native&captions&video=${captionedVideoId}`
  );
  const iframe = page.locator("iframe");
  await expect(iframe).toBeVisible();
  const src = new URL((await iframe.getAttribute("src")) ?? "");
  expect(src.searchParams.get("controls")).toBe("1");
  expect(src.searchParams.get("cc_load_policy")).toBe("1");
  expect(src.searchParams.get("cc_lang_pref")).toBe("en");
  await expect(
    page.getByRole("button", { exact: true, name: "Play" })
  ).toHaveCount(0);
  await expectEmbedUncovered(page);

  await expect
    .poll(async () => (await readStageSnapshot(page))?.readyState)
    .toBe("ready");
  await page.locator(".vibe-player-stage").focus();
  await page.keyboard.press("k");
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0.5);

  const frame = page.frameLocator("iframe");
  const box = await iframe.boundingBox();
  if (!box) {
    throw new Error("Expected the provider iframe.");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30);
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height - 24);
  await expect(
    frame.getByRole("button", { name: captionsButton })
  ).toHaveAttribute("aria-pressed", "true");
  await frame.getByRole("button", { name: "Playback Settings" }).click();
  await expect(frame.getByText("Quality", { exact: true })).toBeVisible();
  await expect(frame.getByText("Captions", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("native-menu.png") });
  await page.getByRole("button", { exact: true, name: "Close" }).click();
  await expect(iframe).toHaveCount(0);
});
