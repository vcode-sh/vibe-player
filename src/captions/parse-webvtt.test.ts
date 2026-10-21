import { describe, expect, it } from "vitest";
import { getActiveVibePlayerCaptionLines, parseWebVtt } from "./parse-webvtt";

describe("parseWebVtt", () => {
  it("preserves fractional timestamps and multiline text across CRLF, identifiers, and cue settings", () => {
    const cues = parseWebVtt(
      "WEBVTT\r\n\r\nintro\r\n01:02:03.079 --> 01:02:04.880 align:start\r\n<v Speaker>First line</v>\r\n<b>Second line</b>"
    );

    expect(cues).toEqual([
      { end: 3724.88, start: 3723.079, text: "First line\nSecond line" },
    ]);
  });

  it("skips unusable cues without dropping a later valid cue", () => {
    expect(
      parseWebVtt(`WEBVTT

NOTE Editor comment
This is not caption text.

bad --> 00:02.000
Invalid start

00:03.000 --> 00:02.000
Reversed range

00:03.000 --> 00:03.000
Empty range

00:04.000 --> 00:05.000
<b></b>

00:05.000 --> 00:06.000
Valid cue`)
    ).toEqual([{ end: 6, start: 5, text: "Valid cue" }]);
  });

  it("uses inclusive starts and exclusive ends for adjacent and overlapping cues", () => {
    const cues = [
      { end: 2, start: 1, text: "First" },
      { end: 3, start: 2, text: "Second" },
      { end: 2.5, start: 1.5, text: "Overlap" },
      { end: 2.5, start: 1.5, text: "Overlap" },
    ];
    expect(getActiveVibePlayerCaptionLines(cues, 0.999)).toEqual([]);
    expect(getActiveVibePlayerCaptionLines(cues, 1)).toEqual(["First"]);
    expect(getActiveVibePlayerCaptionLines(cues, 1.999)).toEqual([
      "First",
      "Overlap",
    ]);
    expect(getActiveVibePlayerCaptionLines(cues, 2)).toEqual([
      "Second",
      "Overlap",
    ]);
    expect(getActiveVibePlayerCaptionLines(cues, 2.5)).toEqual(["Second"]);
    expect(getActiveVibePlayerCaptionLines(cues, 3)).toEqual([]);
    expect(getActiveVibePlayerCaptionLines(cues, Number.NaN)).toEqual([]);
  });
});
