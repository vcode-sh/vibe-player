import { readWorkflowSteps } from "./release-workflow-steps.mjs";

const INSTALL_COMMAND = "bunx playwright install --with-deps chromium webkit";
const BROWSER_COMMAND = "bun run test:browser";
const GATES_COMMAND = "bun run ci";
const PUBLISH_COMMAND = "bun run release:publish --no-git-tag";

function runsCommand(step, command) {
  return step.commands.some(
    (line) => line === command || line.startsWith(`${command} `)
  );
}

function findStep(steps, command) {
  return steps.findIndex((step) => runsCommand(step, command));
}

function collectOrderIssues(command, index, bounds) {
  const issues = [];
  if (bounds.gates !== -1 && index < bounds.gates) {
    issues.push(
      `Release workflow runs "${command}" before "${GATES_COMMAND}".`
    );
  }
  if (bounds.publish !== -1 && index > bounds.publish) {
    issues.push(
      `Release workflow runs "${command}" after "${PUBLISH_COMMAND}".`
    );
  }
  return issues;
}

function collectBypassIssues(command, step) {
  const issues = [];
  if (step.condition !== undefined) {
    issues.push(
      `Release workflow step "${command}" must not have an if: condition ("${step.condition}"); the browser gate has to run on every release.`
    );
  }
  if (step.continueOnError !== undefined && step.continueOnError !== "false") {
    issues.push(
      `Release workflow step "${command}" must not set continue-on-error; a failing browser gate has to stop publishing.`
    );
  }
  return issues;
}

function collectPublishIssues(step) {
  if (step?.condition === undefined) {
    return [];
  }
  return [
    `Release workflow step "${PUBLISH_COMMAND}" must not have an if: condition ("${step.condition}"); it could publish after a failed gate.`,
  ];
}

function collectGateStepIssues(steps, command, bounds) {
  const index = findStep(steps, command);
  if (index === -1) {
    return [];
  }
  return [
    ...collectOrderIssues(command, index, bounds),
    ...collectBypassIssues(command, steps[index]),
  ];
}

/**
 * Audits the manual Release workflow text so the browser acceptance gate
 * cannot be removed, reordered, skipped or ignored without a failing
 * release-state audit.
 * @param {string} workflowSource Raw release.yml text.
 * @returns {string[]} English issue descriptions; empty when the workflow is fine.
 */
export function collectReleaseWorkflowIssues(workflowSource) {
  const steps = readWorkflowSteps(workflowSource);
  const commands = [
    GATES_COMMAND,
    PUBLISH_COMMAND,
    INSTALL_COMMAND,
    BROWSER_COMMAND,
  ];
  const missing = commands
    .filter((command) => findStep(steps, command) === -1)
    .map((command) => `Release workflow is missing a step "run: ${command}".`);
  const bounds = {
    gates: findStep(steps, GATES_COMMAND),
    publish: findStep(steps, PUBLISH_COMMAND),
  };
  return [
    ...missing,
    ...collectGateStepIssues(steps, INSTALL_COMMAND, bounds),
    ...collectGateStepIssues(steps, BROWSER_COMMAND, bounds),
    ...collectPublishIssues(steps[bounds.publish]),
  ];
}
