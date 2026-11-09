import { describe, expect, it } from "vitest";
import { collectPrereleaseModeIssues } from "./prerelease-mode-rules.mjs";

describe("collectPrereleaseModeIssues", () => {
  it.each([
    ["a stable version without pre mode", "0.8.0", null],
    [
      "a prerelease in pre mode",
      "0.8.0-alpha.1",
      { mode: "pre", tag: "alpha" },
    ],
  ])("accepts %s", (_case, version, preState) => {
    expect(collectPrereleaseModeIssues(version, preState)).toEqual([]);
  });

  it("refuses a prerelease without .changeset/pre.json", () => {
    const issues = collectPrereleaseModeIssues("0.8.0-alpha.1", null);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("pre.json is missing");
    expect(issues[0]).toContain('"latest"');
  });

  it("refuses a prerelease after pre mode was exited", () => {
    const issues = collectPrereleaseModeIssues("0.8.0-rc.0", {
      mode: "exit",
      tag: "rc",
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('"exit"');
  });
});
