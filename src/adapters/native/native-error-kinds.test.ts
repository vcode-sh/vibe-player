import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type {
  VibePlayerError,
  VibePlayerSource,
} from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { fileSource } from "../file/file-adapter-test-helpers";
import { createHlsAdapter } from "../hls/create-hls-adapter";
import { createHlsRuntime, hlsSource } from "../hls/hls-adapter-test-helpers";
import { getMountedNativeVideo } from "./native-video-test-helpers";

const controllers = new Set<VibePlayerController>();

async function loadNative(kind: "file" | "hls", source?: VibePlayerSource) {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
    () => undefined
  );
  const { runtime } = createHlsRuntime();
  const errors: VibePlayerError[] = [];
  const analytics: string[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () =>
      kind === "hls" ? createHlsAdapter(runtime) : createFileAdapter(),
    onAnalyticsEvent: (event) => analytics.push(event.type),
    onError: (error) => errors.push(error),
  });
  controllers.add(controller);
  const target = document.createElement("div");
  await controller.mount(target);
  await controller.load(source ?? (kind === "hls" ? hlsSource : fileSource));
  return {
    analytics,
    controller,
    errors,
    video: getMountedNativeVideo(target),
  };
}

function failMedia(video: HTMLVideoElement, code: number): void {
  Object.defineProperty(video, "error", {
    configurable: true,
    value: { code, message: "" },
  });
  video.dispatchEvent(new Event("error"));
}

describe("native media error categories", () => {
  afterEach(async () => {
    await Promise.all([...controllers].map((item) => item.teardown()));
    controllers.clear();
    vi.restoreAllMocks();
  });

  // MediaError: 1 aborted, 2 network, 3 decode, 4 source not supported.
  const mediaErrors = [
    { code: 1, kind: "unknown" },
    { code: 2, kind: "network" },
    { code: 3, kind: "decode" },
    { code: 4, kind: "source" },
  ] as const;
  it.each(
    (["file", "hls"] as const).flatMap((provider) =>
      mediaErrors.map((error) => ({ ...error, provider }))
    )
  )(
    "reports $provider MediaError $code as $kind",
    async ({ code, kind, provider }) => {
      const { controller, errors, video } = await loadNative(provider);
      failMedia(video, code);
      expect(errors).toEqual([expect.objectContaining({ kind })]);
      expect(controller.getState().error?.kind).toBe(kind);
    }
  );

  it("reports a fatal source error once every <source> candidate failed", async () => {
    const { analytics, controller, errors, video } = await loadNative("file");
    const [first, last] = Array.from(video.querySelectorAll("source"));
    if (!(first && last)) {
      throw new Error("Expected two source candidates.");
    }
    // A caption request failing is not a media source failure.
    video.querySelector("track")?.dispatchEvent(new Event("error"));
    first.dispatchEvent(new Event("error"));
    expect(errors).toEqual([]);

    last.dispatchEvent(new Event("error"));

    expect(errors).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({ fatal: true, kind: "source" }),
        kind: "source",
        phase: "playback",
        sourceId: fileSource.id,
      }),
    ]);
    expect(controller.getState().snapshot.readyState).toBe("error");
    expect(analytics.filter((type) => type === "error")).toHaveLength(1);
  });

  it("clears a failed <source> list when the adapter loads again", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
      () => undefined
    );
    const adapter = createFileAdapter();
    const target = document.createElement("div");
    await adapter.mount(target);
    await adapter.load(fileSource);
    const video = getMountedNativeVideo(target);
    for (const candidate of Array.from(video.querySelectorAll("source"))) {
      candidate.dispatchEvent(new Event("error"));
    }
    expect(adapter.getSnapshot().readyState).toBe("error");

    await adapter.load({ ...fileSource, id: "replacement" });
    expect(adapter.getSnapshot().readyState).toBe("loading");
    await adapter.unmount();
  });
});
