import { describe, expect, it } from "vitest";
import { collectReleaseStateIssues } from "./release-state-rules.mjs";

function createManifest(patch = {}) {
  return {
    author: {
      email: "hello@vcode.sh",
      name: "Vibe Code",
      url: "https://x.com/vcode_sh",
    },
    bin: { "vibe-player-media-audit": "scripts/audit-media-delivery.mjs" },
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
    packageManager: "bun@1.4.3",
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

  it.each([
    [
      "package identity",
      { name: "other" },
      'package name must remain "vibe-player".',
    ],
    [
      "private marker",
      { private: false },
      "package manifest must not set private for public release.",
    ],
    [
      "license",
      { license: "MIT" },
      'license must stay "Apache-2.0" for public release.',
    ],
    [
      "author name",
      { author: { ...createManifest().author, name: "Other" } },
      "author.name must identify Vibe Code.",
    ],
    [
      "author email",
      { author: { ...createManifest().author, email: "wrong@example.com" } },
      "author.email must point to hello@vcode.sh.",
    ],
    [
      "author URL",
      { author: { ...createManifest().author, url: "https://example.com" } },
      "author.url must point to the Vibe Code profile.",
    ],
    [
      "repository URL",
      { repository: { type: "git", url: "https://example.com" } },
      "repository.url must match the package GitHub repository.",
    ],
    [
      "issue tracker",
      { bugs: { url: "https://example.com" } },
      "bugs.url must point to the package issue tracker.",
    ],
    [
      "homepage",
      { homepage: "https://example.com" },
      "homepage must point to the package README.",
    ],
    [
      "funding",
      { funding: { url: "https://example.com" } },
      "funding.url must point to the Vibe Code sponsor profile.",
    ],
    [
      "ESM type",
      { type: "commonjs" },
      'package type must stay "module" for the ESM-only package.',
    ],
    [
      "runtime entry",
      { module: "./src/index.ts" },
      'module must point to "./dist/index.js".',
    ],
    [
      "type entry",
      { types: "./src/index.ts" },
      'types must point to "./dist/index.d.ts".',
    ],
    [
      "stylesheet side effects",
      { sideEffects: [] },
      'sideEffects must include "./dist/styles.css".',
    ],
    [
      "public access",
      { publishConfig: { access: "restricted", provenance: true } },
      'publishConfig.access must stay "public".',
    ],
    [
      "provenance",
      { publishConfig: { access: "public", provenance: false } },
      "publishConfig.provenance must stay true for public release.",
    ],
    [
      "CLI entry",
      { bin: { "vibe-player-media-audit": "scripts/missing.mjs" } },
      "media audit bin must point to the packaged CLI entrypoint.",
    ],
    [
      "exact package manager",
      { packageManager: "bun@^1.4.3" },
      "packageManager must pin an exact Bun version.",
    ],
  ])(
    "rejects isolated %s drift without unrelated diagnostics",
    (_rule, patch, issue) => {
      expect(
        collectReleaseStateIssues(
          createManifest(patch),
          createChangesetConfig(),
          createPackageFiles()
        )
      ).toEqual([issue]);
    }
  );

  it.each([
    [
      "runtime",
      { import: "./src/index.ts", types: "./dist/index.d.ts" },
      'exports["."].import must point to "./dist/index.js".',
    ],
    [
      "types",
      { import: "./dist/index.js", types: "./src/index.ts" },
      'exports["."].types must point to "./dist/index.d.ts".',
    ],
  ])("rejects a source-only %s export", (_rule, root, issue) => {
    expect(
      collectReleaseStateIssues(
        createManifest({
          exports: { ".": root, "./styles.css": "./dist/styles.css" },
        }),
        createChangesetConfig(),
        createPackageFiles()
      )
    ).toEqual([issue]);
  });

  it("rejects a source-only stylesheet export", () => {
    expect(
      collectReleaseStateIssues(
        createManifest({
          exports: {
            ...createManifest().exports,
            "./styles.css": "./src/styles/vibe-player.css",
          },
        }),
        createChangesetConfig(),
        createPackageFiles()
      )
    ).toEqual(['exports["./styles.css"] must point to "./dist/styles.css".']);
  });

  it("rejects a CLI that requires Bun in npm consumers", () => {
    expect(
      collectReleaseStateIssues(
        createManifest(),
        createChangesetConfig(),
        createPackageFiles({ mediaAuditBinSource: "#!/usr/bin/env bun\n" })
      )
    ).toEqual(["media audit bin must use a Node shebang for npm publishing."]);
  });

  it("rejects restricted Changesets publishing independently of npm access", () => {
    expect(
      collectReleaseStateIssues(
        createManifest(),
        createChangesetConfig({ access: "restricted" }),
        createPackageFiles()
      )
    ).toEqual(['Changesets access must stay "public".']);
  });
});
