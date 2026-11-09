import { vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerWatchedRangesReport } from "./vibe-player-watched-ranges";

/** A loaded controller with watched ranges on; tests own fake timers. */
export async function createWatchedPlayer() {
  const adapter = new TestAdapter();
  const reports: VibePlayerWatchedRangesReport[] = [];
  const controller = new VibePlayerController({
    adapterFactory: () => adapter,
    onWatchedRanges: (report) => {
      reports.push(report);
    },
  });
  await controller.load(fileSource);
  /** Plays like a browser: a timeupdate every 250 ms of wall-clock time. */
  const play = (from: number, to: number) => {
    adapter.emit("playing", {
      currentTime: from,
      paused: false,
      readyState: "playing",
    });
    for (let time = from + 0.25; time <= to + 1e-9; time += 0.25) {
      vi.advanceTimersByTime(250);
      adapter.emit("timeupdate", { currentTime: time });
    }
  };
  const pause = () =>
    adapter.emit("pause", { paused: true, readyState: "ready" });
  return { adapter, controller, pause, play, reports };
}
