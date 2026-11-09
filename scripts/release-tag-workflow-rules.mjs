import {
  findWorkflowStep,
  readWorkflowSteps,
} from "./release-workflow-steps.mjs";

const PUBLISH_COMMAND = "bun run release:publish --no-git-tag";
const NOTES_COMMAND = "node scripts/write-release-notes.mjs";
const TAG_CHECK_COMMAND = "git ls-remote --exit-code --tags origin";
const TAG_CREATE_COMMAND = "git tag -a";
const TAG_PUSH_COMMAND = "git push origin";
const RELEASE_COMMAND = "gh release create";
const PRE_PUBLISH_COMMANDS = [NOTES_COMMAND, TAG_CHECK_COMMAND];
const POST_PUBLISH_COMMANDS = [
  TAG_CREATE_COMMAND,
  TAG_PUSH_COMMAND,
  RELEASE_COMMAND,
];
const LINE_BREAK = /\r?\n/;
const PERMISSION_LINE = /^\s+([\w-]+):\s*(\S+)/;

function readTopLevelPermissions(workflowSource) {
  const lines = workflowSource.split(LINE_BREAK);
  const start = lines.findIndex((line) => line.trimEnd() === "permissions:");
  const permissions = new Map();
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const match = PERMISSION_LINE.exec(line);
    if (!match) {
      break;
    }
    permissions.set(match[1], match[2]);
  }
  return permissions;
}

function collectPermissionIssues(workflowSource) {
  if (readTopLevelPermissions(workflowSource).get("contents") === "write") {
    return [];
  }
  return [
    'Release workflow needs "contents: write" to push the release tag and create the GitHub release.',
  ];
}

function collectBypassIssues(command, step) {
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

function collectPrePublishIssues(steps, publish) {
  return PRE_PUBLISH_COMMANDS.flatMap((command) => {
    const index = findWorkflowStep(steps, command);
    if (index === -1 || publish === -1) {
      return [];
    }
    const order =
      index < publish
        ? []
        : [
            `Release workflow must run "${command}" before "${PUBLISH_COMMAND}", so a missing changelog section or an existing tag stops the release before npm.`,
          ];
    return [...order, ...collectBypassIssues(command, steps[index])];
  });
}

function collectPostPublishIssues(steps, publish) {
  let previous = publish;
  return POST_PUBLISH_COMMANDS.flatMap((command) => {
    const index = findWorkflowStep(steps, command);
    if (index === -1 || publish === -1) {
      return [];
    }
    const order =
      index > publish && index >= previous
        ? []
        : [
            `Release workflow must run "${command}" after "${PUBLISH_COMMAND}", in the order tag, push, GitHub release.`,
          ];
    previous = Math.max(previous, index);
    return [...order, ...collectBypassIssues(command, steps[index])];
  });
}

function collectNotesFileIssues(steps) {
  const release = steps[findWorkflowStep(steps, RELEASE_COMMAND)];
  if (
    release === undefined ||
    release.commands.join(" ").includes("--notes-file")
  ) {
    return [];
  }
  return [
    `Release workflow step "${RELEASE_COMMAND}" must pass --notes-file with the CHANGELOG section.`,
  ];
}

/**
 * Audits release.yml so the tag and GitHub release follow a successful npm
 * publish, and the changelog and tag checks that guard them run before it.
 * @param {string} workflowSource Raw release.yml text.
 * @returns {string[]} English issue descriptions; empty when the workflow is fine.
 */
export function collectReleaseTagWorkflowIssues(workflowSource) {
  const steps = readWorkflowSteps(workflowSource);
  const publish = findWorkflowStep(steps, PUBLISH_COMMAND);
  const missing = [...PRE_PUBLISH_COMMANDS, ...POST_PUBLISH_COMMANDS]
    .filter((command) => findWorkflowStep(steps, command) === -1)
    .map(
      (command) => `Release workflow is missing a step running "${command}".`
    );
  return [
    ...collectPermissionIssues(workflowSource),
    ...missing,
    ...collectPrePublishIssues(steps, publish),
    ...collectPostPublishIssues(steps, publish),
    ...collectNotesFileIssues(steps),
  ];
}
