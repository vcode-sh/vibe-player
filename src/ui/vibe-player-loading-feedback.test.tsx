import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerAdapter } from "../core/vibe-player-runtime-types";
import { VibePlayerCompact } from "./vibe-player-compact";
import {
  stageFileSource,
  TestStageAdapter,
} from "./vibe-player-stage-test-helpers";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("initial playback loading feedback", () => {
  it("reveals delayed feedback while a requested Play awaits its adapter chunk", async () => {
    vi.useFakeTimers();
    let resolveAdapter: ((adapter: VibePlayerAdapter) => void) | undefined;
    const pendingAdapter = new Promise<VibePlayerAdapter>((resolve) => {
      resolveAdapter = resolve;
    });
    const adapterFactory = () => pendingAdapter;
    const adapter = new TestStageAdapter();
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    const root = container.querySelector(".vibe-player-compact");
    const status = screen.getByRole("status");
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Play" }));
      });
      act(() => vi.advanceTimersByTime(319));
      expect(root).toHaveAttribute("data-busy", "false");
      expect(status.textContent).toBe("");
      act(() => vi.advanceTimersByTime(1));
      expect(root).toHaveAttribute("data-busy", "true");
      expect(status).toHaveTextContent("Loading video");
      await act(async () => {
        resolveAdapter?.(adapter);
      });
      expect(root).toHaveAttribute("data-busy", "false");
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
    } finally {
      await act(async () => {
        resolveAdapter?.(adapter);
      });
    }
  });
});
