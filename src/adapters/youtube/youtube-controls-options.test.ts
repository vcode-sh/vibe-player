import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerYouTubeSource } from "../../core/vibe-player-types";
import { createYouTubeAdapter } from "./create-youtube-adapter";
import {
  createStalledYouTubeRuntime,
  createYouTubeRuntime,
  getYouTubeSession,
  youtubeSource,
} from "./youtube-adapter-test-helpers";
import type {
  YouTubeAdapterRuntime,
  YouTubeIframeApi,
  YouTubeIframePlayerOptions,
  YouTubePlayerHandle,
} from "./youtube-iframe-types";
import { createReadyYouTubePlayer } from "./youtube-player-creation";

const ignoreCommand = (): void => undefined;

// Expected parameters follow the official player-parameter reference:
// controls=0 hides the native bar, cc_load_policy=1 requests captions and
// cc_lang_pref only states a language preference.
function createRecordingSdk(): {
  options: YouTubeIframePlayerOptions[];
  runtime: YouTubeAdapterRuntime;
} {
  const options: YouTubeIframePlayerOptions[] = [];
  class RecordingPlayer implements YouTubePlayerHandle {
    constructor(
      _element: HTMLElement,
      playerOptions: YouTubeIframePlayerOptions
    ) {
      options.push(playerOptions);
      queueMicrotask(() => playerOptions.events.onReady());
    }
    readonly destroy = ignoreCommand;
    getCurrentTime(): number {
      return 0;
    }
    getDuration(): number {
      return 0;
    }
    getPlaybackRate(): number {
      return 1;
    }
    getVolume(): number {
      return 100;
    }
    isMuted(): boolean {
      return false;
    }
    readonly mute = ignoreCommand;
    readonly pauseVideo = ignoreCommand;
    readonly playVideo = ignoreCommand;
    readonly seekTo = ignoreCommand;
    readonly setPlaybackRate = ignoreCommand;
    readonly setVolume = ignoreCommand;
    readonly unMute = ignoreCommand;
  }
  const api: YouTubeIframeApi = { Player: RecordingPlayer };
  return {
    options,
    runtime: {
      createPlayer: (session) => createReadyYouTubePlayer(api, session),
    },
  };
}

async function loadPlayerVars(
  source: VibePlayerYouTubeSource
): Promise<YouTubeIframePlayerOptions["playerVars"]> {
  const { options, runtime } = createRecordingSdk();
  const adapter = createYouTubeAdapter(runtime);
  await adapter.mount(document.createElement("div"));
  await adapter.load(source);
  await adapter.unmount();
  const [created] = options;
  if (!created || options.length !== 1) {
    throw new Error(`Expected one SDK player, received ${options.length}.`);
  }
  return created.playerVars;
}

describe("YouTube control and caption configuration", () => {
  afterEach(() => vi.useRealTimers());

  it("defaults embedded playback to package controls without caption requests", async () => {
    const playerVars = await loadPlayerVars({
      ...youtubeSource,
      origin: "https://host.example",
      widgetReferrer: "https://referrer.example",
    });

    expect(playerVars).toEqual({
      controls: 0,
      origin: "https://host.example",
      playsinline: 1,
      rel: 0,
      start: 12,
      widget_referrer: "https://referrer.example",
    });
  });

  it("passes native controls and explicit startup caption preferences", async () => {
    const playerVars = await loadPlayerVars({
      ...youtubeSource,
      captionLanguage: "pl",
      controls: "native",
      showCaptionsByDefault: true,
    });

    expect(playerVars).toMatchObject({
      cc_lang_pref: "pl",
      cc_load_policy: 1,
      controls: 1,
    });
  });

  it("does not translate a false caption default into a caption request", async () => {
    const playerVars = await loadPlayerVars({
      ...youtubeSource,
      captionLanguage: "",
      controls: "custom",
      showCaptionsByDefault: false,
    });

    expect(playerVars.controls).toBe(0);
    expect(playerVars).not.toHaveProperty("cc_load_policy");
    expect(playerVars).not.toHaveProperty("cc_lang_pref");
  });

  it.each([
    {
      controls: undefined,
      nativeMenu: false,
      presentation: "outside",
      sessionControls: "custom",
    },
    {
      controls: "native" as const,
      nativeMenu: true,
      presentation: "provider",
      sessionControls: "native",
    },
  ])(
    "advertises $presentation controls for $sessionControls mode without custom caption or quality selection",
    async ({ controls, nativeMenu, presentation, sessionControls }) => {
      const { probe, runtime } = createYouTubeRuntime();
      const adapter = createYouTubeAdapter(runtime);
      await adapter.mount(document.createElement("div"));
      await adapter.load({
        ...youtubeSource,
        ...(controls ? { controls } : {}),
      });

      expect(getYouTubeSession(probe).controls).toBe(sessionControls);
      expect(adapter.capabilities).toMatchObject({
        canShowCaptions: false,
        controlsPresentation: presentation,
        hasNativeCaptionsMenu: nativeMenu,
        supportsPlayback: true,
        supportsQualitySelection: false,
      });
      await adapter.unmount();
    }
  );

  it("publishes layout before SDK readiness without advertising commands", async () => {
    vi.useFakeTimers();
    const adapter = createYouTubeAdapter(createStalledYouTubeRuntime());
    await adapter.mount(document.createElement("div"));
    const pending = adapter
      .load(youtubeSource)
      .catch((error: unknown) => error);

    expect(adapter.capabilities).toMatchObject({
      controlsPresentation: "outside",
      supportsPlayback: false,
    });
    await vi.advanceTimersByTimeAsync(8000);
    await pending;
  });
});
