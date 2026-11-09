const LINE_BREAK = /\r?\n/;
const TRAILING_COMMENT = /\s+#.*$/;
const BLOCK_SCALAR = /^[|>][+-]?$/;
const KEY_LINE = /^([\w-]+):\s*(.*)$/;
const LIST_ITEM = "- ";

export function indentOf(line) {
  return line.length - line.trimStart().length;
}

export function toCodeLines(workflowSource) {
  return workflowSource
    .split(LINE_BREAK)
    .map((line) => line.replace(TRAILING_COMMENT, "").trimEnd())
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"));
}

function splitStepBlocks(lines) {
  const stepsAt = lines.findIndex((line) => line.trim() === "steps:");
  const blocks = [];
  let stepIndent = -1;
  for (const line of stepsAt === -1 ? [] : lines.slice(stepsAt + 1)) {
    const indent = indentOf(line);
    const trimmed = line.trim();
    if (stepIndent === -1 && trimmed.startsWith(LIST_ITEM)) {
      stepIndent = indent;
    }
    if (stepIndent === -1 || indent < stepIndent) {
      break;
    }
    if (indent === stepIndent && trimmed.startsWith(LIST_ITEM)) {
      const firstKey = trimmed.slice(LIST_ITEM.length);
      blocks.push([`${" ".repeat(indent + LIST_ITEM.length)}${firstKey}`]);
    } else {
      blocks.at(-1)?.push(line);
    }
  }
  return blocks;
}

/**
 * Groups lines by the keys at the first line's indentation; each key maps to
 * its inline value followed by its trimmed continuation lines.
 * @param {string[]} blockLines Comment-free lines of one mapping.
 * @returns {Map<string, string[]>}
 */
export function readKeyedFields(blockLines) {
  const keyIndent = indentOf(blockLines[0]);
  const fields = new Map();
  let currentKey = null;
  for (const line of blockLines) {
    const match = indentOf(line) === keyIndent && KEY_LINE.exec(line.trim());
    if (match) {
      const [, key, value] = match;
      currentKey = key;
      fields.set(key, [value]);
    } else if (currentKey !== null) {
      fields.get(currentKey).push(line.trim());
    }
  }
  return fields;
}

/**
 * Reads `key: value` continuation lines of a nested mapping such as `with:`.
 * @param {string[] | undefined} values A field from {@link readKeyedFields}.
 * @returns {Map<string, string>}
 */
export function readNestedMapping(values) {
  const mapping = new Map();
  for (const line of values?.slice(1) ?? []) {
    const match = KEY_LINE.exec(line);
    if (match) {
      mapping.set(match[1], match[2]);
    }
  }
  return mapping;
}

function toStep(fields) {
  const [head = "", ...body] = fields.get("run") ?? [];
  const commands = BLOCK_SCALAR.test(head) ? body : [head];
  return {
    commands: commands.filter((command) => command.length > 0),
    condition: fields.get("if")?.[0],
    continueOnError: fields.get("continue-on-error")?.[0],
    settings: readNestedMapping(fields.get("with")),
    uses: fields.get("uses")?.[0],
  };
}

/**
 * Reads the first job's steps from workflow YAML text without a YAML
 * dependency. Supports `- name:` and `- run:` step openings, trailing
 * comments and `run: |` block scalars, which is what release.yml uses.
 * Pass one job's text (see `readWorkflowJobs`) to read that job's steps.
 * @param {string} workflowSource Raw workflow text.
 * @returns {{commands: string[], condition?: string, continueOnError?: string,
 *   settings: Map<string, string>, uses?: string}[]}
 */
export function readWorkflowSteps(workflowSource) {
  return splitStepBlocks(toCodeLines(workflowSource))
    .map(readKeyedFields)
    .map(toStep);
}

/**
 * Finds the first step that runs a command, alone or with extra arguments.
 * @param {{commands: string[]}[]} steps Steps from {@link readWorkflowSteps}.
 * @param {string} command Command prefix to look for.
 * @returns {number} The step index, or -1 when no step runs it.
 */
export function findWorkflowStep(steps, command) {
  return steps.findIndex((step) =>
    step.commands.some(
      (line) => line === command || line.startsWith(`${command} `)
    )
  );
}
