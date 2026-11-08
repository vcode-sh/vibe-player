import { SeekBackwardIcon, SeekForwardIcon } from "./vibe-player-icons";

/** A skip glyph: the ring icon with the step drawn inside it. */
export function VibePlayerSkipGlyph({
  side,
  step,
}: {
  side: -1 | 1;
  step?: number;
}) {
  return (
    <span aria-hidden className="vibe-player-skip">
      {side < 0 ? <SeekBackwardIcon /> : <SeekForwardIcon />}
      {step === undefined ? null : (
        <span className="vibe-player-skip__value">{step}</span>
      )}
    </span>
  );
}
