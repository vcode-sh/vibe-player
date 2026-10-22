import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { handleVibePlayerLoadError } from "./vibe-player-controller-load-error";
import { restoreVibePlayerResumePosition } from "./vibe-player-controller-resume";
import type {
  VibePlayerAdapter,
  VibePlayerAdapterEvent,
  VibePlayerAnalyticsEvent,
  VibePlayerControllerOptions,
  VibePlayerControllerState,
  VibePlayerError,
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
  presentationTarget: HTMLElement | null;
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

export async function loadVibePlayerControllerSource(
  input: LoadVibePlayerControllerSourceInput
): Promise<void> {
  input.analyticsSession.close(input.currentState);
  await input.teardownAdapter();
  if (!input.isCurrentOperation(input.operationGeneration)) {
    return;
  }
  input.analyticsSession.clear();
  const adapter = createControllerAdapter(input);
  const hasReportedError = subscribeControllerAdapter(input, adapter);
  await mountAndLoadControllerAdapter(input, adapter, hasReportedError);
  if (!input.isCurrentOperation(input.operationGeneration)) {
    await adapter.unmount();
    return;
  }
  input.updateState({
    capabilities: adapter.capabilities,
    currentSource: input.source,
    lastEvent: "ready",
    playbackBlocked: false,
    snapshot: adapter.getSnapshot(),
  });
  input.analyticsSession.emitOnce({
    provider: input.source.type,
    sourceId: input.source.id,
    type: "opened",
  });
  await restoreControllerResumePosition(input, adapter);
}

function createControllerAdapter(
  input: LoadVibePlayerControllerSourceInput
): VibePlayerAdapter {
  let adapter: VibePlayerAdapter | null = null;
  try {
    adapter = input.adapterFactory(input.source);
    input.setAdapter(adapter);
    input.updateState({
      capabilities: adapter.capabilities,
      currentSource: input.source,
      error: null,
      lastEvent: null,
      playbackBlocked: false,
      snapshot: adapter.getSnapshot(),
    });
    return adapter;
  } catch (cause) {
    reportControllerLoadError(input, adapter, cause, "create");
    throw cause;
  }
}

function subscribeControllerAdapter(
  input: LoadVibePlayerControllerSourceInput,
  adapter: VibePlayerAdapter
): () => boolean {
  let active = true;
  let errorReported = false;
  const unsubscribe = adapter.subscribe((event) => {
    if (!active) {
      return;
    }
    errorReported ||= event.type === "error";
    input.handleAdapterEvent(event);
  });
  input.setAdapterUnsubscribe(() => {
    active = false;
    unsubscribe();
  });
  return () => errorReported;
}

async function mountAndLoadControllerAdapter(
  input: LoadVibePlayerControllerSourceInput,
  adapter: VibePlayerAdapter,
  hasReportedError: () => boolean
): Promise<void> {
  let phase: VibePlayerError["phase"] = "mount";
  try {
    if (input.target) {
      await adapter.mount(
        input.target,
        input.presentationTarget ?? input.target
      );
    }
    if (!input.isCurrentOperation(input.operationGeneration)) {
      return;
    }
    phase = "load";
    await adapter.load(input.source);
  } catch (cause) {
    if (!hasReportedError()) {
      reportControllerLoadError(input, adapter, cause, phase);
    }
    throw cause;
  }
}

async function restoreControllerResumePosition(
  input: LoadVibePlayerControllerSourceInput,
  adapter: VibePlayerAdapter
): Promise<void> {
  try {
    await restoreVibePlayerResumePosition({
      adapter,
      isCurrentOperation: input.isCurrentOperation,
      operationGeneration: input.operationGeneration,
      resumeStore: input.resumeStore,
      source: input.source,
      syncFromAdapter: input.syncFromAdapter,
    });
  } catch (cause) {
    reportControllerLoadError(input, adapter, cause, "load");
    throw cause;
  }
}

function reportControllerLoadError(
  input: LoadVibePlayerControllerSourceInput,
  adapter: VibePlayerAdapter | null,
  cause: unknown,
  phase: VibePlayerError["phase"]
): void {
  if (input.isCurrentOperation(input.operationGeneration)) {
    handleVibePlayerLoadError({
      adapter,
      cause,
      emitAnalytics: input.emitAnalytics,
      phase,
      source: input.source,
      updateState: input.updateState,
    });
  }
}
