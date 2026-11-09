import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractReleaseNotes } from "./release-notes.mjs";
import { unwrapMarkdownLines } from "./release-notes-unwrap.mjs";

/** A heading or bullet start; anything else would be a leftover wrap. */
const BLOCK_LINE = /^(?:### |- )/;

const changelog = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Added",
  "",
  "- Not released yet.",
  "",
  "## [1.10.0] - 2026-11-09",
  "",
  "### Fixed",
  "",
  "- Ten.",
  "",
  "## [1.1.0] - 2026-11-08",
  "",
  "### Added",
  "",
  "- One.",
  "",
  "## [1.0.0] - 2026-11-01",
  "",
  "## [0.9.0] - 2026-10-01",
  "",
  "- Last section.",
  "",
].join("\n");

describe("extractReleaseNotes", () => {
  it("returns only the requested section body without surrounding blank lines", () => {
    expect(extractReleaseNotes(changelog, "1.1.0")).toEqual({
      notes: "### Added\n\n- One.\n",
    });
  });

  it("does not match a version that only shares a prefix", () => {
    expect(extractReleaseNotes(changelog, "1.10.0")).toEqual({
      notes: "### Fixed\n\n- Ten.\n",
    });
    expect(extractReleaseNotes(changelog, "1.1.0").notes).not.toContain("Ten.");
  });

  it("reads the last section up to the end of the file", () => {
    expect(extractReleaseNotes(changelog, "0.9.0")).toEqual({
      notes: "- Last section.\n",
    });
  });

  it.each([
    ["a missing section", "2.0.0", "no"],
    ["an empty section", "1.0.0", "empty"],
    ["a version heading without a date", "1.2.0", "no"],
    ["a malformed version", "1.1", "not a semantic version"],
  ])("reports %s", (_case, version, fragment) => {
    const source = `${changelog}\n## [1.2.0]\n\n- Undated.\n`;
    const result = extractReleaseNotes(source, version);

    expect(result).not.toHaveProperty("notes");
    expect(result.issue).toContain(fragment);
  });

  it("extracts a released section from the real changelog", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../CHANGELOG.md"),
      "utf8"
    );
    const { notes } = extractReleaseNotes(source, "0.7.1");

    expect(notes.startsWith("### Fixed\n")).toBe(true);
    // Every bullet of that section is one line once unwrapped.
    for (const line of notes.split("\n")) {
      expect(line === "" || BLOCK_LINE.test(line)).toBe(true);
    }
    expect(notes).not.toContain("## [0.7.0]");
    expect(notes).not.toContain("[Unreleased]");
  });
});

describe("unwrapMarkdownLines", () => {
  it("joins wrapped bullets and paragraphs but keeps the structure", () => {
    const lines = [
      "### Fixed",
      "",
      "- A wrapped bullet",
      "  that continues here.",
      "  - A nested item",
      "    also wrapped.",
      "1. A numbered item",
      "   wrapped once.",
      "",
      "A paragraph",
      "over two lines.",
      "### Next heading",
      "right below.",
      "",
      "```ts",
      "const a = 1;",
      "  const b = 2;",
      "```",
      "> A quote",
      "| a | b |",
      "| - | - |",
    ];

    expect(unwrapMarkdownLines(lines)).toEqual([
      "### Fixed",
      "",
      "- A wrapped bullet that continues here.",
      "  - A nested item also wrapped.",
      "1. A numbered item wrapped once.",
      "",
      "A paragraph over two lines.",
      "### Next heading",
      "right below.",
      "",
      "```ts",
      "const a = 1;",
      "  const b = 2;",
      "```",
      "> A quote",
      "| a | b |",
      "| - | - |",
    ]);
  });

  it("unwraps the extracted notes", () => {
    const source = [
      "## [2.0.0] - 2026-11-09",
      "",
      "- One bullet",
      "  wrapped.",
      "",
    ].join("\n");

    expect(extractReleaseNotes(source, "2.0.0")).toEqual({
      notes: "- One bullet wrapped.\n",
    });
  });
});
