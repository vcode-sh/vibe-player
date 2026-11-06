import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const lineBreakPattern = /\r\n|\r|\n/;
const localImportPattern = /^@import\s+"\.\/([^"]+)";$/;
const stylesDir = resolve(import.meta.dirname, "../src/styles");
const distDir = resolve(import.meta.dirname, "../dist");
/** Each public stylesheet is one flattened file; skins opt in separately. */
const stylesheets = [
  { input: "vibe-player.css", output: "styles.css" },
  { input: "vibe-player-chips-entry.css", output: "chips.css" },
];

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

async function buildStylesheet({ input, output }) {
  const entrySource = await readFile(resolve(stylesDir, input), "utf8");
  const parts = collectStyleParts(entrySource);
  const blocks = await Promise.all(parts.importTargets.map(readStyleBlock));
  if (parts.entrySource) {
    blocks.push(`/* ${input} */\n${parts.entrySource}`);
  }
  const outputPath = resolve(distDir, output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${blocks.join("\n\n")}\n`);
  console.log(`Built ${outputPath}`);
}

await Promise.all(stylesheets.map(buildStylesheet));
