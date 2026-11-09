import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { createSingleFileSource } from "../file/file-adapter-test-helpers";
import { createAdapterTestScope } from "../shared/adapter-test-helpers";
import { NativeVideoPresentation } from "./native-video-presentation";
import { getMountedNativeVideo } from "./native-video-test-helpers";

const adapterScope = createAdapterTestScope();

/**
 * The platform side of WebKit's video-only fullscreen, as iPhone Safari
 * offers it: commands are recorded, and `display` is the platform entering
 * or leaving fullscreen (it may also do so without a package command).
 */
function installVideoFullscreen(video: HTMLVideoElement) {
  let displaying = false;
  Object.defineProperty(video, "webkitDisplayingFullscreen", {
    configurable: true,
    get: () => displaying,
  });
  const enter = vi.fn();
  const exit = vi.fn();
  Object.assign(video, {
    webkitEnterFullscreen: enter,
    webkitExitFullscreen: exit,
  });
  return {
    display(value: boolean) {
      displaying = value;
      video.dispatchEvent(
        new Event(value ? "webkitbeginfullscreen" : "webkitendfullscreen")
      );
    },
    enter,
    exit,
  };
}

async function createPlayer(stage?: HTMLElement) {
  const adapter = adapterScope.track(createFileAdapter());
  const target = document.createElement("div");
  document.body.append(target);
  await adapter.mount(target, stage ?? target);
  await adapter.load(createSingleFileSource());
  const video = getMountedNativeVideo(target);
  const events: VibePlayerAdapterEvent["type"][] = [];
  adapter.subscribe((event) => events.push(event.type));
  return { adapter, events, platform: installVideoFullscreen(video), video };
}

describe("native video fullscreen fallback", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
  });

  afterEach(async () => {
    await adapterScope.cleanup();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("enters and exits video fullscreen when the container cannot go fullscreen", async () => {
    const { adapter, events, platform } = await createPlayer();
    expect(adapter.capabilities.canFullscreen).toBe(true);

    await adapter.enterFullscreen?.();
    expect(platform.enter).toHaveBeenCalledOnce();
    platform.display(true);
    expect(adapter.getSnapshot().isFullscreen).toBe(true);
    expect(events).toEqual(["fullscreenchange"]);

    await adapter.exitFullscreen?.();
    expect(platform.exit).toHaveBeenCalledOnce();
    platform.display(false);
    expect(adapter.getSnapshot().isFullscreen).toBe(false);
    expect(events).toEqual(["fullscreenchange", "fullscreenchange"]);
  });

  it("offers video fullscreen only once WebKit says the video supports it", async () => {
    const { adapter, video } = await createPlayer();
    let supported = false;
    Object.defineProperty(video, "webkitSupportsFullscreen", {
      configurable: true,
      get: () => supported,
    });
    expect(adapter.capabilities.canFullscreen).toBe(false);

    supported = true;

    expect(adapter.capabilities.canFullscreen).toBe(true);
  });

  it("hides fullscreen when neither the container nor the video can go fullscreen", async () => {
    const adapter = adapterScope.track(createFileAdapter());
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(createSingleFileSource());

    expect(adapter.capabilities.canFullscreen).toBe(false);
  });

  it("keeps the container path, with its chrome, when the container can go fullscreen", async () => {
    const stage = document.createElement("section");
    const request = vi.fn(async () => undefined);
    stage.requestFullscreen = request;
    const { adapter, platform } = await createPlayer(stage);

    await adapter.enterFullscreen?.();

    expect(request).toHaveBeenCalledOnce();
    expect(platform.enter).not.toHaveBeenCalled();
  });

  it("reports video fullscreen the platform entered without a package command", async () => {
    const stage = document.createElement("section");
    stage.requestFullscreen = vi.fn(async () => undefined);
    const { adapter, events, platform } = await createPlayer(stage);

    platform.display(true);
    expect(adapter.getSnapshot().isFullscreen).toBe(true);
    await adapter.exitFullscreen?.();
    expect(platform.exit).toHaveBeenCalledOnce();
    platform.display(false);

    expect(adapter.getSnapshot().isFullscreen).toBe(false);
    expect(events).toEqual(["fullscreenchange", "fullscreenchange"]);
  });

  it("leaves video fullscreen on unmount and stops reporting its events", async () => {
    const { adapter, events, platform } = await createPlayer();
    platform.display(true);
    events.length = 0;

    await adapter.unmount();
    expect(platform.exit).toHaveBeenCalledOnce();
    platform.display(false);

    expect(events).toEqual([]);
  });

  it("retries once when unmount lands during the enter transition", async () => {
    const { adapter, platform, video } = await createPlayer();
    platform.display(true);
    // The fake platform ignores the exit, as WebKit does mid-transition.

    await adapter.unmount();
    expect(platform.exit).toHaveBeenCalledOnce();
    video.dispatchEvent(new Event("webkitbeginfullscreen"));
    expect(platform.exit).toHaveBeenCalledTimes(2);
    video.dispatchEvent(new Event("fullscreenchange"));

    expect(platform.exit).toHaveBeenCalledTimes(2);
  });

  it("does not retry the exit once another presentation claimed the video", async () => {
    const previous = adapterScope.track(
      new NativeVideoPresentation(() => undefined)
    );
    const current = adapterScope.track(
      new NativeVideoPresentation(() => undefined)
    );
    const target = document.createElement("div");
    const video = document.createElement("video");
    const platform = installVideoFullscreen(video);
    previous.mount(video, target);
    platform.display(true);

    await previous.unmount();
    current.mount(video, target);
    video.dispatchEvent(new Event("webkitbeginfullscreen"));

    expect(platform.exit).toHaveBeenCalledOnce();
    expect(current.getSnapshot().isFullscreen).toBe(true);
  });

  it("does not retry an exit the platform completed", async () => {
    const { adapter, platform, video } = await createPlayer();
    platform.display(true);

    await adapter.unmount();
    platform.display(false);
    video.dispatchEvent(new Event("webkitbeginfullscreen"));

    expect(platform.exit).toHaveBeenCalledOnce();
  });

  it("leaves a video's fullscreen alone after another presentation claimed it", async () => {
    const previous = adapterScope.track(
      new NativeVideoPresentation(() => undefined)
    );
    const current = adapterScope.track(
      new NativeVideoPresentation(() => undefined)
    );
    const target = document.createElement("div");
    const video = document.createElement("video");
    const platform = installVideoFullscreen(video);
    previous.mount(video, target);
    current.mount(video, target);
    platform.display(true);

    await previous.unmount();

    expect(platform.exit).not.toHaveBeenCalled();
    expect(current.getSnapshot().isFullscreen).toBe(true);
  });
});
