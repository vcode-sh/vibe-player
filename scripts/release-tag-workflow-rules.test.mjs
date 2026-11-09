import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReleaseTagWorkflowIssues } from "./release-tag-workflow-rules.mjs";

const NOTES =
  'run: node scripts/write-release-notes.mjs --output "$RUNNER_TEMP/notes.md"';
const TAG_CHECK =
  'run: git ls-remote --exit-code --tags origin "refs/tags/$TAG"';
const GATES = "run: bun run ci";
const PUBLISH = "run: bun run release:publish --no-git-tag";
const TAG = 'run: git tag -a "$TAG" -m "$TAG" "$GITHUB_SHA"';
const PUSH = 'run: git push origin "refs/tags/$TAG"';
const RELEASE =
  'run: gh release create "$TAG" --notes-file "$RUNNER_TEMP/notes.md"';
const VALID_ORDER = [NOTES, TAG_CHECK, GATES, PUBLISH, TAG, PUSH, RELEASE];

function step(...keyLines) {
  return keyLines.map((line) => `        ${line}`).join("\n");
}

function workflow(steps, permissions = "contents: write") {
  const body = steps
    .map((stepText) => `      - name: step\n${stepText}`)
    .join("\n");
  return `permissions:\n  ${permissions}\n  id-token: write\n\njobs:\n  release:\n    steps:\n${body}\n`;
}

function runs(runLines, permissions) {
  return workflow(
    runLines.map((line) => step(line)),
    permissions
  );
}

describe("collectReleaseTagWorkflowIssues", () => {
  it("accepts the real release workflow", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../.github/workflows/release.yml"),
      "utf8"
    );

    expect(collectReleaseTagWorkflowIssues(source)).toEqual([]);
  });

  it("accepts tag, push and release in one block after publishing", () => {
    const source = workflow([
      step(NOTES),
      step(TAG_CHECK),
      step(PUBLISH),
      step("run: |", `  ${TAG.slice(5)}`, `  ${PUSH.slice(5)}`),
      step(RELEASE),
    ]);

    expect(collectReleaseTagWorkflowIssues(source)).toEqual([]);
  });

  it("requires contents: write", () => {
    const issues = collectReleaseTagWorkflowIssues(
      runs(VALID_ORDER, "contents: read")
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("contents: write");
  });

  it.each([
    ["changelog notes", NOTES, "write-release-notes"],
    ["existing tag check", TAG_CHECK, "git ls-remote"],
    ["tag creation", TAG, "git tag -a"],
    ["tag push", PUSH, "git push origin"],
    ["GitHub release", RELEASE, "gh release create"],
  ])("reports a missing %s step", (_step, line, fragment) => {
    const issues = collectReleaseTagWorkflowIssues(
      runs(VALID_ORDER.filter((entry) => entry !== line))
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("missing");
    expect(issues[0]).toContain(fragment);
  });

  it("reports changelog and tag checks that run only after publishing", () => {
    const issues = collectReleaseTagWorkflowIssues(
      runs([GATES, PUBLISH, NOTES, TAG_CHECK, TAG, PUSH, RELEASE])
    );

    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes("before"))).toBe(true);
  });

  it("reports tagging or releasing before publishing", () => {
    const issues = collectReleaseTagWorkflowIssues(
      runs([NOTES, TAG_CHECK, TAG, PUSH, RELEASE, PUBLISH])
    );

    expect(issues).toHaveLength(3);
    expect(issues.every((issue) => issue.includes("after"))).toBe(true);
  });

  it("reports a GitHub release created before the tag is pushed", () => {
    const issues = collectReleaseTagWorkflowIssues(
      runs([NOTES, TAG_CHECK, PUBLISH, TAG, RELEASE, PUSH])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("gh release create");
  });

  it.each([
    ["an if: condition on the tag check", "if: false", TAG_CHECK, "if:"],
    [
      "an ignored changelog failure",
      "continue-on-error: true",
      NOTES,
      "continue-on-error",
    ],
    ["a tag that runs after a failed publish", "if: always()", TAG, "if:"],
  ])("reports %s", (_case, guard, target, fragment) => {
    const source = workflow(
      VALID_ORDER.map((line) =>
        line === target ? step(guard, line) : step(line)
      )
    );
    const issues = collectReleaseTagWorkflowIssues(source);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(fragment);
  });

  it("requires the release notes file for the GitHub release", () => {
    const issues = collectReleaseTagWorkflowIssues(
      runs(
        VALID_ORDER.map((line) =>
          line === RELEASE
            ? 'run: gh release create "$TAG" --generate-notes'
            : line
        )
      )
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("--notes-file");
  });
});
