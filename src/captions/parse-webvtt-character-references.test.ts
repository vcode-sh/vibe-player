import { expect, it } from "vitest";
import { parseWebVtt } from "./parse-webvtt";

it("decodes WebVTT character references as visible text after removing cue markup", () => {
  // WebVTT §6.4: character references produce text nodes, not literal entities.
  // https://www.w3.org/TR/webvtt1/#webvtt-cue-text-parsing-rules
  expect(
    parseWebVtt(`WEBVTT

00:01.000 --> 00:02.000
<v Speaker>A &amp; B &lt;3 &gt;2</v>`)
  ).toEqual([{ end: 2, start: 1, text: "A & B <3 >2" }]);
});
