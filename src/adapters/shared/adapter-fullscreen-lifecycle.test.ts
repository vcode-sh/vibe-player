import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDeferredPlayback } from "../native/native-video-test-helpers";
import { createAdapterFullscreen } from "./adapter-fullscreen";

const originalElement = Object.getOwnPropertyDescriptor(
  document,
  "fullscreenElement"
);
const originalExit = Object.getOwnPropertyDescriptor(
  document,
  "exitFullscreen"
);

function setFullscreenElement(element: Element | null): void {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    value: element,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
}

function createTarget() {
  const target = document.createElement("section");
  target.requestFullscreen = vi.fn(async () => setFullscreenElement(target));
  document.body.append(target);
  return target;
}

describe("fullscreen lifecycle ownership", () => {
  beforeEach(() => {
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: vi.fn(async () => setFullscreenElement(null)),
    });
  });

  afterEach(() => {
    for (const [key, descriptor] of [
      ["fullscreenElement", originalElement],
      ["exitFullscreen", originalExit],
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

  it("releases the former fullscreen container when the target changes", async () => {
    const presentation = createAdapterFullscreen(() => undefined);
    const former = createTarget();
    const current = createTarget();
    presentation.mount(former);
    await presentation.enter();
    expect(document.fullscreenElement).toBe(former);

    presentation.mount(current);
    await presentation.exit();
    expect(document.fullscreenElement).toBeNull();
    await presentation.enter();
    expect(document.fullscreenElement).toBe(current);
    await presentation.unmount();
    expect(document.fullscreenElement).toBeNull();
  });

  it("releases a disposed container if its fullscreen request finishes late", async () => {
    const emit = vi.fn();
    const presentation = createAdapterFullscreen(emit);
    const target = createTarget();
    const deferred = createDeferredPlayback();
    target.requestFullscreen = vi.fn(async () => {
      await deferred.promise;
      setFullscreenElement(target);
    });
    presentation.mount(target);
    const pending = presentation.enter();
    await presentation.unmount();
    deferred.resolve();
    await pending;

    expect(document.fullscreenElement).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it("does not exit a newer fullscreen target after a stale request settles", async () => {
    const previous = createAdapterFullscreen(() => undefined);
    const current = createAdapterFullscreen(() => undefined);
    const formerTarget = createTarget();
    const currentTarget = createTarget();
    const deferred = createDeferredPlayback();
    formerTarget.requestFullscreen = vi.fn(() => {
      setFullscreenElement(formerTarget);
      return deferred.promise;
    });
    previous.mount(formerTarget);
    const pending = previous.enter();
    await previous.unmount();
    current.mount(currentTarget);
    await current.enter();
    deferred.resolve();
    await pending;

    expect(document.fullscreenElement).toBe(currentTarget);
    expect(current.isFullscreen).toBe(true);
    await current.unmount();
  });

  it("preserves a reused container claimed by another presentation owner", async () => {
    const previous = createAdapterFullscreen(() => undefined);
    const current = createAdapterFullscreen(() => undefined);
    const target = createTarget();
    const deferred = createDeferredPlayback();
    vi.mocked(target.requestFullscreen).mockImplementationOnce(async () => {
      await deferred.promise;
      setFullscreenElement(target);
    });
    previous.mount(target);
    const pending = previous.enter();
    await previous.unmount();
    current.mount(target);
    await current.enter();
    deferred.resolve();
    await pending;

    expect(document.fullscreenElement).toBe(target);
    expect(current.isFullscreen).toBe(true);
    await current.unmount();
  });
});
