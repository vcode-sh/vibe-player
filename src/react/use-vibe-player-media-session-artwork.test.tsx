import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fileSource,
  TestAdapter,
} from "../core/vibe-player-controller-test-helpers";
import {
  installFakeMediaSession,
  uninstallFakeMediaSession,
} from "../core/vibe-player-media-session-test-helpers";
import type { VibePlayerSource } from "../core/vibe-player-types";
import { useVibePlayer } from "./use-vibe-player";

afterEach(uninstallFakeMediaSession);

describe("useVibePlayer Media Session artwork function", () => {
  it("signs artwork once per source, however often the player re-renders", async () => {
    const page = installFakeMediaSession();
    const adapter = new TestAdapter();
    const factory = () => adapter;
    const sign = vi.fn((source: VibePlayerSource) => [
      { src: `https://cdn.example.com/${source.id}.jpg?signature=1` },
    ]);
    const view = renderHook(
      ({ source }: { source: VibePlayerSource }) =>
        useVibePlayer({
          adapterFactory: factory,
          audioFocus: false,
          // A fresh function and options object on every render, as inline JSX does.
          mediaSession: { metadata: { artwork: (each) => sign(each) } },
          source,
        }),
      { initialProps: { source: { ...fileSource, id: "first" } } }
    );
    act(() => view.result.current.setTarget(document.createElement("div")));
    act(() =>
      adapter.emit("play", {
        muted: false,
        paused: false,
        readyState: "playing",
        volume: 1,
      })
    );
    await waitFor(() =>
      expect(page.metadata?.artwork).toEqual([
        { src: "https://cdn.example.com/first.jpg?signature=1" },
      ])
    );
    const { metadata } = page;
    for (const currentTime of [1, 2, 3, 4, 5]) {
      act(() => adapter.emit("timeupdate", { currentTime }));
    }
    expect(sign).toHaveBeenCalledTimes(1);
    expect(page.metadata).toBe(metadata);

    view.rerender({ source: { ...fileSource, id: "second" } });
    await waitFor(() => expect(sign).toHaveBeenCalledTimes(2));
    expect(sign).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "second" })
    );
    view.unmount();
  });
});
