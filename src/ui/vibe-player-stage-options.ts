import { createVibePlayerAdapter } from "../adapters";
import type {
  VibePlayerAdapter,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "../core";

export interface VibePlayerStageControllerOptionsInput {
  adapterFactory?:
    | ((source: VibePlayerSource) => VibePlayerAdapter)
    | undefined;
  onAnalyticsEvent?: ((event: VibePlayerAnalyticsEvent) => void) | undefined;
  resumeStore?: VibePlayerResumeStore | undefined;
}

export function createVibePlayerStageControllerOptions({
  adapterFactory,
  onAnalyticsEvent,
  resumeStore,
}: VibePlayerStageControllerOptionsInput): VibePlayerControllerOptions {
  const options: VibePlayerControllerOptions = {
    adapterFactory: adapterFactory ?? createVibePlayerAdapter,
  };
  if (onAnalyticsEvent) {
    options.onAnalyticsEvent = onAnalyticsEvent;
  }
  if (resumeStore) {
    options.resumeStore = resumeStore;
  }
  return options;
}
