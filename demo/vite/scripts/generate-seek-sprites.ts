// Regenerates the demo seek thumbnail sprite sheets from their remote media.
// Usage: bun demo/vite/scripts/generate-seek-sprites.ts
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type DemoSeekSprite,
  demoSeekSprites,
  getSeekSpriteFrameCount,
} from "../src/demo-seek-sprites";

const publicRoot = resolve(import.meta.dirname, "../public");

function generateSprite(sprite: DemoSeekSprite) {
  const { columns, frameHeight, frameWidth, input, interval, url } = sprite;
  const rows = Math.ceil(getSeekSpriteFrameCount(sprite) / columns);
  const output = resolve(publicRoot, `.${url}`);
  mkdirSync(dirname(output), { recursive: true });
  // Seeking half an interval in makes every frame the midpoint of its range.
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(interval / 2),
    "-i",
    input,
    "-an",
    "-vf",
    `fps=1/${interval},scale=${frameWidth}:${frameHeight},tile=${columns}x${rows}`,
    "-frames:v",
    "1",
    "-q:v",
    "5",
    output,
  ]);
  console.log(`Wrote ${output}`);
}

for (const sprite of demoSeekSprites) {
  generateSprite(sprite);
}
