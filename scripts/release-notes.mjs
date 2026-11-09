import { unwrapMarkdownLines } from "./release-notes-unwrap.mjs";

const LINE_BREAK = /\r?\n/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimBlankLines(lines) {
  const first = lines.findIndex((line) => line.trim().length > 0);
  if (first === -1) {
    return [];
  }
  const last = lines.findLastIndex((line) => line.trim().length > 0);
  return lines.slice(first, last + 1);
}

/**
 * Extracts the body of a released version's CHANGELOG section, the text
 * between `## [<version>] - <YYYY-MM-DD>` and the next `## ` heading, with
 * hard-wrapped paragraphs and list items joined into single lines.
 * @param {string} changelog CHANGELOG.md text.
 * @param {string} version Exact package version, without a leading "v".
 * @returns {{notes: string} | {issue: string}} The notes, or why there are none.
 */
export function extractReleaseNotes(changelog, version) {
  if (!VERSION_PATTERN.test(version)) {
    return { issue: `"${version}" is not a semantic version.` };
  }
  const heading = new RegExp(
    `^## \\[${escapeRegExp(version)}\\] - ${ISO_DATE}\\s*$`
  );
  const lines = changelog.split(LINE_BREAK);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) {
    return {
      issue: `CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section.`,
    };
  }
  const next = lines.findIndex(
    (line, index) => index > start && line.startsWith("## ")
  );
  const body = trimBlankLines(
    lines.slice(start + 1, next === -1 ? lines.length : next)
  );
  if (body.length === 0) {
    return { issue: `CHANGELOG.md section for ${version} is empty.` };
  }
  return { notes: `${unwrapMarkdownLines(body).join("\n")}\n` };
}
