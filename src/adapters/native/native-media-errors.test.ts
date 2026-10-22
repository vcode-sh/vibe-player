import { afterEach, describe, expect, it, vi } from "vitest";
import { VibePlayerController } from "../../core/vibe-player-controller";
import type { VibePlayerError } from "../../core/vibe-player-types";
import { createFileAdapter } from "../file/create-file-adapter";
import { fileSource } from "../file/file-adapter-test-helpers";
import { createHlsAdapter } from "../hls/create-hls-adapter";
import { createHlsRuntime, hlsSource } from "../hls/hls-adapter-test-helpers";
import { getMountedNativeVideo } from "./native-video-test-helpers";

describe("native media error diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(["file", "hls"] as const)(
    "preserves native %s error details through the controller",
    async (kind) => {
      vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
        () => undefined
      );
      const { runtime } = createHlsRuntime();
      const source = kind === "hls" ? hlsSource : fileSource;
      const errors: VibePlayerError[] = [];
      const controller = new VibePlayerController({
        adapterFactory: () =>
          kind === "hls" ? createHlsAdapter(runtime) : createFileAdapter(),
        onError: (error) => errors.push(error),
      });
      const target = document.createElement("div");
      await controller.mount(target);
      await controller.load(source);
      const video = getMountedNativeVideo(target);
      Object.defineProperty(video, "error", {
        configurable: true,
        value: { code: 4, message: "Unsupported codec" },
      });
      video.dispatchEvent(new Event("error"));

      expect(errors).toEqual([
        expect.objectContaining({
          details: expect.objectContaining({
            code: 4,
            message: "Unsupported codec",
          }),
          message: "Unsupported codec",
          phase: "playback",
          provider: kind,
          sourceId: source.id,
        }),
      ]);
      expect(controller.getState().snapshot.readyState).toBe("error");
      await controller.teardown();
    }
  );
});
