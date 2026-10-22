import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core/vibe-player-types";
import {
  useVibePlayerCaptions,
  type VibePlayerCaptionTextLoader,
} from "./use-vibe-player-captions";

const source: VibePlayerFileSource = {
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/en.vtt",
    },
  ],
  id: "caption-loader",
  sources: [{ mimeType: "video/mp4", url: "/video.mp4" }],
  type: "file",
};
const firstCaption =
  "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nOriginal request";
const nextCaption = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nLatest loader";

describe("caption loader updates", () => {
  afterEach(cleanup);

  it("retains a pending request when only the host loader callback changes", async () => {
    let finish: (text: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const signals: AbortSignal[] = [];
    const firstLoader: VibePlayerCaptionTextLoader = (_track, signal) => {
      signals.push(signal);
      return pending;
    };
    const nextLoader = vi.fn<VibePlayerCaptionTextLoader>(
      async () => nextCaption
    );
    const { result, rerender } = renderHook(
      ({ loadCaptionText }) =>
        useVibePlayerCaptions({
          currentTime: 1.5,
          enabled: true,
          loadCaptionText,
          source,
        }),
      { initialProps: { loadCaptionText: firstLoader } }
    );

    rerender({ loadCaptionText: nextLoader });
    await act(async () => finish(firstCaption));

    expect(signals.map((signal) => signal.aborted)).toEqual([false]);
    expect(nextLoader).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      activeLines: ["Original request"],
      error: null,
      loading: false,
    });
  });

  it("uses the latest loader when an existing stable retry is invoked", async () => {
    const failure = new Error("Old caption endpoint unavailable");
    const firstLoader = vi
      .fn<VibePlayerCaptionTextLoader>()
      .mockRejectedValue(failure);
    const nextLoader = vi.fn<VibePlayerCaptionTextLoader>(
      async () => nextCaption
    );
    const { result, rerender } = renderHook(
      ({ loadCaptionText }) =>
        useVibePlayerCaptions({
          currentTime: 1.5,
          enabled: true,
          loadCaptionText,
          source,
        }),
      { initialProps: { loadCaptionText: firstLoader } }
    );
    await act(async () => undefined);
    expect(result.current.error).toBe(failure);
    const { retry } = result.current;

    await act(async () => rerender({ loadCaptionText: nextLoader }));
    expect(result.current.error).toBe(failure);
    expect(nextLoader).not.toHaveBeenCalled();
    await act(async () => retry());

    expect(result.current).toMatchObject({
      activeLines: ["Latest loader"],
      error: null,
      loading: false,
    });
    expect(result.current.retry).toBe(retry);
    expect(firstLoader).toHaveBeenCalledOnce();
    expect(nextLoader).toHaveBeenCalledOnce();
  });
});
