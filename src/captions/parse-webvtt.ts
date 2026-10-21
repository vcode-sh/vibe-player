export interface VibePlayerCaptionCue {
  end: number;
  start: number;
  text: string;
}

const CAPTION_BLOCK_SEPARATOR = /\n{2,}/;
const CAPTION_CARRIAGE_RETURN = /\r/g;
const CAPTION_LINE_BREAK = /\r\n/g;
const CAPTION_SETTING_SEPARATOR = /\s+/;
const CAPTION_TAG = /<[^>]+>/g;

function parseCaptionTimestamp(value: string): number | null {
  const parts = value.trim().replace(",", ".").split(":");
  if (parts.length !== 2 && parts.length !== 3) {
    return null;
  }

  const seconds = Number(parts.at(-1));
  const minutes = Number(parts.at(-2));
  const hours = parts.length === 3 ? Number(parts[0]) : 0;

  if (
    !(
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      Number.isFinite(seconds)
    )
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function stripCaptionMarkup(text: string): string {
  return text.replace(CAPTION_TAG, "");
}

function parseCaptionBlock(block: string): VibePlayerCaptionCue | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [firstLine] = lines;
  if (!firstLine || firstLine.startsWith("WEBVTT") || firstLine === "NOTE") {
    return null;
  }

  const timingLineIndex = lines.findIndex((line) => line.includes("-->"));
  const timingLine = lines[timingLineIndex];
  if (timingLineIndex < 0 || !timingLine) {
    return null;
  }

  const [startText, endTextWithSettings] = timingLine.split("-->");
  const endText = endTextWithSettings
    ?.trim()
    .split(CAPTION_SETTING_SEPARATOR)[0];

  if (!(startText && endText)) {
    return null;
  }

  const start = parseCaptionTimestamp(startText);
  const end = parseCaptionTimestamp(endText);
  const text = stripCaptionMarkup(
    lines.slice(timingLineIndex + 1).join("\n")
  ).trim();

  if (start === null || end === null || end <= start || text.length === 0) {
    return null;
  }

  return { end, start, text };
}

export function getActiveVibePlayerCaptionLines(
  cues: VibePlayerCaptionCue[],
  currentTime: number
): string[] {
  if (!Number.isFinite(currentTime)) {
    return [];
  }

  const lines = new Set<string>();
  for (const cue of cues) {
    if (currentTime >= cue.start && currentTime < cue.end) {
      lines.add(cue.text);
    }
  }

  return Array.from(lines);
}

export function parseWebVtt(content: string): VibePlayerCaptionCue[] {
  const normalized = content
    .replace(CAPTION_LINE_BREAK, "\n")
    .replace(CAPTION_CARRIAGE_RETURN, "\n");
  const cues: VibePlayerCaptionCue[] = [];

  for (const block of normalized.split(CAPTION_BLOCK_SEPARATOR)) {
    const cue = parseCaptionBlock(block);
    if (cue) {
      cues.push(cue);
    }
  }

  return cues;
}
