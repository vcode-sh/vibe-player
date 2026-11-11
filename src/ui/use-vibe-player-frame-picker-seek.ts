import { useCallback, useEffect, useRef, useState } from "react";
import type {
  VibePlayerController,
  VibePlayerSnapshot,
  VibePlayerSource,
} from "../core";

interface SeekRun {
  /** The seek the controller acknowledged; it settles on the next ready state. */
  acknowledged: boolean;
  /** The time last seeked to, once that seek settled. */
  settled: number | null;
  /** The seek in flight. */
  target: number | null;
  /** The latest wanted time; it waits while another seek is in flight. */
  wanted: number | null;
}

/** States in which the media has not shown the frame at its position yet. */
const unsettled: ReadonlySet<VibePlayerSnapshot["readyState"]> = new Set([
  "buffering",
  "idle",
  "loading",
]);

/**
 * Seeks the paused media to `time` once the duration is known, one seek at a
 * time: a time wanted while a seek is in flight waits for it to settle, and
 * only the latest one is seeked then, so a drag never queues stale segment
 * loads. A new controller or loaded source starts over. Returns whether a
 * seek is in flight.
 */
export function useVibePlayerFramePickerSeek(
  controller: VibePlayerController,
  source: VibePlayerSource | null,
  duration: number,
  time: number
): boolean {
  const [seeking, setSeeking] = useState(false);
  const run = useRef<SeekRun>(createSeekRun());
  // Declared first so it runs before this commit's seek.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The controller and source identities are the reset keys.
  useEffect(() => {
    run.current = createSeekRun();
    setSeeking(false);
  }, [controller, source]);
  const step = useCallback(() => {
    const { current } = run;
    if (current.target !== null) {
      const { readyState } = controller.getState().snapshot;
      if (!current.acknowledged || unsettled.has(readyState)) {
        return;
      }
      current.settled = current.target;
      current.target = null;
    }
    const { settled, wanted } = current;
    if (wanted === null || wanted === settled) {
      setSeeking(false);
      return;
    }
    current.target = wanted;
    current.acknowledged = false;
    setSeeking(true);
    const done = () => {
      if (run.current === current && current.target === wanted) {
        current.acknowledged = true;
        step();
      }
    };
    controller.seekTo(wanted).then(done, done);
  }, [controller]);
  useEffect(() => controller.subscribe(step), [controller, step]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new source seeks again after the reset above.
  useEffect(() => {
    if (duration > 0) {
      run.current.wanted = time;
      step();
    }
  }, [duration, source, step, time]);
  return seeking;
}

function createSeekRun(): SeekRun {
  return { acknowledged: false, settled: null, target: null, wanted: null };
}
