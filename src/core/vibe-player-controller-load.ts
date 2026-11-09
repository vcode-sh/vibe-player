import type { VibePlayerAnalyticsSession } from "./vibe-player-analytics";
import { handleVibePlayerLoadError } from "./vibe-player-controller-load-error";
import { restoreVibePlayerResumePosition } from "./vibe-player-controller-resume";
import type { VibePlayerRawFeed } from "./vibe-player-raw-feed";
import { createIdleSnapshot } from "./vibe-player-time";
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
  beginSession: () => void;
  emitAnalytics: (event: VibePlayerAnalyticsEvent) => void;
  /** Hears the resume seek before it happens, so it is not a viewer seek. */
  feed: VibePlayerRawFeed;
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
  // Retry, renewal and reattaching the same source keep the session.
  input.analyticsSession.attach(input.source);
  await input.teardownAdapter();
  if (!input.isCurrentOperation(input.operationGeneration)) {
    return;
  }
  input.beginSession();
  const adapter = await createControllerAdapter(input);
  if (!(adapter && input.isCurrentOperation(input.operationGeneration))) {
    return;
  }
  const hasReportedError = subscribeControllerAdapter(input, adapter);
  if (!input.isCurrentOperation(input.operationGeneration)) {
    return;
  }
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
  if (!input.isCurrentOperation(input.operationGeneration)) {
    return;
  }
  input.analyticsSession.open(input.source);
  await restoreControllerResumePosition(input, adapter);
}

async function createControllerAdapter(
  input: LoadVibePlayerControllerSourceInput
): Promise<VibePlayerAdapter | null> {
  let adapter: VibePlayerAdapter | null = null;
  try {
    const created = input.adapterFactory(input.source);
    if (created instanceof Promise) {
      input.updateState({
        capabilities: null,
        currentSource: input.source,
        error: null,
        lastEvent: null,
        playbackBlocked: false,
        snapshot: {
          ...createIdleSnapshot(),
          duration: input.source.durationSeconds ?? 0,
          readyState: "loading",
        },
      });
    }
    adapter = await created;
    if (!input.isCurrentOperation(input.operationGeneration)) {
      await adapter.unmount();
      return null;
    }
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
    errorReported ||= event.type === "error" && event.payload?.fatal !== false;
    input.handleAdapterEvent(event);
  });
  const dispose = () => {
    active = false;
    unsubscribe();
  };
  if (input.isCurrentOperation(input.operationGeneration)) {
    input.setAdapterUnsubscribe(dispose);
  } else {
    dispose();
  }
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
    const loading = adapter.load(input.source);
    // Capabilities may depend on the accepted source (for example where
    // controls render), so publish them before slow provider readiness.
    input.updateState({ capabilities: adapter.capabilities });
    await loading;
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
      announce: (target) =>
        input.feed.seek({
          initiator: "restore",
          snapshot: adapter.getSnapshot(),
          source: input.source,
          target,
        }),
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
