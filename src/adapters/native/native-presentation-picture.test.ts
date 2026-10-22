import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapterEvent } from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { createSingleFileSource } from "../file/file-adapter-test-helpers";
import { getMountedNativeVideo } from "./native-video-test-helpers";

function setPictureElement(element: Element | null): void {
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: element,
  });
}

function setPictureEnabled(enabled: boolean): void {
  Object.defineProperty(document, "pictureInPictureEnabled", {
    configurable: true,
    value: enabled,
  });
}

async function createPresentationVideo() {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const adapter = createFileAdapter();
  const target = document.createElement("div");
  await adapter.mount(target);
  await adapter.load(createSingleFileSource());
  return { adapter, video: getMountedNativeVideo(target) };
}

describe("native picture presentation state", () => {
  afterEach(() => {
    setPictureElement(null);
    setPictureEnabled(false);
    vi.restoreAllMocks();
  });

  it("tracks native picture events and ignores disposed video events", async () => {
    const { adapter, video } = await createPresentationVideo();
    const events: VibePlayerAdapterEvent[] = [];
    adapter.subscribe((event) => events.push(event));
    setPictureEnabled(true);
    video.requestPictureInPicture = vi.fn(async () => {
      setPictureElement(video);
      video.dispatchEvent(new Event("enterpictureinpicture"));
      return { height: 180, width: 320 } as PictureInPictureWindow;
    });
    await adapter.enterPictureInPicture?.();
    expect(adapter.getSnapshot().isPictureInPicture).toBe(true);
    setPictureElement(null);
    video.dispatchEvent(new Event("leavepictureinpicture"));
    expect(events.at(-1)).toMatchObject({
      snapshot: { isPictureInPicture: false },
      type: "pictureinpicturechange",
    });

    await adapter.unmount();
    events.length = 0;
    setPictureElement(video);
    video.dispatchEvent(new Event("enterpictureinpicture"));
    expect(events).toEqual([]);
    expect(adapter.getSnapshot().isPictureInPicture).toBe(false);
  });

  it("supports WebKit picture presentation and its native exit event", async () => {
    const { adapter, video } = await createPresentationVideo();
    setPictureEnabled(false);
    let mode = "inline";
    Object.defineProperty(video, "webkitPresentationMode", {
      configurable: true,
      get: () => mode,
    });
    Object.defineProperty(video, "webkitSupportsPresentationMode", {
      configurable: true,
      value: (requested: string) => requested === "picture-in-picture",
    });
    Object.defineProperty(video, "webkitSetPresentationMode", {
      configurable: true,
      value: (requested: string) => {
        mode = requested;
        video.dispatchEvent(new Event("webkitpresentationmodechanged"));
      },
    });
    expect(adapter.capabilities.canPictureInPicture).toBe(true);
    await adapter.enterPictureInPicture?.();
    expect(mode).toBe("picture-in-picture");
    expect(adapter.getSnapshot().isPictureInPicture).toBe(true);
    await adapter.exitPictureInPicture?.();
    expect(mode).toBe("inline");
    expect(adapter.getSnapshot().isPictureInPicture).toBe(false);
    await adapter.unmount();
  });
});
