const LINE_BREAK = /\r\n|\r|\n/;
const BLOCK_COMMENT_START = "/*";
const BLOCK_COMMENT_END = "*/";
const LINE_COMMENT_START = "//";
const MODULE_PLUMBING =
  /^(?:import\b|export\s*(?:type\s*)?[{*]|(?:"[^"]*"|'[^']*');?$)/;
const DECLARATION_NAME =
  /^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:interface|type|function|class|const|let|var|namespace|module)\s+([\w$]+)/;

/**
 * Drops whole-line comments from printed declaration text. Declaration
 * emitters place TSDoc on its own lines, so documentation edits do not change
 * the report while every type token stays in place.
 * @param {string} text Declaration source text.
 * @returns {string} The text without comment lines or trailing whitespace.
 */
export function stripDeclarationComments(text) {
  const kept = [];
  let inBlock = false;
  for (const line of text.split(LINE_BREAK)) {
    const { code, open } = splitCommentLine(line, inBlock);
    inBlock = open;
    const trimmed = code.trim();
    if (trimmed.length > 0 && !trimmed.startsWith(LINE_COMMENT_START)) {
      kept.push(code.trimEnd());
    }
  }
  return kept.join("\n");
}

function splitCommentLine(line, inBlock) {
  const indent = line.slice(0, line.length - line.trimStart().length);
  const trimmed = line.trimStart();
  if (!(inBlock || trimmed.startsWith(BLOCK_COMMENT_START))) {
    return { code: line, open: false };
  }
  const searchFrom = inBlock ? 0 : BLOCK_COMMENT_START.length;
  const end = trimmed.indexOf(BLOCK_COMMENT_END, searchFrom);
  if (end === -1) {
    return { code: "", open: true };
  }
  const rest = trimmed.slice(end + BLOCK_COMMENT_END.length).trimStart();
  return { code: rest.length > 0 ? `${indent}${rest}` : "", open: false };
}

/**
 * Names a top-level declaration statement, or returns undefined for import
 * and export plumbing or a directive such as `"use client"`.
 * @param {string} text Comment-free statement text.
 * @returns {string | undefined}
 */
export function readDeclarationName(text) {
  if (MODULE_PLUMBING.test(text)) {
    return;
  }
  const match = DECLARATION_NAME.exec(text);
  if (!match) {
    throw new Error(`Unrecognized declaration statement: ${text.slice(0, 80)}`);
  }
  return match[1];
}

function compareText(left, right) {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

function formatEntryLine({ kind, localName, name }) {
  const alias =
    localName && localName !== name ? ` (declared as ${localName})` : "";
  return `${kind} ${name}${alias}`;
}

function formatEntry({ exports, specifier }) {
  const lines = [...exports]
    .sort((left, right) => compareText(left.name, right.name))
    .map(formatEntryLine);
  return [`### ${specifier}`, "", "```text", ...lines, "```"].join("\n");
}

function formatDeclarations(title, declarations) {
  const blocks = [...declarations]
    .sort((left, right) => compareText(left.name, right.name))
    .map(({ texts }) => texts.join("\n"));
  const body =
    blocks.length > 0 ? ["```ts", blocks.join("\n\n"), "```"] : ["None."];
  return [`## ${title}`, "", ...body].join("\n");
}

/**
 * Renders the committed API report. Entries and declarations are sorted by
 * name so the output depends only on the declared API, not on emit order.
 * @param {{
 *   entries: {specifier: string, exports: {kind: string, name: string, localName?: string}[]}[],
 *   declarations: {name: string, public: boolean, texts: string[]}[]
 * }} report
 * @returns {string}
 */
export function formatApiReport({ declarations, entries }) {
  const sortedEntries = [...entries].sort((left, right) =>
    compareText(left.specifier, right.specifier)
  );
  return `${[
    "# vibe-player API report",
    "",
    "Generated from the built declarations by `bun run package:api:update`.",
    "Do not edit by hand. Review every change before a release.",
    "",
    "## Entry points",
    "",
    ...sortedEntries.map(formatEntry).flatMap((entry) => [entry, ""]),
    formatDeclarations(
      "Public declarations",
      declarations.filter((declaration) => declaration.public)
    ),
    "",
    formatDeclarations(
      "Unexported declarations referenced by the public API",
      declarations.filter((declaration) => !declaration.public)
    ),
  ].join("\n")}\n`;
}

/**
 * Locates the first differing line between the committed and generated report.
 * @param {string} expected Committed report text.
 * @param {string} actual Generated report text.
 * @returns {{line: number, expected: string, actual: string} | undefined}
 */
export function findFirstReportDifference(expected, actual) {
  const expectedLines = expected.split(LINE_BREAK);
  const actualLines = actual.split(LINE_BREAK);
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      return {
        actual: actualLines[index] ?? "<end of report>",
        expected: expectedLines[index] ?? "<end of report>",
        line: index + 1,
      };
    }
  }
}
