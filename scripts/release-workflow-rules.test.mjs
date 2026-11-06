import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReleaseWorkflowIssues } from "./release-workflow-rules.mjs";

const INSTALL = "run: bunx playwright install --with-deps chromium webkit";
const BROWSER = "run: bun run test:browser";
const GATES = "run: bun run ci";
const PUBLISH = "run: bun run release:publish --no-git-tag";

function step(...keyLines) {
  return keyLines.map((line) => `        ${line}`).join("\n");
}

function workflow(steps) {
  const body = steps
    .map((stepText) => `      - name: step\n${stepText}`)
    .join("\n");
  return `jobs:\n  release:\n    steps:\n${body}\n`;
}

function runs(runLines) {
  return workflow(runLines.map((line) => step(line)));
}

describe("collectReleaseWorkflowIssues", () => {
  it("accepts the real release workflow", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../.github/workflows/release.yml"),
      "utf8"
    );

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("accepts the gate ordered between quality gates and publish", () => {
    const source = runs([GATES, INSTALL, BROWSER, PUBLISH]);

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("accepts shorthand steps, trailing comments, extra flags and CRLF", () => {
    const source = [
      "jobs:",
      "  release:",
      "    steps:",
      `      - ${GATES}`,
      `      - ${INSTALL} # engines`,
      `      - ${BROWSER} --reporter=line`,
      `      - ${PUBLISH}`,
    ].join("\r\n");

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("accepts a gate command inside a run block scalar", () => {
    const source = workflow([
      step(GATES),
      step("run: |", "  bunx playwright install --with-deps chromium webkit"),
      step("run: |", "  bun run test:browser"),
      step(PUBLISH),
    ]);

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("reports a missing browser engine install", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([GATES, BROWSER, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("playwright install");
  });

  it("reports a missing browser test run", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([GATES, INSTALL, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test:browser");
  });

  it("does not accept a commented-out browser test run", () => {
    const source = `${runs([GATES, INSTALL, PUBLISH])}        # ${BROWSER}\n`;
    const issues = collectReleaseWorkflowIssues(source);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test:browser");
  });

  it("reports gate steps that run before the quality gates", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([INSTALL, BROWSER, GATES, PUBLISH])
    );

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes("before"))).toBe(true);
  });

  it("reports gate steps that run after publishing", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([GATES, PUBLISH, INSTALL, BROWSER])
    );

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes("after"))).toBe(true);
  });

  it("reports a browser test step that can be skipped", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([
        step(GATES),
        step(INSTALL),
        step("if: false", BROWSER),
        step(PUBLISH),
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must not have an if: condition");
    expect(issues[0]).toContain("test:browser");
  });

  it("reports a browser test step whose failure is ignored", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([
        step(GATES),
        step(INSTALL),
        step("continue-on-error: true", BROWSER),
        step(PUBLISH),
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("continue-on-error");
  });

  it("accepts an explicit continue-on-error: false", () => {
    const source = workflow([
      step(GATES),
      step(INSTALL),
      step("continue-on-error: false", BROWSER),
      step(PUBLISH),
    ]);

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("reports a publish step that can run after a failed gate", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([
        step(GATES),
        step(INSTALL),
        step(BROWSER),
        step("if: always()", PUBLISH),
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("could publish after a failed gate");
  });

  it("reports a missing quality gates step", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([INSTALL, BROWSER, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(GATES);
  });

  it("reports a missing publish step", () => {
    const issues = collectReleaseWorkflowIssues(
      runs([GATES, INSTALL, BROWSER])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(PUBLISH);
  });
});
