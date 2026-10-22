import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  createHlsAdapter,
  createYouTubeAdapter,
  useVibePlayer,
  VibePlayerInline,
  VibePlayerModal,
  VibePlayerStage,
} from "vibe-player";

assert.equal(
  typeof globalThis.document,
  "undefined",
  "SSR must run without DOM globals."
);
const packageDirectory = resolve("node_modules/vibe-player");
assert.equal((await lstat(packageDirectory)).isSymbolicLink(), false);
const packageJsonPath = fileURLToPath(
  import.meta.resolve("vibe-player/package.json")
);
assert.equal(
  await realpath(dirname(packageJsonPath)),
  await realpath(packageDirectory)
);
const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
const source = {
  id: "ssr",
  sources: [{ mimeType: "video/mp4", url: "/movie.mp4" }],
  title: "SSR film",
  type: "file",
};

for (const Component of [VibePlayerStage, VibePlayerInline]) {
  const html = renderToString(createElement(Component, { source }));
  assert.match(html, /vibe-player-stage/);
  assert.match(html, /SSR film/);
}
const modal = renderToString(
  createElement(VibePlayerModal, { open: true, source })
);
assert.match(modal, /<dialog\b[^>]*aria-label="SSR film video player"/);
function HeadlessPlayer() {
  const { state } = useVibePlayer({ source });
  return createElement("output", null, state.snapshot.readyState);
}
assert.equal(
  renderToString(createElement(HeadlessPlayer)),
  "<output>idle</output>"
);
assert.equal(typeof createHlsAdapter, "function");
assert.equal(typeof createYouTubeAdapter, "function");
const cssPath = fileURLToPath(import.meta.resolve("vibe-player/styles.css"));
assert.equal(dirname(cssPath), resolve(packageDirectory, "dist"));
assert.match(await readFile(cssPath, "utf8"), /\.vibe-player-stage/);
const cli = spawnSync(
  process.execPath,
  [
    resolve(packageDirectory, manifest.bin["vibe-player-media-audit"]),
    "--help",
  ],
  { encoding: "utf8", timeout: 15_000 }
);
assert.equal(cli.status, 0, cli.stderr);
assert.match(cli.stdout, /Usage: vibe-player-media-audit/);
console.log(
  "Packed consumer runtime passed: isolated install, ESM, SSR, CSS and CLI."
);
