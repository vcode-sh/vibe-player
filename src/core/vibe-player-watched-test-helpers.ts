import { vi } from "vitest";
import { VibePlayerController } from "./vibe-player-controller";
import { fileSource, TestAdapter } from "./vibe-player-controller-test-helpers";
import type { VibePlayerControllerOptions } from "./vibe-player-types";
import type { VibePlayerWatchedRangesReport } from "./vibe-player-watched-ranges";

export type WatchedPlayer = Awaited<ReturnType<typeof createWatchedPlayer>>;

/** A loaded controller with watched ranges on; tests own fake timers. */
export async function createWatchedPlayer(
  options: Partial<VibePlayerControllerOptions> = {}
) {
  const adapter = new TestAdapter();
  const reports: VibePlayerWatchedRangesReport[] = [];
  const controller = new VibePlayerController({
    ...options,
    adapterFactory: () => adapter,
    onWatchedRanges: (report) => {
      reports.push(report);
    },
  });
  await controller.load(fileSource);
  const play = (from: number, to: number) => playTestAdapter(adapter, from, to);
  const pause = () =>
    adapter.emit("pause", { paused: true, readyState: "ready" });
  return { adapter, controller, pause, play, reports };
}

/** Plays like a browser: a timeupdate every 250 ms of fake wall-clock time. */
export function playTestAdapter(
  adapter: TestAdapter,
  from: number,
  to: number
): void {
  adapter.emit("playing", {
    currentTime: from,
    paused: false,
    readyState: "playing",
  });
  for (let time = from + 0.25; time <= to + 1e-9; time += 0.25) {
    vi.advanceTimersByTime(250);
    adapter.emit("timeupdate", { currentTime: time });
  }
}
