import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core/vibe-player-types";
import {
  useVibePlayerCaptions,
  type VibePlayerCaptionTextLoader,
} from "./use-vibe-player-captions";

const first: VibePlayerFileSource = {
  captions: [
    {
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/en.vtt",
    },
  ],
  id: "caption-status",
  sources: [{ mimeType: "video/mp4", url: "/video.mp4" }],
  type: "file",
};
const next: VibePlayerFileSource = {
  ...first,
  captions: [
    {
      id: "pl",
      kind: "captions",
      label: "Polish",
      language: "pl",
      url: "/pl.vtt",
    },
  ],
};
const caption = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nRecovered caption";

describe("caption status and recovery", () => {
  afterEach(cleanup);

  it("captures a synchronous loader failure as caption status instead of throwing into React", async () => {
    const failure = new Error("Caption cache unavailable");
    const loadCaptionText = () => {
      throw failure;
    };
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: true,
        loadCaptionText,
        source: first,
      })
    );
    await act(async () => undefined);
    expect(result.current).toMatchObject({
      activeLines: [],
      error: failure,
      loading: false,
    });
    expect(result.current.track?.id).toBe("en");
  });

  it("clears failure while disabled and loads captions when the host retries", async () => {
    const failure = new Error("Caption delivery failed");
    const loadCaptionText = vi
      .fn<VibePlayerCaptionTextLoader>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(caption);
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useVibePlayerCaptions({
          currentTime: 1.5,
          enabled,
          loadCaptionText,
          source: first,
        }),
      { initialProps: { enabled: true } }
    );
    await act(async () => undefined);
    expect(result.current.error).toBe(failure);
    rerender({ enabled: false });
    expect(result.current).toMatchObject({
      activeLines: [],
      error: null,
      loading: false,
    });
    await act(async () => rerender({ enabled: true }));
    expect(result.current).toMatchObject({
      activeLines: ["Recovered caption"],
      error: null,
      loading: false,
    });
    expect(loadCaptionText).toHaveBeenCalledTimes(2);
  });

  it("retries a rejected caption request and clears its failure on success", async () => {
    const failure = new Error("Caption request failed");
    const loadCaptionText = vi
      .fn<VibePlayerCaptionTextLoader>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(caption);
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: true,
        loadCaptionText,
        source: first,
      })
    );
    await act(async () => undefined);
    expect(result.current.error).toBe(failure);
    const { retry } = result.current;
    await act(async () => retry());
    expect(result.current).toMatchObject({
      activeLines: ["Recovered caption"],
      error: null,
      loading: false,
    });
    expect(result.current.retry).toBe(retry);
    expect(loadCaptionText).toHaveBeenCalledTimes(2);
  });

  it("ignores a pending request that resolves after a newer retry", async () => {
    let finishOld: (text: string) => void = () => undefined;
    const old = new Promise<string>((resolve) => {
      finishOld = resolve;
    });
    const signals: AbortSignal[] = [];
    const loadCaptionText = vi.fn<VibePlayerCaptionTextLoader>(
      (_track, signal) => {
        signals.push(signal);
        return signals.length === 1 ? old : Promise.resolve(caption);
      }
    );
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: true,
        loadCaptionText,
        source: first,
      })
    );
    await act(async () => result.current.retry());
    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
    expect(result.current.activeLines).toEqual(["Recovered caption"]);
    await act(async () =>
      finishOld("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nObsolete caption")
    );
    expect(result.current.activeLines).toEqual(["Recovered caption"]);
    expect(result.current.error).toBeNull();
  });

  it("never attributes an old error to a pending replacement track", async () => {
    const oldError = new Error("English unavailable");
    let complete: (text: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      complete = resolve;
    });
    const loadCaptionText = vi
      .fn<VibePlayerCaptionTextLoader>()
      .mockRejectedValueOnce(oldError)
      .mockReturnValueOnce(pending);
    const replacementErrors: (Error | null)[] = [];
    const { result, rerender } = renderHook(
      ({ source }) => {
        const state = useVibePlayerCaptions({
          currentTime: 1.5,
          enabled: true,
          loadCaptionText,
          source,
        });
        if (source === next) {
          replacementErrors.push(state.error);
        }
        return state;
      },
      { initialProps: { source: first } }
    );
    await act(async () => undefined);
    expect(result.current.error).toBe(oldError);
    rerender({ source: next });
    expect(replacementErrors).not.toContain(oldError);
    expect(result.current.track?.id).toBe("pl");
    expect(result.current.loading).toBe(true);
    await act(async () => complete(caption));
    expect(result.current.error).toBeNull();
  });
});
