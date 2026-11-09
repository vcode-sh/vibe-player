import { describe, expect, it } from "vitest";
import tsdownConfig from "../tsdown.config.ts";
import {
  collectChunkNameIssues,
  collectDirectiveIssues,
  collectMinifiedIssues,
  collectReadableBuildIssues,
  readCodeSplittingGroupNames,
} from "./readable-build-rules.mjs";

const knownNames = new Set(["player", "vibe-player-compact", "tap-seek"]);
const directive = '"use client";';
const readableCode = [
  directive,
  `import { ${Array.from({ length: 80 }, (_, index) => `name${index}`).join(", ")} } from "./chunks/player.js";`,
  "",
  "function clamp(value, min, max) {",
  "  return Math.min(Math.max(value, min), max);",
  "}",
  `export { ${Array.from({ length: 80 }, (_, index) => `name${index}`).join(", ")} };`,
].join("\n");

describe("collectChunkNameIssues", () => {
  it("accepts chunks named after source modules or groups and ignores entries", () => {
    expect(
      collectChunkNameIssues(
        [
          "chunks/player.js",
          "chunks/vibe-player-compact.d.ts",
          "hook.js",
          "styles.css",
        ],
        knownNames
      )
    ).toEqual([]);
  });

  it.each([
    "chunks/player-a1b2c3d4.js",
    "chunks/player-rHVFnj5-.js",
    "chunks/tap-seek2.js",
    "chunks/vibe-player-compact-CgYckbWq.d.ts",
  ])("rejects %s, including all-lowercase hashes", (path) => {
    const issues = collectChunkNameIssues([path], knownNames);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(path);
  });
});

describe("collectDirectiveIssues", () => {
  it("accepts exactly one directive on the first line", () => {
    expect(collectDirectiveIssues("hook.js", readableCode)).toEqual([]);
  });

  it.each([
    ["missing", "export {};\n", 0],
    ["duplicated", `${directive}\n${directive}\n\nexport {};\n`, 2],
    ["not first", `import "./a.js";\n${directive}\n`, 1],
  ])("rejects a %s directive", (_case, source, count) => {
    expect(collectDirectiveIssues("hook.js", source)).toEqual([
      `hook.js: expected exactly one "use client" directive on the first line, found ${count}.`,
    ]);
  });
});

describe("collectMinifiedIssues", () => {
  it("accepts formatted code with long single-statement import/export lists", () => {
    expect(collectMinifiedIssues("hook.js", readableCode)).toEqual([]);
  });

  it("rejects one very long code line, even when it starts with an import", () => {
    const minified = `${directive}\nimport{a as b}from"./x.js";${"var c=1;".repeat(150)}`;
    const [issue] = collectMinifiedIssues("chunks/player.js", minified);

    expect(issue).toContain("a 1227-character line");
  });

  it("rejects short minified files by their average line length", () => {
    const minified = `${directive}\n${"let a=1;".repeat(30)}`;
    const [issue] = collectMinifiedIssues("chunks/tap-seek.js", minified);

    expect(issue).toContain("average line");
  });

  it("does not judge a tiny file by its average", () => {
    expect(collectMinifiedIssues("index.js", `${directive}\nlet a=1;`)).toEqual(
      []
    );
  });
});

describe("collectReadableBuildIssues", () => {
  it("checks directives and minification only in JS files", () => {
    const issues = collectReadableBuildIssues(
      [
        { path: "hook.js", source: readableCode },
        { path: "chunks/vibe-player-compact.d.ts", source: "export {};\n" },
        { path: "chunks/player-0a1b2c3d.js", source: "export{};" },
      ],
      knownNames
    );

    expect(issues).toEqual([
      'chunks/player-0a1b2c3d.js: chunk name "player-0a1b2c3d" matches no source module or code-splitting group (hashed or unstable name).',
      'chunks/player-0a1b2c3d.js: expected exactly one "use client" directive on the first line, found 0.',
    ]);
  });
});

describe("readCodeSplittingGroupNames", () => {
  it("reads the group names of the real tsdown config", () => {
    const names = readCodeSplittingGroupNames(tsdownConfig);

    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual(
      tsdownConfig.outputOptions.codeSplitting.groups.map(({ name }) => name)
    );
  });

  it("follows a renamed group and accepts its chunk", () => {
    const config = {
      outputOptions: {
        codeSplitting: { groups: [{ name: "runtime", test: () => true }] },
      },
    };
    const names = new Set(readCodeSplittingGroupNames(config));

    expect(collectChunkNameIssues(["chunks/runtime.js"], names)).toEqual([]);
    expect(collectChunkNameIssues(["chunks/player.js"], names)).toHaveLength(1);
  });

  it.each([
    ["no code splitting", {}],
    ["an array of configs", [{}, { outputOptions: {} }]],
  ])("reads no names from %s", (_case, config) => {
    expect(readCodeSplittingGroupNames(config)).toEqual([]);
  });
});
