export type VibePlayerProgressEventName =
  | "progress_25"
  | "progress_50"
  | "progress_75";

export interface VibePlayerProgressMilestone {
  event: VibePlayerProgressEventName;
  progressPct: 25 | 50 | 75;
}

const progressMilestones: VibePlayerProgressMilestone[] = [
  { event: "progress_25", progressPct: 25 },
  { event: "progress_50", progressPct: 50 },
  { event: "progress_75", progressPct: 75 },
];

export function getVibePlayerProgressMilestone(
  percent: number,
  sentEvents: ReadonlySet<string>
): VibePlayerProgressMilestone | null {
  for (const milestone of progressMilestones) {
    if (percent >= milestone.progressPct && !sentEvents.has(milestone.event)) {
      return milestone;
    }
  }
  return null;
}
