import { shouldRestoreVibePlayerResumePosition } from "./vibe-player-resume";
import type {
  VibePlayerAdapter,
  VibePlayerResumeStore,
  VibePlayerSource,
} from "./vibe-player-types";

export interface RestoreVibePlayerResumePositionInput {
  adapter: VibePlayerAdapter;
  isCurrentOperation: (operationGeneration: number) => boolean;
  operationGeneration: number;
  resumeStore: VibePlayerResumeStore | undefined;
  source: VibePlayerSource;
  syncFromAdapter: () => void;
}

export async function restoreVibePlayerResumePosition({
  adapter,
  isCurrentOperation,
  operationGeneration,
  resumeStore,
  source,
  syncFromAdapter,
}: RestoreVibePlayerResumePositionInput): Promise<void> {
  const resumeTime = resumeStore?.get(source.id);
  const shouldRestore = shouldRestoreVibePlayerResumePosition({
    canSeek: adapter.capabilities.canSeek,
    duration: adapter.getSnapshot().duration,
    isCurrentOperation: isCurrentOperation(operationGeneration),
    resumeTime,
  });
  if (!(shouldRestore && resumeTime)) {
    return;
  }
  await adapter.seekTo(resumeTime);
  if (!isCurrentOperation(operationGeneration)) {
    return;
  }
  syncFromAdapter();
}
