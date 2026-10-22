import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFileAdapter } from "../file/create-file-adapter";
import { createSingleFileSource } from "../file/file-adapter-test-helpers";
import { NativeVideoPresentation } from "./native-video-presentation";
import {
  createDeferredPlayback,
  getMountedNativeVideo,
} from "./native-video-test-helpers";

const originalPictureElement = Object.getOwnPropertyDescriptor(
  document,
  "pictureInPictureElement"
);
const originalPictureEnabled = Object.getOwnPropertyDescriptor(
  document,
  "pictureInPictureEnabled"
);
const originalPictureExit = Object.getOwnPropertyDescriptor(
  document,
  "exitPictureInPicture"
);

function setPictureElement(element: Element | null): void {
  Object.defineProperty(document, "pictureInPictureElement", {
    configurable: true,
    value: element,
  });
}

async function createPlayer() {
  const adapter = createFileAdapter();
  const target = document.createElement("div");
  document.body.append(target);
  await adapter.mount(target);
  await adapter.load(createSingleFileSource());
  const video = getMountedNativeVideo(target);
  video.requestPictureInPicture = vi.fn(async () => {
    setPictureElement(video);
    return { height: 180, width: 320 } as PictureInPictureWindow;
  });
  return { adapter, video };
}

describe("picture in picture lifecycle ownership", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    Object.defineProperty(document, "pictureInPictureEnabled", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, "exitPictureInPicture", {
      configurable: true,
      value: vi.fn(async () => setPictureElement(null)),
    });
  });

  afterEach(() => {
    for (const [key, descriptor] of [
      ["pictureInPictureElement", originalPictureElement],
      ["pictureInPictureEnabled", originalPictureEnabled],
      ["exitPictureInPicture", originalPictureExit],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(document, key, descriptor);
      } else {
        Reflect.deleteProperty(document, key);
      }
    }
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("exits a disposed video when its picture request finishes late", async () => {
    const { adapter, video } = await createPlayer();
    const deferred = createDeferredPlayback();
    const emit = vi.fn();
    adapter.subscribe(emit);
    video.requestPictureInPicture = vi.fn(async () => {
      await deferred.promise;
      setPictureElement(video);
      return { height: 180, width: 320 } as PictureInPictureWindow;
    });
    const pending = adapter.enterPictureInPicture?.();
    await adapter.unmount();
    emit.mockClear();
    deferred.resolve();
    await pending;

    expect(document.pictureInPictureElement).toBeNull();
    expect(adapter.getSnapshot().isPictureInPicture).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it("keeps the current video when an earlier picture request settles", async () => {
    const former = await createPlayer();
    const current = await createPlayer();
    const deferred = createDeferredPlayback();
    former.video.requestPictureInPicture = vi.fn(async () => {
      setPictureElement(former.video);
      await deferred.promise;
      return { height: 180, width: 320 } as PictureInPictureWindow;
    });
    const pending = former.adapter.enterPictureInPicture?.();
    await former.adapter.unmount();
    await current.adapter.enterPictureInPicture?.();
    deferred.resolve();
    await pending;

    expect(document.pictureInPictureElement).toBe(current.video);
    expect(current.adapter.getSnapshot().isPictureInPicture).toBe(true);
    await current.adapter.unmount();
  });

  it("preserves a video claimed by another presentation owner", async () => {
    const previous = new NativeVideoPresentation(() => undefined);
    const current = new NativeVideoPresentation(() => undefined);
    const target = document.createElement("div");
    const video = document.createElement("video");
    const deferred = createDeferredPlayback();
    video.requestPictureInPicture = vi.fn(async () => {
      setPictureElement(video);
      return { height: 180, width: 320 } as PictureInPictureWindow;
    });
    vi.mocked(video.requestPictureInPicture).mockImplementationOnce(
      async () => {
        await deferred.promise;
        setPictureElement(video);
        return { height: 180, width: 320 } as PictureInPictureWindow;
      }
    );
    previous.mount(video, target);
    const pending = previous.enterPictureInPicture();
    await previous.unmount();
    current.mount(video, target);
    await current.enterPictureInPicture();
    deferred.resolve();
    await pending;

    expect(document.pictureInPictureElement).toBe(video);
    expect(current.getSnapshot().isPictureInPicture).toBe(true);
    await current.unmount();
  });
});
