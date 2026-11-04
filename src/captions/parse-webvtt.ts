import { decodeHTML } from "entities/decode";

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
const CAPTION_TIMESTAMP = /^(?:(\d+):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;
const CAPTION_SIGNATURE = /^\uFEFF?WEBVTT(?:[ \t]|\n|$)/;

function parseCaptionTimestamp(value: string): number | null {
  const match = CAPTION_TIMESTAMP.exec(value.trim().replace(",", "."));
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  const timestamp = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function stripCaptionMarkup(text: string): string {
  // References cannot cross tags, and decoded angle brackets remain text.
  return text
    .split(CAPTION_TAG)
    .map((span) => decodeHTML(span))
    .join("");
}

function parseCaptionBlock(block: string): VibePlayerCaptionCue | null {
  const lines = block.split("\n").filter((line) => line.length > 0);

  const [firstLine] = lines;
  if (!firstLine || firstLine === "NOTE") {
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
  const text = stripCaptionMarkup(lines.slice(timingLineIndex + 1).join("\n"));

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

  for (const [index, block] of normalized
    .split(CAPTION_BLOCK_SEPARATOR)
    .entries()) {
    if (index === 0 && CAPTION_SIGNATURE.test(block)) {
      continue;
    }
    const cue = parseCaptionBlock(block);
    if (cue) {
      cues.push(cue);
    }
  }

  return cues;
}
