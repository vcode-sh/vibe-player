const RESUME_END_GUARD_SECONDS = 1;

export interface ShouldRestoreVibePlayerResumePositionInput {
  canSeek: boolean;
  duration: number;
  isCurrentOperation: boolean;
  resumeTime: number | null | undefined;
}

export function shouldRestoreVibePlayerResumePosition({
  canSeek,
  duration,
  isCurrentOperation,
  resumeTime,
}: ShouldRestoreVibePlayerResumePositionInput): boolean {
  if (!(resumeTime && resumeTime > 0 && canSeek && isCurrentOperation)) {
    return false;
  }
  if (!(Number.isFinite(duration) && duration > 0)) {
    return true;
  }
  return resumeTime < duration - RESUME_END_GUARD_SECONDS;
}
