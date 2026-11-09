import {
  collectStepBypassIssues,
  findJobRunning,
  readPermissionLevel,
  readWorkflowJobs,
} from "./release-workflow-jobs.mjs";
import { findWorkflowStep } from "./release-workflow-steps.mjs";

const PUBLISH_COMMAND = "bun run release:publish --no-git-tag";
const TAG_CREATE_COMMAND = "git tag -a";
const TAG_PUSH_COMMAND = "git push origin";
const RELEASE_COMMAND = "gh release create";
const TAG_COMMANDS = [TAG_CREATE_COMMAND, TAG_PUSH_COMMAND, RELEASE_COMMAND];
const DEPENDENCY_RUNNERS = /^(?:bun|bunx|node|npm|npx|pnpm|yarn)\b/;
const UNSAFE_PUSH =
  /\s(?:--force\b|-f\b|--delete\b|-d\b|--mirror\b|--all\b|["']?\+)/;
/** `[ -z "$TAG" ]` or `test -z "$TAG"`: an empty tag stops the job. */
const EMPTY_TAG_CHECK = /(?:\[|\btest)\s+-z\s+"?\$\{?TAG\}?"?/;
/** A single pipe, not `||`. */
const PIPE = /(?<!\|)\|(?!\|)/;
const PIPEFAIL = /^set\s+-[a-z]*o\s+pipefail\b/;

function collectJobIssues(tagJob, releaseJob) {
  const issues = [];
  if (tagJob.name === releaseJob.name) {
    issues.push(
      `Tagging and the GitHub release must run in their own job, not in "${releaseJob.name}", which runs dependency code.`
    );
  }
  if (!tagJob.needs.includes(releaseJob.name)) {
    issues.push(
      `Tag job "${tagJob.name}" must declare needs: ${releaseJob.name}, so it runs only after a successful publish.`
    );
  }
  if (tagJob.condition !== undefined) {
    issues.push(
      `Tag job "${tagJob.name}" must not have an if: condition ("${tagJob.condition}"); it could tag after a failed publish.`
    );
  }
  if (readPermissionLevel(tagJob.permissions, "contents") !== "write") {
    issues.push(
      `Tag job "${tagJob.name}" needs contents: write to push the tag and create the GitHub release.`
    );
  }
  if (readPermissionLevel(tagJob.permissions, "id-token") === "write") {
    issues.push(`Tag job "${tagJob.name}" must not request id-token: write.`);
  }
  return issues;
}

function collectStepIssues(tagJob) {
  let previous = -1;
  return TAG_COMMANDS.flatMap((command) => {
    const index = findWorkflowStep(tagJob.steps, command);
    if (index === -1) {
      return [`Tag job is missing a step running "${command}".`];
    }
    const order =
      index >= previous
        ? []
        : [
            `Tag job must run "${command}" in the order tag, push, GitHub release.`,
          ];
    previous = Math.max(previous, index);
    return [...order, ...collectStepBypassIssues(command, tagJob.steps[index])];
  });
}

function collectCommandIssues(tagJob) {
  const lines = tagJob.steps.flatMap((step) => step.commands);
  const issues = lines
    .filter((line) => DEPENDENCY_RUNNERS.test(line))
    .map(
      (line) =>
        `Tag job must not run dependency code ("${line}"); it holds a repository write token.`
    );
  for (const line of lines.filter((entry) => entry.startsWith("git push"))) {
    if (!line.includes("refs/tags/") || UNSAFE_PUSH.test(line)) {
      issues.push(
        `Tag job may only push the release tag ("${line}"); push refs/tags/<tag> without force, delete, mirror or all.`
      );
    }
  }
  issues.push(...collectEmptyTagIssues(lines), ...collectPipeIssues(tagJob));
  const release = tagJob.steps[findWorkflowStep(tagJob.steps, RELEASE_COMMAND)];
  if (release && !release.commands.join(" ").includes("--notes-file")) {
    issues.push(
      `Tag job step "${RELEASE_COMMAND}" must pass --notes-file with the CHANGELOG section.`
    );
  }
  return issues;
}

/** The tag comes from the release job's output; an empty one must stop. */
function collectEmptyTagIssues(lines) {
  const create = lines.findIndex((line) => line.startsWith(TAG_CREATE_COMMAND));
  // A missing tag step is reported on its own.
  const checked =
    create === -1 ||
    lines.slice(0, create).some((line) => EMPTY_TAG_CHECK.test(line));
  return checked
    ? []
    : [
        `Tag job must fail on an empty TAG (for example [ -z "$TAG" ]) before "${TAG_CREATE_COMMAND}"; needs.release.outputs.tag can be empty.`,
      ];
}

/** Without pipefail, a failed `git ls-remote | cut` looks like "no tag". */
function collectPipeIssues(tagJob) {
  return tagJob.steps.flatMap((step) => {
    const pipe = step.commands.findIndex((line) => PIPE.test(line));
    if (pipe === -1) {
      return [];
    }
    const guarded = step.commands
      .slice(0, pipe)
      .some((line) => PIPEFAIL.test(line));
    return guarded
      ? []
      : [
          `Tag job step with a pipe ("${step.commands[pipe]}") must run "set -o pipefail" first, so a failed command is not hidden.`,
        ];
  });
}

/**
 * Audits release.yml so the tag and GitHub release run in a separate job
 * that needs the publishing job, holds the only repository write token and
 * runs no dependency code.
 * @param {string} workflowSource Raw release.yml text.
 * @returns {string[]} English issue descriptions; empty when the workflow is fine.
 */
export function collectReleaseTagWorkflowIssues(workflowSource) {
  const jobs = readWorkflowJobs(workflowSource);
  const releaseJob = findJobRunning(jobs, PUBLISH_COMMAND);
  if (releaseJob === undefined) {
    return [];
  }
  const tagJob =
    jobs.find(
      (job) => job !== releaseJob && findJobRunning([job], RELEASE_COMMAND)
    ) ?? findJobRunning(jobs, TAG_CREATE_COMMAND);
  if (tagJob === undefined) {
    return [
      `Release workflow is missing a tag job running "${TAG_CREATE_COMMAND}", "${TAG_PUSH_COMMAND}" and "${RELEASE_COMMAND}".`,
    ];
  }
  return [
    ...collectJobIssues(tagJob, releaseJob),
    ...collectStepIssues(tagJob),
    ...collectCommandIssues(tagJob),
  ];
}
