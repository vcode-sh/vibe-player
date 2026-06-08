import { describe, expect, it } from "vitest";
import { getActiveVibePlayerCaptionLines, parseWebVtt } from "./parse-webvtt";

describe("parseWebVtt", () => {
  it("parses cues from a webvtt payload", () => {
    const cues = parseWebVtt(`WEBVTT

1
00:00:03.079 --> 00:00:04.880
to own craft.

2
00:00:04.880 --> 00:00:07.420
<v Speaker>So it's not just the designer saying,`);

    expect(cues).toEqual([
      { end: 4.88, start: 3.079, text: "to own craft." },
      {
        end: 7.42,
        start: 4.88,
        text: "So it's not just the designer saying,",
      },
    ]);
  });

  it("returns active lines for a given time", () => {
    const cues = parseWebVtt(`WEBVTT

00:00:01.000 --> 00:00:02.000
First line

00:00:02.000 --> 00:00:03.000
Second line`);

    expect(getActiveVibePlayerCaptionLines(cues, 1.5)).toEqual(["First line"]);
    expect(getActiveVibePlayerCaptionLines(cues, 2.5)).toEqual(["Second line"]);
  });
});
