import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { VibePlayerSeekRipple } from "./vibe-player-seek-ripple";
import { clampVibePlayerTime } from "./vibe-player-surface-phase";
import type {
  VibePlayerSeekRippleState,
  VibePlayerTapSeek,
} from "./vibe-player-tap-seek";

export interface UseVibePlayerTapSeekOptions {
  duration: number;
  /** The media can seek right now. */
  enabled: boolean;
  /** Playback position when a burst starts. */
  getTime: () => number;
  /** The host turned double-tap seek on; its code loads only then. */
  requested: boolean;
  seekTo: (seconds: number) => void;
  step: number;
}

/**
 * Touch double-tap seeking for a picture. Each burst seeks from where the
 * previous step aimed, so fast taps add up before the media reports its new
 * position. Until the gesture chunk loads, a tap keeps its single meaning.
 */
export function useVibePlayerTapSeek(options: UseVibePlayerTapSeekOptions) {
  const [machine, setMachine] = useState<VibePlayerTapSeek | null>(null);
  const [ripple, setRipple] = useState<VibePlayerSeekRippleState | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const aim = useRef<number | null>(null);
  const { requested } = options;
  useEffect(() => {
    if (!requested) {
      return;
    }
    let cancelled = false;
    import("./vibe-player-tap-seek").then(
      ({ createVibePlayerTapSeek }) => {
        if (cancelled) {
          return;
        }
        const created = createVibePlayerTapSeek({
          end() {
            aim.current = null;
            setRipple((current) => current && { ...current, active: false });
          },
          seek(side, count) {
            const { duration, getTime, seekTo, step } = latest.current;
            const from = aim.current ?? getTime();
            aim.current = clampVibePlayerTime(from + side * step, duration);
            seekTo(aim.current);
            setRipple({ active: true, count, seconds: count * step, side });
          },
        });
        setMachine(created);
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [requested]);
  useEffect(() => () => machine?.cancel(), [machine]);
  /** Routes one touch tap on `area`; `single` keeps the tap's own meaning. */
  const tap = (
    event: MouseEvent<HTMLElement>,
    area: Element,
    single: () => void
  ) => {
    const { left, width } = area.getBoundingClientRect();
    if (machine && latest.current.enabled && requested) {
      machine.tap((event.clientX - left) / width, single);
    } else {
      single();
    }
  };
  const indicator: ReactNode = ripple ? (
    <VibePlayerSeekRipple ripple={ripple} />
  ) : null;
  return { indicator, tap };
}
