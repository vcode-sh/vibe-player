import { describe, expect, it } from "vitest";
import { collectReleaseStateIssues } from "./release-state-rules.mjs";

function createManifest(patch = {}) {
  return {
    exports: {
      ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      "./styles.css": "./dist/styles.css",
    },
    license: "UNLICENSED",
    module: "./dist/index.js",
    name: "@vibe-code/vibe-player",
    packageManager: "bun@1.3.14",
    private: true,
    publishConfig: { access: "restricted", provenance: true },
    sideEffects: ["./dist/styles.css"],
    type: "module",
    types: "./dist/index.d.ts",
    ...patch,
  };
}

function createChangesetConfig(patch = {}) {
  return { access: "restricted", commit: false, ...patch };
}

describe("release state rules", () => {
  it("accepts the current private ESM package stance", () => {
    expect(
      collectReleaseStateIssues(createManifest(), createChangesetConfig())
    ).toEqual([]);
  });

  it("flags accidental release and consumer-contract drift", () => {
    const issues = collectReleaseStateIssues(
      createManifest({
        exports: {
          ".": { import: "./src/index.ts", types: "./src/index.ts" },
          "./styles.css": "./src/styles/vibe-player.css",
        },
        license: "MIT",
        packageManager: "npm@11.0.0",
        private: false,
        publishConfig: { access: "public", provenance: false },
        sideEffects: [],
        type: "commonjs",
      }),
      createChangesetConfig({ access: "public", commit: true })
    );

    expect(issues).toContain(
      "package must stay private until the release stance changes."
    );
    expect(issues).toContain(
      'license must stay "UNLICENSED" before a public release.'
    );
    expect(issues).toContain(
      'exports["./styles.css"] must point to "./dist/styles.css".'
    );
    expect(issues).toContain('sideEffects must include "./dist/styles.css".');
    expect(issues).toContain('Changesets access must stay "restricted".');
  });
});
