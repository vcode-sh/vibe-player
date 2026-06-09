import { describe, expect, it } from "vitest";
import { collectReleaseStateIssues } from "./release-state-rules.mjs";

function createManifest(patch = {}) {
  return {
    bin: { "vibe-player-media-audit": "scripts/audit-media-delivery.mjs" },
    author: {
      email: "hello@vcode.sh",
      name: "Vibe Code",
      url: "https://x.com/vcode_sh",
    },
    bugs: { url: "https://github.com/vcode-sh/vibe-player/issues" },
    exports: {
      ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      "./styles.css": "./dist/styles.css",
    },
    funding: {
      type: "github",
      url: "https://github.com/sponsors/vcode-sh",
    },
    homepage: "https://github.com/vcode-sh/vibe-player#readme",
    license: "Apache-2.0",
    module: "./dist/index.js",
    name: "vibe-player",
    packageManager: "bun@1.3.14",
    publishConfig: { access: "public", provenance: true },
    repository: {
      type: "git",
      url: "git+https://github.com/vcode-sh/vibe-player.git",
    },
    sideEffects: ["./dist/styles.css"],
    type: "module",
    types: "./dist/index.d.ts",
    ...patch,
  };
}

function createChangesetConfig(patch = {}) {
  return { access: "public", commit: false, ...patch };
}

function createPackageFiles(patch = {}) {
  return { mediaAuditBinSource: "#!/usr/bin/env node\n", ...patch };
}

describe("release state rules", () => {
  it("accepts the current public ESM package stance", () => {
    expect(
      collectReleaseStateIssues(
        createManifest(),
        createChangesetConfig(),
        createPackageFiles()
      )
    ).toEqual([]);
  });

  it("flags accidental release and consumer-contract drift", () => {
    const issues = collectReleaseStateIssues(
      createManifest({
        bin: { "vibe-player-media-audit": "./scripts/missing.mjs" },
        author: {
          email: "wrong@example.com",
          name: "Other",
          url: "https://example.com",
        },
        bugs: { url: "https://github.com/vcode-sh/other/issues" },
        exports: {
          ".": { import: "./src/index.ts", types: "./src/index.ts" },
          "./styles.css": "./src/styles/vibe-player.css",
        },
        funding: { type: "github", url: "https://github.com/other" },
        homepage: "https://github.com/vcode-sh/other#readme",
        license: "MIT",
        packageManager: "npm@11.0.0",
        private: true,
        publishConfig: { access: "restricted", provenance: false },
        repository: {
          type: "git",
          url: "https://github.com/vcode-sh/other.git",
        },
        sideEffects: [],
        type: "commonjs",
      }),
      createChangesetConfig({ access: "restricted", commit: true }),
      createPackageFiles({ mediaAuditBinSource: "#!/usr/bin/env bun\n" })
    );

    expect(issues).toContain(
      "package manifest must not set private for public release."
    );
    expect(issues).toContain(
      'license must stay "Apache-2.0" for public release.'
    );
    expect(issues).toContain("author.name must identify Vibe Code.");
    expect(issues).toContain("author.email must point to hello@vcode.sh.");
    expect(issues).toContain("author.url must point to the Vibe Code profile.");
    expect(issues).toContain(
      'exports["./styles.css"] must point to "./dist/styles.css".'
    );
    expect(issues).toContain(
      "repository.url must match the package GitHub repository."
    );
    expect(issues).toContain(
      "bugs.url must point to the package issue tracker."
    );
    expect(issues).toContain("homepage must point to the package README.");
    expect(issues).toContain('sideEffects must include "./dist/styles.css".');
    expect(issues).toContain(
      "publishConfig.provenance must stay true for public release."
    );
    expect(issues).toContain('publishConfig.access must stay "public".');
    expect(issues).toContain(
      "funding.url must point to the Vibe Code sponsor profile."
    );
    expect(issues).toContain(
      "media audit bin must point to the packaged CLI entrypoint."
    );
    expect(issues).toContain(
      "media audit bin must use a Node shebang for npm publishing."
    );
    expect(issues).toContain('Changesets access must stay "public".');
  });
});
