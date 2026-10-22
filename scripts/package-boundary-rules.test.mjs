import { describe, expect, it } from "vitest";
import { collectPackageBoundaryIssues } from "./package-boundary-rules.mjs";

function files(entries) {
  return Object.entries(entries).map(([path, source]) => ({ path, source }));
}

describe("package dependency boundaries", () => {
  it("rejects core dependencies on UI, adapters and provider SDKs", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/adapters/hls/index.ts": "export interface Bridge {}",
        "src/core/controller.ts":
          'import type { View } from "../ui";\n' +
          'export type Bridge = import("../adapters/hls").Bridge;\n' +
          'async function load() { return import("hls.js"); }',
        "src/ui/index.ts": "export interface View {}",
      })
    );

    expect(issues).toEqual([
      {
        path: "src/core/controller.ts",
        reason: "core cannot depend on ui",
        specifier: "../ui",
      },
      {
        path: "src/core/controller.ts",
        reason: "core cannot depend on adapters",
        specifier: "../adapters/hls",
      },
      {
        path: "src/core/controller.ts",
        reason: "core cannot import external package hls.js",
        specifier: "hls.js",
      },
    ]);
  });

  it("allows adapter composition and shared package owners", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/adapters/create-vibe-player-adapter.ts":
          'export { createHlsAdapter } from "./hls";',
        "src/adapters/hls/adapter.ts":
          'import { play } from "../native/playback"; export const createHlsAdapter = play;',
        "src/adapters/hls/index.ts":
          'export { createHlsAdapter } from "./adapter";',
        "src/adapters/index.ts": 'export { createHlsAdapter } from "./hls";',
        "src/adapters/native/playback.ts":
          'import type { State } from "../../core/state"; export const play = () => {};',
        "src/core/state.ts": "export interface State {}",
        "src/react/player.ts":
          'import { createHlsAdapter } from "../adapters"; import type { State } from "../core/state";',
        "src/ui/player.tsx": 'import "react"; import "../react/player";',
      })
    );

    expect(issues).toEqual([]);
  });

  it("prevents sibling-provider and external deep-import bypasses", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/adapters/file/adapter.ts":
          'export type { Runtime } from "../hls/runtime";',
        "src/adapters/hls/runtime.ts": "export interface Runtime {}",
        "src/ui/player.ts":
          'import type { Runtime } from "../adapters/hls/runtime";',
      })
    );

    expect(issues).toEqual([
      {
        path: "src/adapters/file/adapter.ts",
        reason: "file adapter cannot depend on hls",
        specifier: "../hls/runtime",
      },
      {
        path: "src/ui/player.ts",
        reason: "use the adapters public entrypoint",
        specifier: "../adapters/hls/runtime",
      },
    ]);
  });

  it("ignores dependency-looking text while checking real type and side-effect imports", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/core/controller.ts":
          '// import "next/navigation";\n' +
          'const example = "import from ~/private";\n' +
          'import "next/cache";\nimport type { Session } from "@/session";',
      })
    );

    expect(issues).toEqual([
      {
        path: "src/core/controller.ts",
        reason: "Next.js import",
        specifier: "next/cache",
      },
      {
        path: "src/core/controller.ts",
        reason: "app import alias",
        specifier: "@/session",
      },
    ]);
  });

  it("preserves the app-runtime literal ban without matching comments", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/core/controller.ts":
          "// apps/web belongs outside this package.\n" +
          'const runtimePath = "apps/web/private";',
      })
    );

    expect(issues).toEqual([
      {
        path: "src/core/controller.ts",
        reason: "product app runtime literal",
        specifier: "apps/web/private",
      },
    ]);
  });

  it("allows tests to exercise provider internals without exempting production", async () => {
    const issues = await collectPackageBoundaryIssues(
      files({
        "src/adapters/hls/private.ts": "export const create = () => {};",
        "src/core/adapter-test-helpers.ts":
          'import { create } from "../adapters/hls/private";',
        "src/core/adapter.test.ts":
          'import { create } from "../adapters/hls/private";',
        "src/core/controller.ts":
          'import { create } from "../adapters/hls/private";',
      })
    );

    expect(issues).toEqual([
      {
        path: "src/core/controller.ts",
        reason: "core cannot depend on adapters",
        specifier: "../adapters/hls/private",
      },
    ]);
  });
});
