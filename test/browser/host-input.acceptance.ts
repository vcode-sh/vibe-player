import { expect, test } from "@playwright/test";
import { mediaState, play, player } from "./host-helpers";

const timeDescription = /.+ of .+/;

test("keyboard controls stay scoped to the focused player", async ({
  page,
}, testInfo) => {
  await page.goto("/host.html?scenario=keyboard&width=236");
  const surface = player(page);
  const composer = page.getByRole("textbox", { name: "Message composer" });
  await page.keyboard.press("Tab");
  await expect(composer).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    surface.getByRole("status", { name: "Player state" })
  ).toHaveText("idle");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(0.2);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await mediaState(surface)).paused).toBe(true);
  await page.waitForTimeout(2700);
  await expect(
    surface.getByRole("button", { exact: true, name: "Play" }).first()
  ).toBeVisible();
  const seek = surface.getByRole("slider", { name: "Seek" });
  for (let tabs = 0; tabs < 12; tabs += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: Keyboard focus must advance one Tab at a time.
    if (await seek.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(seek).toBeFocused();
  const beforeSeek = (await mediaState(surface)).currentTime;
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(beforeSeek);
  await expect(seek).toHaveAttribute("aria-valuetext", timeDescription);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("keyboard-paused-seek-focus.png"),
  });
});

test("reduced motion keeps the same usable playback states with instant transitions", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/host.html?scenario=motion&name=landscape&width=400");
  const surface = player(page, "landscape");
  await play(surface);
  await surface
    .getByRole("button", { exact: true, name: "Pause" })
    .first()
    .click();
  // Spinners keep turning: loading is real, ongoing state.
  const transitions = await surface.evaluate((section) =>
    Array.from(
      section.querySelectorAll("*:not(.vibe-player-surface__spinner)")
    ).map((element) => {
      const style = getComputedStyle(element);
      return {
        animation: style.animationDuration,
        transition: style.transitionDuration,
      };
    })
  );
  expect(
    transitions.every((value) =>
      value.transition
        .split(",")
        .every((duration) => Number.parseFloat(duration) === 0)
    )
  ).toBe(true);
  expect(
    transitions.every((value) =>
      value.animation
        .split(",")
        .every((duration) => Number.parseFloat(duration) === 0)
    )
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("reduced-motion-paused.png"),
  });
});

test("a touch on the playing picture reveals controls without pausing", async ({
  browser,
  browserName,
}, testInfo) => {
  test.skip(
    browserName === "firefox",
    "Playwright Firefox does not expose touch emulation."
  );
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { height: 900, width: 400 },
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5221/host.html?scenario=touch&width=236");
    const surface = player(page);
    await play(surface);
    await page.waitForTimeout(2700);
    const box = await surface.locator(".host-frame").boundingBox();
    if (!box) {
      throw new Error("The player frame is missing.");
    }
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 3);
    expect((await mediaState(surface)).paused).toBe(false);
    const pause = surface
      .getByRole("button", { exact: true, name: "Pause" })
      .first();
    await expect(pause).toBeVisible();
    await pause.tap();
    await expect
      .poll(async () => (await mediaState(surface)).paused)
      .toBe(true);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath("touch-revealed-controls.png"),
    });
  } finally {
    await context.close();
  }
});
