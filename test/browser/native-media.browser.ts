import { expect, type Page, test } from "@playwright/test";
import type { NativeMediaProbe } from "./fixture/native-media-player";
import { readMedia } from "./helpers";

interface NativeMediaWindow {
  nativeMedia: {
    controller: {
      getState(): {
        lastEvent: string | null;
        snapshot: { readyState: string };
      };
    };
    play(): void;
    probe: NativeMediaProbe;
  };
}

async function open(page: Page, scenario: string) {
  await page.goto(`/native-media.html?scenario=${scenario}`);
  await page.waitForFunction(() => "nativeMedia" in window);
}

function readProbe(page: Page) {
  return page.evaluate(
    () => (window as unknown as NativeMediaWindow).nativeMedia.probe
  );
}

function readState(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as NativeMediaWindow).nativeMedia.controller.getState()
        .snapshot.readyState
  );
}

function play(page: Page) {
  return page.evaluate(() =>
    (window as unknown as NativeMediaWindow).nativeMedia.play()
  );
}

test("a file whose every <source> fails reports one source error", async ({
  page,
}) => {
  await open(page, "missing");
  await play(page);

  await expect
    .poll(async () => (await readProbe(page)).errors)
    .toEqual([{ kind: "source", phase: "playback" }]);
  await expect.poll(() => readState(page)).toBe("error");
  await expect.poll(async () => (await readProbe(page)).play).toBe("resolved");
  const { analytics, events } = await readProbe(page);
  expect(analytics.filter((type) => type === "error")).toHaveLength(1);
  // Like a MediaError, the failure ends with the error: settling the pending
  // play() pauses the element without a host-visible pause.
  const afterError = events.slice(events.indexOf("error"));
  expect(afterError).not.toContain("pause");
  expect(afterError).not.toContain("onPause");
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as NativeMediaWindow
        ).nativeMedia.controller.getState().lastEvent
    )
  ).toBe("error");
});

test("a pause the media makes during a pending play is not an error", async ({
  page,
}) => {
  await open(page, "local");
  // Stands in for native controls, a PiP window or the OS pausing the media
  // before it could play (the fixture loads media only on play).
  await page.evaluate(() => {
    const pause = ({ target }: Event) => {
      if (target instanceof HTMLVideoElement) {
        target.pause();
      }
    };
    document.addEventListener("play", pause, { capture: true, once: true });
  });
  await play(page);

  await expect.poll(async () => (await readProbe(page)).play).toBe("resolved");
  const probe = await readProbe(page);
  expect(probe.errors).toEqual([]);
  expect(probe.analytics).not.toContain("error");
  expect((await readMedia(page)).paused).toBe(true);
  expect(await readState(page)).not.toBe("error");
});

test("an expired signed file URL is renewed once and plays", async ({
  page,
}) => {
  await open(page, "signed");
  await play(page);

  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(0.3);
  const probe = await readProbe(page);
  expect(probe.renewals).toBe(1);
  expect(probe.errors).toEqual([]);
  expect((await readMedia(page)).source).toContain("token=fresh");
  expect(await readState(page)).toBe("playing");
});
