import { expect, type Page, test } from "@playwright/test";

/**
 * Chromium's real `navigator.mediaSession` validates every write. Handlers
 * cannot be read back, so an init script records what the page registers
 * (and which actions the browser rejected) while still calling through.
 */
async function recordMediaSession(page: Page) {
  await page.addInitScript(() => {
    const { mediaSession } = navigator;
    const handlers = new Map<string, MediaSessionActionHandler>();
    const rejectedActions: string[] = [];
    const positions: (MediaPositionState | undefined)[] = [];
    const setAction = mediaSession.setActionHandler.bind(mediaSession);
    const setPosition = mediaSession.setPositionState.bind(mediaSession);
    mediaSession.setActionHandler = (action, handler) => {
      try {
        setAction(action, handler);
      } catch (error) {
        rejectedActions.push(action);
        throw error;
      }
      if (handler) {
        handlers.set(action, handler);
      } else {
        handlers.delete(action);
      }
    };
    mediaSession.setPositionState = (state) => {
      setPosition(state);
      positions.push(state);
    };
    Object.assign(window, {
      mediaSessionProbe: {
        actions: () => [...handlers.keys()].sort(),
        positions: () => positions,
        rejected: () => rejectedActions,
        trigger: (action: MediaSessionAction, details: object) =>
          handlers.get(action)?.({ action, ...details }),
      },
    });
  });
}

const posterUrl = /\/media\/seek-frame\.jpg$/;

interface ProbeWindow {
  mediaSessionProbe: {
    actions(): string[];
    positions(): (MediaPositionState | undefined)[];
    rejected(): string[];
    trigger(action: string, details: object): void;
  };
}

function actions(page: Page) {
  return page.evaluate(() =>
    (window as unknown as ProbeWindow).mediaSessionProbe.actions()
  );
}

function lastPosition(page: Page) {
  return page.evaluate(() =>
    (window as unknown as ProbeWindow).mediaSessionProbe.positions().at(-1)
  );
}

function rejected(page: Page) {
  return page.evaluate(() =>
    (window as unknown as ProbeWindow).mediaSessionProbe.rejected()
  );
}

/** Invokes a registered handler the way system media controls would. */
function trigger(page: Page, action: string, details: object = {}) {
  return page.evaluate(
    ([name, extra]) =>
      (window as unknown as ProbeWindow).mediaSessionProbe.trigger(name, extra),
    [action, details] as const
  );
}

function session(page: Page) {
  return page.evaluate(() => ({
    album: navigator.mediaSession.metadata?.album ?? null,
    artist: navigator.mediaSession.metadata?.artist ?? null,
    artwork: navigator.mediaSession.metadata?.artwork.map(({ src }) => src),
    state: navigator.mediaSession.playbackState,
    title: navigator.mediaSession.metadata?.title ?? null,
  }));
}

function video(page: Page, player: string) {
  return page.getByRole("region", { name: player }).locator("video");
}

async function play(page: Page, player: string) {
  await page
    .getByRole("region", { name: player })
    .getByRole("button", { exact: true, name: "Play" })
    .first()
    .click();
  await expect
    .poll(() =>
      video(page, player).evaluate((media: HTMLVideoElement) => media.paused)
    )
    .toBe(false);
}

test.beforeEach(async ({ page }) => {
  await recordMediaSession(page);
  await page.goto("/media-session.html");
});

test("the playing file player publishes metadata, state, position and working actions", async ({
  page,
}) => {
  expect((await session(page)).title).toBeNull();
  await play(page, "Fjord file");
  await expect
    .poll(() => session(page))
    .toMatchObject({
      album: "Fixtures",
      artist: "Vibe Player",
      state: "playing",
      title: "Fjord file",
    });
  const { artwork } = await session(page);
  expect(artwork?.[0]).toMatch(posterUrl);
  expect(await rejected(page)).toEqual([]);
  // Chromium supports video Picture-in-Picture and the PiP session action.
  expect(await actions(page)).toEqual(
    expect.arrayContaining([
      "enterpictureinpicture",
      "nexttrack",
      "pause",
      "play",
      "seekbackward",
      "seekforward",
      "seekto",
      "stop",
    ])
  );
  expect(await actions(page)).not.toContain("previoustrack");

  await trigger(page, "seekto", { seekTime: 12 });
  await expect
    .poll(() =>
      video(page, "Fjord file").evaluate(
        (media: HTMLVideoElement) => media.currentTime
      )
    )
    .toBeGreaterThanOrEqual(12);
  await expect
    .poll(async () => (await lastPosition(page))?.position ?? 0)
    .toBeGreaterThanOrEqual(12);
  expect(await lastPosition(page)).toMatchObject({ playbackRate: 1 });
  expect((await lastPosition(page))?.duration).toBeGreaterThan(20);

  await trigger(page, "pause");
  await expect.poll(async () => (await session(page)).state).toBe("paused");
  expect((await session(page)).title).toBe("Fjord file");
});

test("a second audible player takes the session and stop releases it", async ({
  page,
}) => {
  await play(page, "Fjord file");
  await expect.poll(async () => (await session(page)).title).toBe("Fjord file");
  await play(page, "Fjord HLS");
  await expect.poll(async () => (await session(page)).title).toBe("Fjord HLS");
  await expect
    .poll(() =>
      video(page, "Fjord file").evaluate(
        (media: HTMLVideoElement) => media.paused
      )
    )
    .toBe(true);

  await trigger(page, "nexttrack");
  await expect(
    page.getByRole("status", { name: "Next track request" })
  ).toHaveText("session-hls");

  await trigger(page, "stop");
  await expect
    .poll(() => session(page))
    .toMatchObject({
      state: "none",
      title: null,
    });
  expect(await actions(page)).toEqual([]);
});
