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

it.each([
  ["&copy; &#380; &#x1F3AC; &NotEqualTilde;", "© ż 🎬 ≂̸"],
  ["&lt;b&gt;Literal&lt;/b&gt; &amp;lt;i&amp;gt;", "<b>Literal</b> &lt;i&gt;"],
  ["&nbsp;Indented&nbsp;", "\u00a0Indented\u00a0"],
  ["&unknown; &#0; &copy legacy", "&unknown; � © legacy"],
  ["&am<b>p;</b> &#<i>65;</i> &<b>copy;</b>", "&amp; &#65; &copy;"],
  ["<v Speaker> &nbsp; text &nbsp; </v>", " \u00a0 text \u00a0 "],
])(
  "decodes cue text once without losing literal content: %s",
  (input, text) => {
    expect(parseWebVtt(`WEBVTT\n\n00:01.000 --> 00:02.000\n${input}`)).toEqual([
      { end: 2, start: 1, text },
    ]);
  }
);
