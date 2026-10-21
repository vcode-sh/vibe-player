import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core/vibe-player-types";
import {
  useVibePlayerCaptions,
  type VibePlayerCaptionTextLoader,
} from "./use-vibe-player-captions";

const fileSource: VibePlayerFileSource = {
  captions: [
    {
      id: "secondary",
      kind: "captions",
      label: "Secondary",
      language: "en",
      url: "https://example.com/secondary.vtt",
    },
    {
      default: true,
      id: "primary",
      kind: "captions",
      label: "Primary",
      language: "en",
      url: "https://example.com/primary.vtt",
    },
  ],
  id: "captioned-video",
  sources: [{ mimeType: "video/mp4", url: "https://example.com/video.mp4" }],
  type: "file",
};

const webVtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
First line

00:00:02.000 --> 00:00:03.000
Second line`;

describe("useVibePlayerCaptions", () => {
  it("loads the default caption track and returns active lines", async () => {
    const loadCaptionText = vi.fn<VibePlayerCaptionTextLoader>(() =>
      Promise.resolve(webVtt)
    );
    const { result, rerender } = renderHook(
      ({ currentTime }) =>
        useVibePlayerCaptions({
          currentTime,
          enabled: true,
          loadCaptionText,
          source: fileSource,
        }),
      { initialProps: { currentTime: 1.5 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const [firstCall] = loadCaptionText.mock.calls;
    if (!firstCall) {
      throw new Error("Expected caption loader to be called.");
    }
    expect(firstCall[0]).toBe(fileSource.captions?.[1]);
    expect(firstCall[1]).toBeInstanceOf(AbortSignal);
    expect(result.current.track?.id).toBe("primary");
    expect(result.current.activeLines).toEqual(["First line"]);

    rerender({ currentTime: 2.5 });
    expect(result.current.activeLines).toEqual(["Second line"]);
  });

  it("does not load captions while disabled", () => {
    const loadCaptionText = vi.fn(() => Promise.resolve(webVtt));
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: false,
        loadCaptionText,
        source: fileSource,
      })
    );

    expect(loadCaptionText).not.toHaveBeenCalled();
    expect(result.current.activeLines).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("reports loader errors without throwing into render", async () => {
    const loadCaptionText = vi.fn(() =>
      Promise.reject(new Error("Caption network error"))
    );
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: true,
        loadCaptionText,
        source: fileSource,
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("Caption network error");
    expect(result.current.activeLines).toEqual([]);
  });
});
