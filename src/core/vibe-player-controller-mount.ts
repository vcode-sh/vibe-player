import { handleVibePlayerLoadError } from "./vibe-player-controller-load-error";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

export interface MountVibePlayerControllerAdapterInput {
  adapter: VibePlayerAdapter | null;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  isCurrent: () => boolean;
  presentationTarget: HTMLElement;
  source: VibePlayerSource | null;
  target: HTMLElement;
  targetChanged: boolean;
  updateState: (
    next: Partial<VibePlayerControllerState>
  ) => VibePlayerControllerState;
}

export async function mountVibePlayerControllerAdapter({
  adapter,
  emitAnalytics,
  isCurrent,
  source,
  target,
  presentationTarget,
  targetChanged,
  updateState,
}: MountVibePlayerControllerAdapterInput): Promise<void> {
  if (!adapter) {
    return;
  }
  try {
    await adapter.mount(target, presentationTarget);
    if (targetChanged && isCurrent()) {
      updateState({
        capabilities: adapter.capabilities,
        snapshot: adapter.getSnapshot(),
      });
    }
  } catch (cause) {
    if (source && isCurrent()) {
      handleVibePlayerLoadError({
        adapter,
        cause,
        emitAnalytics,
        phase: "mount",
        source,
        updateState,
      });
    }
    throw cause;
  }
}
