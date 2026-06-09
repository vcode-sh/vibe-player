import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const lineBreakPattern = /\r\n|\r|\n/;
const localImportPattern = /^@import\s+"\.\/([^"]+)";$/;
const stylesDir = resolve(import.meta.dirname, "../src/styles");
const inputPath = resolve(stylesDir, "vibe-player.css");
const outputPath = resolve(import.meta.dirname, "../dist/styles.css");

function collectStyleParts(source) {
  const importTargets = [];
  const entryLines = [];
  const lines = source.split(lineBreakPattern);

  for (const line of lines) {
    const match = line.match(localImportPattern);
    const target = match?.[1];
    if (target) {
      importTargets.push(target);
    } else {
      entryLines.push(line);
    }
  }

  return {
    entrySource: entryLines.join("\n").trim(),
    importTargets,
  };
}

async function readStyleBlock(target) {
  const source = await readFile(resolve(stylesDir, target), "utf8");
  return `/* ${target} */\n${source.trim()}`;
}

const entrySource = await readFile(inputPath, "utf8");
const parts = collectStyleParts(entrySource);
const blocks = [];

for (const target of parts.importTargets) {
  blocks.push(await readStyleBlock(target));
}

blocks.push(`/* vibe-player.css */\n${parts.entrySource}`);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${blocks.join("\n\n")}\n`);

console.log(`Built ${outputPath}`);
