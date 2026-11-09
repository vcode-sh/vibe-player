import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VibePlayerSource } from "../core";
import { TestAdapter } from "../core/vibe-player-controller-test-helpers";
import { useVibePlayer } from "./use-vibe-player";

interface SourceSwitch {
  initial: VibePlayerSource;
  label: string;
  replacement: VibePlayerSource;
}

const switches: SourceSwitch[] = [
  {
    initial: {
      id: "stream",
      manifestUrl: "/stream.m3u8?token=first",
      type: "hls",
    },
    label: "a refreshed HLS delivery URL",
    replacement: {
      id: "stream",
      manifestUrl: "/stream.m3u8?token=second",
      type: "hls",
    },
  },
];

describe("headless provider source changes", () => {
  it.each(switches)(
    "replaces playback for $label even with the same source ID",
    async ({ initial, replacement }) => {
      const adapters: TestAdapter[] = [];
      const factorySources: VibePlayerSource[] = [];
      const adapterFactory = (source: VibePlayerSource) => {
        factorySources.push(source);
        const adapter = new TestAdapter();
        adapters.push(adapter);
        return adapter;
      };
      const { result, rerender, unmount } = renderHook(
        ({ source }) => useVibePlayer({ adapterFactory, source }),
        { initialProps: { source: initial } }
      );
      act(() => result.current.setTarget(document.createElement("div")));
      await waitFor(() => expect(result.current.state.lastEvent).toBe("ready"));
      rerender({ source: { ...initial } });
      expect(factorySources).toEqual([initial]);

      rerender({ source: replacement });
      await waitFor(() =>
        expect(result.current.state.currentSource).toEqual(replacement)
      );
      expect(factorySources).toEqual([initial, replacement]);
      expect(adapters[0]?.calls).toContain("unmount");
      unmount();
    }
  );
});
