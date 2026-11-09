import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReleaseTagWorkflowIssues } from "./release-tag-workflow-rules.mjs";
import {
  buildWorkflow,
  githubReleaseStep,
  releaseJob,
  tagJob,
  tagJobKeys,
  tagStep,
} from "./release-workflow-fixtures.mjs";

const checkout = ["uses: actions/checkout@v7.0.1"];
const createTag = ['run: git tag -a "$TAG" -m "$TAG" "$GITHUB_SHA"'];
const pushTag = ['run: git push origin "refs/tags/$TAG"'];

function issuesFor(tag, permissions) {
  return collectReleaseTagWorkflowIssues(
    buildWorkflow({ jobs: [releaseJob(), tag], permissions })
  );
}

function withSteps(steps) {
  return tagJob({ steps: [checkout, ...steps] });
}

describe("collectReleaseTagWorkflowIssues", () => {
  it("accepts the real release workflow", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../.github/workflows/release.yml"),
      "utf8"
    );

    expect(collectReleaseTagWorkflowIssues(source)).toEqual([]);
  });

  it("accepts a separate tag job that needs the publishing job", () => {
    expect(issuesFor(tagJob())).toEqual([]);
  });

  it("accepts needs written as a list and contents: write inherited", () => {
    const tag = tagJob({ keys: ["needs:", "  - release"] });

    expect(issuesFor(tag, ["contents: write"])).toEqual([]);
  });

  it("reports tagging inside the publishing job", () => {
    const release = releaseJob({
      steps: [...releaseJob().steps, tagStep, githubReleaseStep],
    });
    const issues = collectReleaseTagWorkflowIssues(
      buildWorkflow({ jobs: [release] })
    );

    expect(issues.some((issue) => issue.includes("their own job"))).toBe(true);
  });

  it("reports a tag job that does not need the publishing job", () => {
    const issues = issuesFor(
      tagJob({ keys: ["permissions:", "  contents: write"] })
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("needs: release");
  });

  it("reports a tag job that can run after a failed publish", () => {
    const issues = issuesFor(tagJob({ keys: ["if: always()", ...tagJobKeys] }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("could tag after a failed publish");
  });

  it.each([
    [
      "contents: read",
      ["needs: release", "permissions:", "  contents: read"],
      "needs contents: write",
    ],
    [
      "id-token: write",
      [
        "needs: release",
        "permissions:",
        "  contents: write",
        "  id-token: write",
      ],
      "id-token",
    ],
  ])("reports a tag job with %s", (_case, keys, fragment) => {
    const issues = issuesFor(tagJob({ keys }));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(fragment);
  });

  it.each([
    ["tag creation", [pushTag, githubReleaseStep], "git tag -a"],
    ["tag push", [createTag, githubReleaseStep], "git push origin"],
    ["GitHub release", [createTag, pushTag], "gh release create"],
  ])("reports a missing %s step", (_case, steps, fragment) => {
    const issues = issuesFor(withSteps(steps));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("missing");
    expect(issues[0]).toContain(fragment);
  });

  it("reports a GitHub release created before the tag is pushed", () => {
    const issues = issuesFor(
      withSteps([createTag, githubReleaseStep, pushTag])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("gh release create");
  });

  it("reports a skippable tag step", () => {
    const issues = issuesFor(
      withSteps([[...createTag, "if: false"], pushTag, githubReleaseStep])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("if:");
  });

  it.each([
    ["run: bun install --frozen-lockfile"],
    ["run: node scripts/write-release-notes.mjs"],
    ["run: npx some-tool"],
  ])("reports dependency code in the tag job: %s", (line) => {
    const issues = issuesFor(
      withSteps([[line], createTag, pushTag, githubReleaseStep])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must not run dependency code");
  });

  it.each([
    ["a branch push", "run: git push origin HEAD:main"],
    ["a forced tag push", 'run: git push --force origin "refs/tags/$TAG"'],
    ["a forced tag push with -f", 'run: git push origin -f "refs/tags/$TAG"'],
    ["a tag deletion", 'run: git push origin --delete "refs/tags/$TAG"'],
  ])("reports %s", (_case, line) => {
    const issues = issuesFor(
      withSteps([createTag, pushTag, [line], githubReleaseStep])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("may only push the release tag");
  });

  it("requires the release notes file for the GitHub release", () => {
    const issues = issuesFor(
      withSteps([
        createTag,
        pushTag,
        ['run: gh release create "$TAG" --generate-notes'],
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("--notes-file");
  });
});
