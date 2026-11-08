import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Features, transform } from "lightningcss";

const lineBreakPattern = /\r\n|\r|\n/;
const localImportPattern = /^@import\s+"\.\/([^"]+)";$/;
const stylesDir = resolve(import.meta.dirname, "../src/styles");
const distDir = resolve(import.meta.dirname, "../dist");
/**
 * Minify only. Targets the oldest engine the package supports (iOS 17.1+) so
 * Safari keeps the `-webkit-backdrop-filter` it needs; every other lowering
 * (`light-dark()`, selectors, colors) stays off. Class names and custom
 * properties are never renamed; `src/styles` stays the readable source.
 */
/** lightningcss encodes a browser version as `major << 16`. */
const safari17 = 17 * 2 ** 16;
const minifyTargets = { ios_saf: safari17, safari: safari17 };
/** Every single-feature lowering flag except vendor prefixes. */
const skippedLowerings = Object.entries(Features)
  .filter(
    ([name, flag]) =>
      name !== "VendorPrefixes" && Number.isInteger(Math.log2(flag))
  )
  .reduce((mask, [, flag]) => mask + flag, 0);
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
  const { code } = transform({
    code: Buffer.from(blocks.join("\n\n")),
    exclude: skippedLowerings,
    filename: output,
    minify: true,
    targets: minifyTargets,
  });
  await writeFile(outputPath, code);
  console.log(`Built ${outputPath}`);
}

await Promise.all(stylesheets.map(buildStylesheet));
