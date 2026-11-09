import { describe, expect, it } from "vitest";
import { collectApiReport } from "./api-report-collect.mjs";
import {
  findFirstReportDifference,
  formatApiReport,
  stripDeclarationComments,
} from "./api-report-format.mjs";

const entry = {
  file: "hook.d.ts",
  runtimeNames: ["createThing"],
  specifier: "vibe-player/hook",
};

function chunk(body) {
  return {
    path: "chunks/shared.d.ts",
    source: `"use client";\n${body}\nexport { Thing as t, createThing as c, ThingKind as k };\n`,
  };
}

const hook = {
  path: "hook.d.ts",
  source:
    '"use client";\nimport { c as createThing, k as ThingKind, t as Thing } from "./chunks/shared.js";\nexport { type Thing, type ThingKind, createThing };\n',
};

const baseBody = [
  "/** Kind of thing. */",
  'type ThingKind = "a" | "b";',
  "interface ThingState { ready: boolean; }",
  "interface Thing {",
  "  /** Current kind. */",
  "  kind: ThingKind;",
  "  state: ThingState;",
  "}",
  "declare function createThing(kind: ThingKind): Thing;",
].join("\n");

async function render(body, files = [hook, chunk(body)]) {
  return formatApiReport(await collectApiReport(files, [entry]));
}

describe("API report", () => {
  it("lists entry exports by kind and separates referenced private declarations", async () => {
    const report = await render(baseBody);

    expect(report).toContain(
      "```text\ntype Thing\ntype ThingKind\nvalue createThing\n```"
    );
    const [publicPart, privatePart] = report.split(
      "## Unexported declarations referenced by the public API"
    );
    expect(publicPart).toContain(
      "interface Thing {\n  kind: ThingKind;\n  state: ThingState;\n}"
    );
    expect(publicPart).toContain('type ThingKind = "a" | "b";');
    expect(publicPart).not.toContain("interface ThingState");
    expect(privatePart).toContain("interface ThingState { ready: boolean; }");
  });

  it("ignores documentation edits and declaration order", async () => {
    const reordered = [
      "declare function createThing(kind: ThingKind): Thing;",
      "interface Thing {",
      "  /** Reworded docs with a non-ASCII café. */",
      "  kind: ThingKind;",
      "  state: ThingState;",
      "}",
      "/** Résumé of the thing state. */",
      "interface ThingState { ready: boolean; }",
      'type ThingKind = "a" | "b";',
    ].join("\n");

    expect(await render(reordered)).toBe(await render(baseBody));
  });

  it.each([
    ["union widening", baseBody.replace('"a" | "b"', '"a" | "b" | "c"')],
    [
      "a new required member on a private referenced type",
      baseBody.replace("ready: boolean;", "ready: boolean; id: string;"),
    ],
  ])("changes the report for %s", async (_change, body) => {
    expect(await render(body)).not.toBe(await render(baseBody));
  });

  it("marks a value export that becomes type-only", async () => {
    const typeOnlyHook = {
      ...hook,
      source: hook.source.replace(", createThing }", ", type createThing }"),
    };
    const report = formatApiReport(
      await collectApiReport(
        [typeOnlyHook, chunk(baseBody)],
        [{ ...entry, runtimeNames: [] }]
      )
    );

    expect(report).toContain("type createThing");
    expect(report).not.toContain("value createThing");
  });
});

describe("stripDeclarationComments", () => {
  it("drops comment lines and keeps code that follows a closed block comment", () => {
    const text = [
      "interface A {",
      "  /**",
      "   * Multi-line docs.",
      "   */",
      "  a: string;",
      "  /** one-line */ b: number;",
      "  // line comment",
      '  url: "https://example.com";',
      "}",
    ].join("\n");

    expect(stripDeclarationComments(text)).toBe(
      'interface A {\n  a: string;\n  b: number;\n  url: "https://example.com";\n}'
    );
  });
});

describe("findFirstReportDifference", () => {
  it("returns nothing for identical reports", () => {
    expect(findFirstReportDifference("a\nb\n", "a\nb\n")).toBeUndefined();
  });

  it("reports the first changed line and a missing tail", () => {
    expect(findFirstReportDifference("a\nb\nc", "a\nx\nc")).toEqual({
      actual: "x",
      expected: "b",
      line: 2,
    });
    expect(findFirstReportDifference("a", "a\nb")).toEqual({
      actual: "b",
      expected: "<end of report>",
      line: 2,
    });
  });
});
