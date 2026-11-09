const LINE_BREAK = /\r?\n/;
const DIRECTIVE_LINE = /^\s*["']use client["'];?\s*$/;
// One whole import/export statement per line; a minified line that merely
// starts with an import and continues with code is not excluded.
const MODULE_LINE = /^(?:import|export)\b[^;]*;?$/;
const CHUNK_PATH = /^chunks\/(.+?)\.(?:js|d\.ts)$/;

/** Longest code line a readable file may contain (import/export lists excluded). */
export const maxCodeLineLength = 1000;
/** Average code line length above which a file counts as minified. */
export const maxAverageCodeLineLength = 120;
/** Code size below which the average is too noisy to judge. */
const minAverageSampleLength = 200;

/**
 * Reads the code-splitting group names from the tsdown config, so the chunk
 * name audit follows a renamed group instead of a hardcoded copy.
 * @param {object | object[]} config The default export of tsdown.config.ts.
 * @returns {string[]}
 */
export function readCodeSplittingGroupNames(config) {
  const configs = Array.isArray(config) ? config : [config];
  return configs.flatMap((entry) => {
    const groups = entry?.outputOptions?.codeSplitting?.groups ?? [];
    return groups.flatMap((group) =>
      typeof group?.name === "string" ? [group.name] : []
    );
  });
}

/**
 * Chunk files must be named after the source module or code-splitting group
 * they come from, so names stay stable across builds and carry no hash.
 * @param {string[]} paths Built file paths relative to `dist`.
 * @param {Set<string>} knownNames Source module basenames and group names.
 * @returns {string[]}
 */
export function collectChunkNameIssues(paths, knownNames) {
  return paths.flatMap((path) => {
    const name = CHUNK_PATH.exec(path)?.[1];
    if (name === undefined || knownNames.has(name)) {
      return [];
    }
    return [
      `${path}: chunk name "${name}" matches no source module or code-splitting group (hashed or unstable name).`,
    ];
  });
}

/**
 * Every built JS file starts with exactly one `"use client"` directive.
 * @param {string} path Built file path relative to `dist`.
 * @param {string} source File text.
 * @returns {string[]}
 */
export function collectDirectiveIssues(path, source) {
  const lines = source.split(LINE_BREAK);
  const count = lines.filter((line) => DIRECTIVE_LINE.test(line)).length;
  if (count === 1 && DIRECTIVE_LINE.test(lines[0] ?? "")) {
    return [];
  }
  return [
    `${path}: expected exactly one "use client" directive on the first line, found ${count}.`,
  ];
}

/**
 * Flags minified output: one very long code line, or code whose average line
 * is far longer than formatted JavaScript. Import and export lists are
 * excluded because re-export entries legitimately keep them on one line.
 * @param {string} path Built file path relative to `dist`.
 * @param {string} source File text.
 * @returns {string[]}
 */
export function collectMinifiedIssues(path, source) {
  const code = source
    .split(LINE_BREAK)
    .filter((line) => line.trim().length > 0 && !MODULE_LINE.test(line));
  const longest = Math.max(0, ...code.map((line) => line.length));
  const total = code.reduce((sum, line) => sum + line.length, 0);
  const average = code.length === 0 ? 0 : total / code.length;
  if (longest > maxCodeLineLength) {
    return [
      `${path}: looks minified (a ${longest}-character line; limit ${maxCodeLineLength}).`,
    ];
  }
  if (total >= minAverageSampleLength && average > maxAverageCodeLineLength) {
    return [
      `${path}: looks minified (average line ${Math.round(average)} characters; limit ${maxAverageCodeLineLength}).`,
    ];
  }
  return [];
}

/**
 * Audits the readable build contract for the files in `dist`.
 * @param {{path: string, source: string}[]} files Built files relative to `dist`.
 * @param {Set<string>} knownChunkNames Source module basenames and group names.
 * @returns {string[]}
 */
export function collectReadableBuildIssues(files, knownChunkNames) {
  const scripts = files.filter((file) => file.path.endsWith(".js"));
  return [
    ...collectChunkNameIssues(
      files.map((file) => file.path),
      knownChunkNames
    ),
    ...scripts.flatMap((file) =>
      collectDirectiveIssues(file.path, file.source)
    ),
    ...scripts.flatMap((file) => collectMinifiedIssues(file.path, file.source)),
  ];
}
