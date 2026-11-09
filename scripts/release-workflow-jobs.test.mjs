import { describe, expect, it } from "vitest";
import {
  readPermissionLevel,
  readWorkflowJobs,
} from "./release-workflow-jobs.mjs";

// GitHub expression syntax, built without a template placeholder in a string.
const expression = (body) => ["$", "{{ ", body, " }}"].join("");

const source = [
  "permissions:",
  "  contents: read # repository default",
  "",
  "jobs:",
  "  build:",
  "    runs-on: ubuntu-26.04",
  "    steps:",
  "      - run: bun run ci",
  "  publish:",
  "    needs: [build, check]",
  "    permissions: write-all",
  "    steps:",
  "      - name: Publish",
  "        run: bun run release:publish",
  "  tag:",
  `    if: ${expression("success()")}`,
  "    needs:",
  "      - publish",
  "    permissions:",
  "      contents: write",
  "    steps:",
  "      - uses: actions/checkout@v7.0.1",
  "        with:",
  `          ref: ${expression("github.sha")}`,
  "  lockdown:",
  "    needs: tag",
  "    permissions: {}",
  "    steps:",
  "      - run: echo done",
  "",
].join("\n");

describe("readWorkflowJobs", () => {
  const jobs = readWorkflowJobs(source);
  const byName = new Map(jobs.map((job) => [job.name, job]));

  it("reads every job with its own steps, needs and condition", () => {
    expect(jobs.map((job) => job.name)).toEqual([
      "build",
      "publish",
      "tag",
      "lockdown",
    ]);
    expect(byName.get("publish")?.steps[0]?.commands).toEqual([
      "bun run release:publish",
    ]);
    expect(byName.get("tag")?.steps[0]?.settings.get("ref")).toBe(
      expression("github.sha")
    );
    expect(jobs.map((job) => job.needs)).toEqual([
      [],
      ["build", "check"],
      ["publish"],
      ["tag"],
    ]);
    expect(byName.get("tag")?.condition).toBe(expression("success()"));
  });

  it.each([
    ["build", "contents", "read"],
    ["build", "id-token", "none"],
    ["publish", "contents", "write"],
    ["publish", "id-token", "write"],
    ["tag", "contents", "write"],
    ["tag", "id-token", "none"],
    ["lockdown", "contents", "none"],
  ])(
    "resolves %s %s permissions to %s, job-level overriding the workflow",
    (name, scope, level) => {
      expect(readPermissionLevel(byName.get(name)?.permissions, scope)).toBe(
        level
      );
    }
  );

  it("reports the repository default when no permissions are declared", () => {
    const [job] = readWorkflowJobs(
      "jobs:\n  build:\n    steps:\n      - run: bun run ci\n"
    );

    expect(readPermissionLevel(job?.permissions, "contents")).toBe("default");
  });
});
