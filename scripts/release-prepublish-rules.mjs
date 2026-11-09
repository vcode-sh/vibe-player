import {
  collectStepBypassIssues,
  findJobRunning,
  readPermissionLevel,
  readWorkflowJobs,
} from "./release-workflow-jobs.mjs";
import { findWorkflowStep } from "./release-workflow-steps.mjs";

const PUBLISH_COMMAND = "bun run release:publish --no-git-tag";
const GATES_COMMAND = "bun run ci";
const NOTES_COMMAND = "node scripts/write-release-notes.mjs";
const NPM_CHECK_COMMAND = "node scripts/assert-unpublished-version.mjs";
const TAG_CHECK_COMMAND = "git ls-remote --exit-code --tags origin";
const PRERELEASE_CHECK_COMMAND = "node scripts/assert-prerelease-mode.mjs";
const EARLY_COMMANDS = [
  PRERELEASE_CHECK_COMMAND,
  NOTES_COMMAND,
  NPM_CHECK_COMMAND,
  TAG_CHECK_COMMAND,
];
const WRITE_COMMANDS = ["git tag", "git push", "gh release"];
const SWALLOWED_FAILURE = /\|\|\s*(?:true|:|exit\s+0)\s*$|^set\s+\+e\b/;

function collectPermissionIssues(job) {
  const issues = [];
  const contents = readPermissionLevel(job.permissions, "contents");
  if (contents !== "read" && contents !== "none") {
    issues.push(
      `Release job "${job.name}" runs dependency code and must not get contents: ${contents}; set contents: read and move repository writes to the tag job.`
    );
  }
  if (readPermissionLevel(job.permissions, "id-token") !== "write") {
    issues.push(
      `Release job "${job.name}" needs id-token: write for npm Trusted Publishing.`
    );
  }
  return issues;
}

function collectCheckoutIssues(job) {
  const checkout = job.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@")
  );
  if (checkout?.settings.get("persist-credentials") === "false") {
    return [];
  }
  return [
    `Release job "${job.name}" must check out with persist-credentials: false so dependency code never sees a repository token.`,
  ];
}

function collectEarlyStepIssues(job) {
  const gates = findWorkflowStep(job.steps, GATES_COMMAND);
  return EARLY_COMMANDS.flatMap((command) => {
    const index = findWorkflowStep(job.steps, command);
    if (index === -1) {
      return [`Release job is missing a step running "${command}".`];
    }
    const order =
      gates === -1 || index < gates
        ? []
        : [
            `Release job must run "${command}" before "${GATES_COMMAND}", so a prerelease outside pre mode, a missing changelog section, a published version or an existing tag stops the release before npm.`,
          ];
    return [...order, ...collectStepBypassIssues(command, job.steps[index])];
  });
}

function collectSwallowIssues(job) {
  const step = job.steps[findWorkflowStep(job.steps, TAG_CHECK_COMMAND)];
  const swallowing = step?.commands.filter((line) =>
    SWALLOWED_FAILURE.test(line)
  );
  return (swallowing ?? []).map(
    (line) =>
      `Release job tag check must not swallow failures ("${line}"); an unreachable origin has to stop the release.`
  );
}

function collectWriteIssues(job) {
  return WRITE_COMMANDS.filter(
    (command) => findWorkflowStep(job.steps, command) !== -1
  ).map(
    (command) =>
      `Release job "${job.name}" must not run "${command}"; tagging and the GitHub release belong to the tag job.`
  );
}

/**
 * Audits the job that publishes to npm: least-privilege permissions, no
 * persisted checkout token, and the early checks that must stop a release
 * before the quality gates run.
 * @param {string} workflowSource Raw release.yml text.
 * @returns {string[]} English issue descriptions; empty when the job is fine.
 */
export function collectReleaseJobIssues(workflowSource) {
  const job = findJobRunning(readWorkflowJobs(workflowSource), PUBLISH_COMMAND);
  if (job === undefined) {
    return [];
  }
  return [
    ...collectPermissionIssues(job),
    ...collectCheckoutIssues(job),
    ...collectEarlyStepIssues(job),
    ...collectSwallowIssues(job),
    ...collectWriteIssues(job),
  ];
}
