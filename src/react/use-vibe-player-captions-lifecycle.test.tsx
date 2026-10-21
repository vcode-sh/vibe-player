import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerFileSource } from "../core/vibe-player-types";
import {
  useVibePlayerCaptions,
  type VibePlayerCaptionTextLoader,
} from "./use-vibe-player-captions";

function source(id: string): VibePlayerFileSource {
  return {
    captions: [
      { id, kind: "captions", label: id, language: "en", url: `/${id}.vtt` },
    ],
    id,
    sources: [{ mimeType: "video/mp4", url: `/${id}.mp4` }],
    type: "file",
  };
}

function captionRequest() {
  let resolve: (text: string) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<string>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const oldSource = source("old");
const currentSource = source("current");
const currentCaption =
  "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nCurrent caption";
const staleCaption = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nStale caption";

describe("caption request lifecycle", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("clears loaded captions immediately while a replacement track is pending", async () => {
    const replacement = captionRequest();
    const replacementRenders: string[][] = [];
    const loadCaptionText: VibePlayerCaptionTextLoader = (track) =>
      track.id === "old" ? Promise.resolve(staleCaption) : replacement.promise;
    const { result, rerender } = renderHook(
      ({ selectedSource }) => {
        const captions = useVibePlayerCaptions({
          currentTime: 1.5,
          enabled: true,
          loadCaptionText,
          source: selectedSource,
        });
        if (selectedSource === currentSource) {
          replacementRenders.push(captions.activeLines);
        }
        return captions;
      },
      { initialProps: { selectedSource: oldSource } }
    );
    await act(async () => undefined);
    expect(result.current.activeLines).toEqual(["Stale caption"]);

    rerender({ selectedSource: currentSource });
    expect(result.current).toMatchObject({
      activeLines: [],
      error: null,
      loading: true,
    });
    expect(replacementRenders.every((lines) => lines.length === 0)).toBe(true);
    await act(async () => replacement.resolve(currentCaption));
    expect(result.current.activeLines).toEqual(["Current caption"]);
  });

  it.each(["resolve", "reject"] as const)(
    "ignores a superseded request that later %ss despite cancellation",
    async (completion) => {
      const stale = captionRequest();
      const current = captionRequest();
      const signals: AbortSignal[] = [];
      const loadCaptionText: VibePlayerCaptionTextLoader = (track, signal) => {
        signals.push(signal);
        return track.id === "old" ? stale.promise : current.promise;
      };
      const { result, rerender } = renderHook(
        ({ selectedSource }) =>
          useVibePlayerCaptions({
            currentTime: 1.5,
            enabled: true,
            loadCaptionText,
            source: selectedSource,
          }),
        { initialProps: { selectedSource: oldSource } }
      );
      rerender({ selectedSource: currentSource });
      expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
      await act(async () => {
        if (completion === "resolve") {
          stale.resolve(staleCaption);
        } else {
          stale.reject(new Error("Stale network failure"));
        }
      });
      expect(result.current).toMatchObject({
        activeLines: [],
        error: null,
        loading: true,
      });
      await act(async () => current.resolve(currentCaption));
      expect(result.current).toMatchObject({
        activeLines: ["Current caption"],
        error: null,
        loading: false,
      });
    }
  );

  it("does not let a late old success overwrite captions already loaded for the new source", async () => {
    const stale = captionRequest();
    const loadCaptionText: VibePlayerCaptionTextLoader = (track) =>
      track.id === "old" ? stale.promise : Promise.resolve(currentCaption);
    const { result, rerender } = renderHook(
      ({ selectedSource }) =>
        useVibePlayerCaptions({
          currentTime: 1.5,
          enabled: true,
          loadCaptionText,
          source: selectedSource,
        }),
      { initialProps: { selectedSource: oldSource } }
    );
    await act(async () => rerender({ selectedSource: currentSource }));
    expect(result.current.activeLines).toEqual(["Current caption"]);
    await act(async () => stale.resolve(staleCaption));
    expect(result.current.activeLines).toEqual(["Current caption"]);
  });

  it("aborts pending captions when disabled and refuses their late result", async () => {
    const pending = captionRequest();
    const resumed = captionRequest();
    const signals: AbortSignal[] = [];
    const loadCaptionText: VibePlayerCaptionTextLoader = (_track, signal) => {
      signals.push(signal);
      return signals.length === 1 ? pending.promise : resumed.promise;
    };
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useVibePlayerCaptions({
          currentTime: 1.5,
          enabled,
          loadCaptionText,
          source: oldSource,
        }),
      { initialProps: { enabled: true } }
    );
    expect(result.current.loading).toBe(true);
    rerender({ enabled: false });
    expect(signals.map((signal) => signal.aborted)).toEqual([true]);
    await act(async () => pending.resolve(staleCaption));
    expect(result.current).toMatchObject({
      activeLines: [],
      error: null,
      loading: false,
    });
    rerender({ enabled: true });
    expect(result.current.activeLines).toEqual([]);
    expect(result.current.loading).toBe(true);
    await act(async () => resumed.resolve(currentCaption));
    expect(result.current.activeLines).toEqual(["Current caption"]);
  });

  it("rejects HTTP errors even when their body resembles valid captions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(currentCaption, { status: 403 }))
    );
    const { result } = renderHook(() =>
      useVibePlayerCaptions({
        currentTime: 1.5,
        enabled: true,
        source: currentSource,
      })
    );
    await act(async () => undefined);
    expect(result.current.error?.message).toBe(
      "Failed to load caption track current."
    );
    expect(result.current.activeLines).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
