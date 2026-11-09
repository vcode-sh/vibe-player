import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReleaseJobIssues } from "./release-prepublish-rules.mjs";
import {
  buildWorkflow,
  checkoutStep,
  gatesStep,
  notesStep,
  npmCheckStep,
  publishStep,
  releaseJob,
  tagCheckStep,
  tagJob,
} from "./release-workflow-fixtures.mjs";

function issuesFor(release, permissions) {
  return collectReleaseJobIssues(
    buildWorkflow({ jobs: [release, tagJob()], permissions })
  );
}

function withSteps(steps) {
  return releaseJob({ steps });
}

describe("collectReleaseJobIssues", () => {
  it("accepts the real release workflow", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../.github/workflows/release.yml"),
      "utf8"
    );

    expect(collectReleaseJobIssues(source)).toEqual([]);
  });

  it("accepts a least-privilege release job", () => {
    expect(issuesFor(releaseJob())).toEqual([]);
  });

  it("lets job-level permissions replace a broader workflow default", () => {
    expect(issuesFor(releaseJob(), ["contents: write"])).toEqual([]);
  });

  it.each([
    [
      "workflow-level contents: write",
      [],
      ["contents: write", "id-token: write"],
    ],
    ["job-level write-all", ["permissions: write-all"], ["contents: read"]],
    ["no permissions anywhere", [], null],
  ])("rejects %s for the publishing job", (_case, keys, permissions) => {
    const issues = issuesFor(releaseJob({ keys }), permissions);

    expect(
      issues.some((issue) => issue.includes("must not get contents"))
    ).toBe(true);
  });

  it("requires id-token: write for Trusted Publishing", () => {
    const issues = issuesFor(
      releaseJob({ keys: ["permissions:", "  contents: read"] })
    );

    expect(issues).toEqual([
      'Release job "release" needs id-token: write for npm Trusted Publishing.',
    ]);
  });

  it.each([
    ["missing", ["uses: actions/checkout@v7.0.1"]],
    [
      "true",
      ["uses: actions/checkout@v7.0.1", "with:", "  persist-credentials: true"],
    ],
  ])(
    "rejects a checkout whose persist-credentials is %s",
    (_case, checkout) => {
      const issues = issuesFor(
        withSteps([
          checkout,
          notesStep,
          npmCheckStep,
          tagCheckStep,
          gatesStep,
          publishStep,
        ])
      );

      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain("persist-credentials: false");
    }
  );

  it.each([
    ["changelog notes", notesStep, "write-release-notes"],
    ["npm version check", npmCheckStep, "assert-unpublished-version"],
    ["tag check", tagCheckStep, "git ls-remote"],
  ])("reports a missing %s step", (_case, removed, fragment) => {
    const steps = releaseJob().steps.filter((step) => step !== removed);
    const issues = issuesFor(withSteps(steps));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("missing");
    expect(issues[0]).toContain(fragment);
  });

  it("reports early checks that run only after the quality gates", () => {
    const issues = issuesFor(
      withSteps([
        checkoutStep,
        gatesStep,
        notesStep,
        npmCheckStep,
        tagCheckStep,
        publishStep,
      ])
    );

    expect(issues).toHaveLength(3);
    expect(issues.every((issue) => issue.includes('before "bun run ci"'))).toBe(
      true
    );
  });

  it.each([
    ["an if: condition", "if: false", "if:"],
    ["an ignored failure", "continue-on-error: true", "continue-on-error"],
  ])("reports %s on the npm version check", (_case, guard, fragment) => {
    const issues = issuesFor(
      withSteps([
        checkoutStep,
        notesStep,
        [...npmCheckStep, guard],
        tagCheckStep,
        gatesStep,
        publishStep,
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(fragment);
  });

  it.each([
    [
      "|| true",
      '  git ls-remote --exit-code --tags origin "refs/tags/$TAG" || true',
    ],
    ["|| :", '  git ls-remote --exit-code --tags origin "refs/tags/$TAG" || :'],
    ["set +e", "  set +e"],
  ])("reports a tag check that swallows failures with %s", (_case, line) => {
    const swallowing = [
      "run: |",
      line,
      '  git ls-remote --exit-code --tags origin "refs/tags/$TAG"',
    ];
    const issues = issuesFor(
      withSteps([
        checkoutStep,
        notesStep,
        npmCheckStep,
        swallowing,
        gatesStep,
        publishStep,
      ])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("must not swallow failures");
  });

  it("reports tagging inside the publishing job", () => {
    const issues = issuesFor(
      withSteps([...releaseJob().steps, ['run: git tag -a "$TAG" -m "$TAG"']])
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('must not run "git tag"');
  });
});
