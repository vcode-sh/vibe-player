import { useRef, useState } from "react";
import {
  formatVibePlayerTime,
  type VibePlayerController,
  type VibePlayerControllerState,
  VibePlayerHeadless,
} from "vibe-player";
import { landscapeSource, loadLightHls } from "../adoption-sources";

function run(command: Promise<void> | undefined): void {
  command?.catch(() => undefined);
}

/** The host owns every control; the package owns the same playback lifecycle. */
export function AdoptionCustomPlayer() {
  const controller = useRef<VibePlayerController | null>(null);
  const [state, setState] = useState<VibePlayerControllerState | null>(null);
  const time = state?.snapshot.currentTime ?? 0;
  const duration =
    state?.snapshot.duration || landscapeSource.durationSeconds || 0;
  const paused = state?.snapshot.paused ?? true;
  return (
    <section
      aria-label="Headless controls example"
      className="vp-adoption-custom"
    >
      <VibePlayerHeadless
        className="vp-adoption-custom__video"
        controllerRef={controller}
        load="onPlay"
        loadHls={loadLightHls}
        onStateChange={setState}
        source={{ ...landscapeSource, id: "adoption-headless" }}
        videoProps={{ "aria-label": "Host-controlled landscape video" }}
      />
      <div className="vp-adoption-custom__controls">
        <button
          className="vp-adoption-action"
          onClick={() =>
            run(
              paused ? controller.current?.play() : controller.current?.pause()
            )
          }
          type="button"
        >
          {paused ? "Play" : "Pause"}
        </button>
        <input
          aria-label="Playback position"
          aria-valuetext={`${formatVibePlayerTime(time)} of ${formatVibePlayerTime(duration)}`}
          max={duration}
          min={0}
          onChange={(event) =>
            run(controller.current?.seek(Number(event.target.value)))
          }
          step={0.1}
          type="range"
          value={Math.min(duration, time)}
        />
        <output aria-label="Current time">{formatVibePlayerTime(time)}</output>
        <button
          className="vp-adoption-action"
          onClick={() => run(controller.current?.stop())}
          type="button"
        >
          Stop
        </button>
      </div>
      {state?.error ? (
        <div role="status">
          <p>{state.error.message}</p>
          <button
            className="vp-adoption-action"
            onClick={() => run(controller.current?.retry())}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}
    </section>
  );
}
