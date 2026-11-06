import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReleaseWorkflowIssues } from "./release-workflow-rules.mjs";

const INSTALL = "run: bunx playwright install --with-deps chromium webkit";
const BROWSER = "run: bun run test:browser";
const GATES = "run: bun run ci";
const PUBLISH = "run: bun run release:publish --no-git-tag";

function workflow(runLines) {
  return runLines
    .map((line) => `      - name: step\n        ${line}`)
    .join("\n");
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
    const source = workflow([GATES, INSTALL, BROWSER, PUBLISH]);

    expect(collectReleaseWorkflowIssues(source)).toEqual([]);
  });

  it("reports a missing browser engine install", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([GATES, BROWSER, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("playwright install");
  });

  it("reports a missing browser test run", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([GATES, INSTALL, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test:browser");
  });

  it("does not accept a commented-out browser test run", () => {
    const source = `${workflow([GATES, INSTALL, PUBLISH])}\n        # ${BROWSER}`;
    const issues = collectReleaseWorkflowIssues(source);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("test:browser");
  });

  it("reports gate steps that run before the quality gates", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([INSTALL, BROWSER, GATES, PUBLISH])
    );

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes("before"))).toBe(true);
  });

  it("reports gate steps that run after publishing", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([GATES, PUBLISH, INSTALL, BROWSER])
    );

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes("after"))).toBe(true);
  });

  it("reports a missing quality gates step", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([INSTALL, BROWSER, PUBLISH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(GATES);
  });

  it("reports a missing publish step", () => {
    const issues = collectReleaseWorkflowIssues(
      workflow([GATES, INSTALL, BROWSER])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(PUBLISH);
  });
});
