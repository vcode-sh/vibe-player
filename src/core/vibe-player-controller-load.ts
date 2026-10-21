import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { handleVibePlayerLoadError } from "./vibe-player-controller-load-error";
import { restoreVibePlayerResumePosition } from "./vibe-player-controller-resume";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerSource,
} from "./vibe-player-types";

export interface LoadVibePlayerControllerSourceInput {
  adapterFactory: VibePlayerControllerOptions["adapterFactory"];
  analyticsSession: VibePlayerAnalyticsSession;
  currentState: VibePlayerControllerState;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  handleAdapterEvent: (event: VibePlayerAdapterEvent) => void;
  isCurrentOperation: (operationGeneration: number) => boolean;
  operationGeneration: number;
  resumeStore: VibePlayerControllerOptions["resumeStore"] | undefined;
  setAdapter: (adapter: VibePlayerAdapter) => void;
  setAdapterUnsubscribe: (unsubscribe: () => void) => void;
  source: VibePlayerSource;
  syncFromAdapter: () => void;
  target: HTMLElement | null;
  teardownAdapter: () => Promise<void>;
  updateState: (
    next: Partial<VibePlayerControllerState>
  ) => VibePlayerControllerState;
}

export async function loadVibePlayerControllerSource({
  adapterFactory,
  analyticsSession,
  currentState,
  emitAnalytics,
  handleAdapterEvent,
  isCurrentOperation,
  operationGeneration,
  resumeStore,
  setAdapter,
  setAdapterUnsubscribe,
  source,
  syncFromAdapter,
  target,
  teardownAdapter,
  updateState,
}: LoadVibePlayerControllerSourceInput): Promise<void> {
  analyticsSession.close(currentState);
  await teardownAdapter();
  if (!isCurrentOperation(operationGeneration)) {
    return;
  }
  analyticsSession.clear();
  const adapter = adapterFactory(source);
  setAdapter(adapter);
  updateState({
    capabilities: adapter.capabilities,
    currentSource: source,
    lastEvent: null,
    playbackBlocked: false,
    snapshot: adapter.getSnapshot(),
  });
  setAdapterUnsubscribe(adapter.subscribe(handleAdapterEvent));
  if (target) {
    await adapter.mount(target);
  }
  if (!isCurrentOperation(operationGeneration)) {
    await adapter.unmount();
    return;
  }
  await loadControllerAdapter({
    adapter,
    emitAnalytics,
    isCurrentOperation,
    operationGeneration,
    source,
    updateState,
  });
  if (!isCurrentOperation(operationGeneration)) {
    await adapter.unmount();
    return;
  }
  updateState({
    capabilities: adapter.capabilities,
    currentSource: source,
    lastEvent: "ready",
    playbackBlocked: false,
    snapshot: adapter.getSnapshot(),
  });
  analyticsSession.emitOnce({
    provider: source.type,
    sourceId: source.id,
    type: "opened",
  });
  await restoreVibePlayerResumePosition({
    adapter,
    isCurrentOperation,
    operationGeneration,
    resumeStore,
    source,
    syncFromAdapter,
  });
}

interface LoadControllerAdapterInput {
  adapter: VibePlayerAdapter;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  isCurrentOperation: (operationGeneration: number) => boolean;
  operationGeneration: number;
  source: VibePlayerSource;
  updateState: (
    next: Partial<VibePlayerControllerState>
  ) => VibePlayerControllerState;
}

async function loadControllerAdapter({
  adapter,
  emitAnalytics,
  isCurrentOperation,
  operationGeneration,
  source,
  updateState,
}: LoadControllerAdapterInput): Promise<void> {
  try {
    await adapter.load(source);
  } catch (error) {
    if (isCurrentOperation(operationGeneration)) {
      handleVibePlayerLoadError({
        adapter,
        emitAnalytics,
        source,
        updateState,
      });
    }
    throw error;
  }
}
