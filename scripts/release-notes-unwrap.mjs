const FENCE = /^\s*(?:```|~~~)/;
/** Lines that start their own block: headings, list items, quotes, tables. */
const BLOCK_START = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/;
/** Lines nothing may be joined onto. */
const STANDALONE = /^\s*(?:#{1,6}\s|\|)/;

/**
 * Joins the hard-wrapped continuation lines of paragraphs and list items,
 * which GitHub release notes would render as line breaks. Headings, list
 * structure (including nesting), quotes, tables, blank lines and fenced code
 * blocks are kept as they are.
 * @param {string[]} lines Markdown lines.
 * @returns {string[]}
 */
export function unwrapMarkdownLines(lines) {
  const output = [];
  let inFence = false;
  let joinable = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      output.push(line);
      joinable = false;
    } else if (inFence || line.trim().length === 0) {
      output.push(line);
      joinable = false;
    } else if (joinable && !BLOCK_START.test(line)) {
      output[output.length - 1] += ` ${line.trim()}`;
    } else {
      output.push(line);
      joinable = !STANDALONE.test(line);
    }
  }
  return output;
}
