import { useVibePlayer, type VibePlayerSource } from "vibe-player";

interface HeadlessPlayerProps {
  source: VibePlayerSource;
}

export function HeadlessPlayer({ source }: HeadlessPlayerProps) {
  const { controller, setTarget, state } = useVibePlayer({ source });
  return (
    <section aria-label="Headless player">
      <div className="headless-target" ref={setTarget} />
      <button onClick={() => controller.play()} type="button">
        Custom play
      </button>
      <button onClick={() => controller.pause()} type="button">
        Custom pause
      </button>
      <output aria-label="Headless playback">
        {state.snapshot.paused ? "paused" : "playing"}
      </output>
    </section>
  );
}
