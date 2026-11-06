import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerFullStage } from "./vibe-player-full-stage";
import type { VibePlayerStageProps } from "./vibe-player-stage-types";
import { VibePlayerUIProvider } from "./vibe-player-ui-context";

export type { VibePlayerStageProps } from "./vibe-player-stage-types";

/** Selects a chrome assembly without changing the provider or host contracts. */
export function VibePlayerStage(props: VibePlayerStageProps) {
  if (props.variant === "compact" || props.variant === "feed") {
    return <VibePlayerCompact {...props} variant={props.variant} />;
  }
  return (
    <VibePlayerUIProvider {...props}>
      <VibePlayerFullStage {...props} />
    </VibePlayerUIProvider>
  );
}
