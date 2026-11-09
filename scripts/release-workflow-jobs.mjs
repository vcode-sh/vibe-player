import {
  findWorkflowStep,
  indentOf,
  readKeyedFields,
  readNestedMapping,
  readWorkflowSteps,
  toCodeLines,
} from "./release-workflow-steps.mjs";

const SCALAR_PERMISSIONS = new Map([
  ["read-all", "read"],
  ["write-all", "write"],
  ["{}", "none"],
]);
const LIST_ITEM = "- ";
const TRAILING_COLON = /:$/;
const FLOW_BRACKETS = /^\[|\]$/g;

/**
 * Parses a `permissions:` field: a scalar (`read-all`, `write-all`, `{}`) or
 * a mapping of scopes. Undefined when the field is absent.
 * @param {string[] | undefined} values A field from `readKeyedFields`.
 * @returns {{all?: string, scopes: Map<string, string>} | undefined}
 */
function readPermissions(values) {
  if (values === undefined) {
    return;
  }
  const all = SCALAR_PERMISSIONS.get(values[0]);
  if (values[0].length > 0 && all === undefined) {
    return { all: values[0], scopes: new Map() };
  }
  return { all, scopes: readNestedMapping(values) };
}

function readNeeds(values) {
  if (values === undefined) {
    return [];
  }
  const inline = values[0].replace(FLOW_BRACKETS, "");
  const listed = values
    .slice(1)
    .filter((line) => line.startsWith(LIST_ITEM))
    .map((line) => line.slice(LIST_ITEM.length));
  return [...inline.split(","), ...listed]
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function splitJobBlocks(lines) {
  const jobsAt = lines.indexOf("jobs:");
  const blocks = [];
  let jobIndent = -1;
  for (const line of jobsAt === -1 ? [] : lines.slice(jobsAt + 1)) {
    const indent = indentOf(line);
    if (indent === 0) {
      break;
    }
    if (jobIndent === -1) {
      jobIndent = indent;
    }
    if (indent === jobIndent) {
      blocks.push({ lines: [], name: line.trim().replace(TRAILING_COLON, "") });
    } else {
      blocks.at(-1)?.lines.push(line);
    }
  }
  return blocks;
}

/**
 * Reads the top-level `permissions:` of a workflow.
 * @param {string} workflowSource Raw workflow text.
 */
export function readTopLevelPermissions(workflowSource) {
  const lines = toCodeLines(workflowSource);
  const start = lines.findIndex((line) => line.startsWith("permissions:"));
  if (start === -1) {
    return;
  }
  const end = lines.findIndex(
    (line, index) => index > start && indentOf(line) === 0
  );
  const block = lines.slice(start, end === -1 ? lines.length : end);
  return readPermissions(readKeyedFields(block).get("permissions"));
}

/**
 * Reads each job of a workflow: its keys, its steps and the permissions it
 * actually runs with (job-level permissions replace the workflow's).
 * @param {string} workflowSource Raw workflow text.
 */
export function readWorkflowJobs(workflowSource) {
  const topLevel = readTopLevelPermissions(workflowSource);
  return splitJobBlocks(toCodeLines(workflowSource)).map(({ lines, name }) => {
    const fields = lines.length > 0 ? readKeyedFields(lines) : new Map();
    const permissions = readPermissions(fields.get("permissions"));
    return {
      condition: fields.get("if")?.[0],
      name,
      needs: readNeeds(fields.get("needs")),
      permissions: permissions ?? topLevel,
      steps: readWorkflowSteps(lines.join("\n")),
    };
  });
}

/**
 * The access level a job's permissions grant to one scope. Without a
 * permissions block the repository default applies, which can be write.
 * @param {{all?: string, scopes: Map<string, string>} | undefined} permissions
 * @param {string} scope For example `contents` or `id-token`.
 * @returns {string} `none`, `read`, `write` or `default`.
 */
export function readPermissionLevel(permissions, scope) {
  if (permissions === undefined) {
    return "default";
  }
  return permissions.scopes.get(scope) ?? permissions.all ?? "none";
}

/**
 * Finds the job whose steps run a command.
 * @param {ReturnType<typeof readWorkflowJobs>} jobs
 * @param {string} command Command prefix to look for.
 */
export function findJobRunning(jobs, command) {
  return jobs.find((job) => findWorkflowStep(job.steps, command) !== -1);
}

/**
 * Issues for a guarded step that could be skipped or whose failure is ignored.
 * @param {string} command The guarded command, for the message.
 * @param {{condition?: string, continueOnError?: string}} step
 */
export function collectStepBypassIssues(command, step) {
  const issues = [];
  if (step.condition !== undefined) {
    issues.push(
      `Release workflow step "${command}" must not have an if: condition ("${step.condition}").`
    );
  }
  if (step.continueOnError !== undefined && step.continueOnError !== "false") {
    issues.push(
      `Release workflow step "${command}" must not set continue-on-error.`
    );
  }
  return issues;
}
