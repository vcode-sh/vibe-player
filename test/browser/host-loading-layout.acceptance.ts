import { expect, test } from "@playwright/test";
import {
  assertNoOverflow,
  mediaOrigin,
  mediaState,
  play,
  player,
} from "./host-helpers";

const fixturePlayerName = /^(portrait|landscape) player$/;

test.beforeEach(async ({ request }) => {
  await request.get(`${mediaOrigin}/requests?clear=1`);
});

test("three inline players fetch posters but no media before Play", async ({
  page,
  request,
}, testInfo) => {
  const mediaRequests: string[] = [];
  const posters: string[] = [];
  page.on("request", (event) => {
    if (new URL(event.url()).pathname.startsWith("/v/")) {
      mediaRequests.push(event.url());
    }
  });
  page.on("response", (event) => {
    if (
      new URL(event.url()).pathname.startsWith("/poster/") &&
      event.status() === 200
    ) {
      posters.push(event.url());
    }
  });
  await page.goto("/host.html");
  await expect(
    page.getByRole("region", { name: fixturePlayerName })
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { exact: true, name: "Play" }).first()
  ).toBeVisible();
  await expect.poll(() => posters.length).toBeGreaterThan(0);
  await expect(
    page.getByRole("textbox", { name: "Message composer" })
  ).not.toBeFocused();
  expect(
    await page.evaluate(() => document.activeElement === document.body)
  ).toBe(true);
  // Observe an idle interval longer than a metadata/manifest startup turn.
  await page.waitForTimeout(650);
  expect(mediaRequests).toEqual([]);
  expect(await (await request.get(`${mediaOrigin}/requests`)).json()).toEqual(
    []
  );
  expect(
    await page
      .locator("video")
      .evaluateAll((videos: HTMLVideoElement[]) =>
        videos.every(
          (video) => video.preload === "none" && video.currentSrc === ""
        )
      )
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("three-posters-before-play.png"),
  });
  await play(
    page.getByRole("region", { exact: true, name: "portrait player" }).first()
  );
  expect(mediaRequests.length).toBeGreaterThan(0);
  // hls.js's default start-up bitrate test fetched the first fragment twice.
  const fragments = mediaRequests.filter((url) => url.endsWith(".m4s"));
  expect(fragments.length).toBeGreaterThan(0);
  expect(new Set(fragments).size).toBe(fragments.length);
  const others = page
    .getByRole("region", { exact: true, name: "portrait player" })
    .nth(1);
  expect(
    await others
      .locator("video")
      .evaluateAll((videos: HTMLVideoElement[]) =>
        videos.every((video) => video.currentSrc === "")
      )
  ).toBe(true);
});

for (const viewport of [400, 1280]) {
  for (const orientation of ["portrait", "landscape"]) {
    test(`${orientation} fits ${viewport}px viewport before and during playback`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ height: 1000, width: viewport });
      const width = orientation === "portrait" ? 236 : 680;
      await page.goto(
        `/host.html?scenario=layout&name=${orientation}&width=${width}`
      );
      const surface = player(page, orientation);
      await expect(
        surface.getByRole("button", { exact: true, name: "Play" }).first()
      ).toBeVisible();
      await assertNoOverflow(page, surface);
      const frame = await surface.locator(".host-frame").boundingBox();
      if (!frame) {
        throw new Error("The player frame is missing.");
      }
      const ratio = orientation === "portrait" ? 9 / 16 : 16 / 9;
      expect(frame.width / frame.height).toBeCloseTo(ratio, 2);
      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${orientation}-${viewport}-poster.png`),
      });
      if (orientation === "portrait" && viewport === 400) {
        await page.mouse.click(
          frame.x + frame.width / 2,
          frame.y + frame.height / 3
        );
        await expect
          .poll(async () => (await mediaState(surface)).currentTime)
          .toBeGreaterThan(0.2);
      } else {
        await play(surface);
      }
      await assertNoOverflow(page, surface);
      expect((await mediaState(surface)).height).toBeGreaterThan(0);
      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${orientation}-${viewport}-playing.png`),
      });
    });
  }
}

for (const variant of ["feed", "full"]) {
  test(`${variant} chrome stays usable in its larger surface`, async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/host.html?scenario=variant&variant=${variant}&name=landscape&width=${variant === "feed" ? 680 : 1100}`
    );
    const surface = player(page, "landscape");
    await play(surface);
    await assertNoOverflow(page, surface);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${variant}-playing.png`),
    });
  });
}

test("a feed frame clamped to 4:5 crops poster and video with fit cover", async ({
  page,
}) => {
  await page.goto(
    "/host.html?scenario=layout&variant=feed&name=portrait&width=400&fit=cover&minRatio=0.8"
  );
  const surface = player(page);
  const frame = await surface.locator(".host-frame").boundingBox();
  expect((frame?.width ?? 0) / (frame?.height ?? 1)).toBeCloseTo(0.8, 2);
  const fitOf = (selector: string) =>
    surface
      .locator(selector)
      .evaluate((element) => getComputedStyle(element).objectFit);
  expect(await fitOf(".vibe-player-stage__poster")).toBe("cover");
  await play(surface);
  expect(await fitOf("video")).toBe("cover");
  await assertNoOverflow(page, surface);
});
