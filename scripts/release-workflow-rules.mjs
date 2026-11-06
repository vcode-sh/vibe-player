const INSTALL_STEP = "run: bunx playwright install --with-deps chromium webkit";
const BROWSER_STEP = "run: bun run test:browser";
const GATES_STEP = "run: bun run ci";
const PUBLISH_STEP = "run: bun run release:publish --no-git-tag";

const LINE_BREAK = /\r?\n/;

function toStepLines(workflowSource) {
  return workflowSource
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function addOrderIssues(issues, lines, step, bounds) {
  const index = lines.indexOf(step);
  if (index === -1) {
    return;
  }
  if (bounds.gates !== -1 && index < bounds.gates) {
    issues.push(`Release workflow runs "${step}" before "${GATES_STEP}".`);
  }
  if (bounds.publish !== -1 && index > bounds.publish) {
    issues.push(`Release workflow runs "${step}" after "${PUBLISH_STEP}".`);
  }
}

/**
 * Audits the manual Release workflow text so the browser acceptance gate
 * cannot be removed or reordered without a failing release-state audit.
 * @param {string} workflowSource Raw release.yml text.
 * @returns {string[]} English issue descriptions; empty when the workflow is fine.
 */
export function collectReleaseWorkflowIssues(workflowSource) {
  const lines = toStepLines(workflowSource);
  const issues = [];

  for (const step of [GATES_STEP, PUBLISH_STEP, INSTALL_STEP, BROWSER_STEP]) {
    if (!lines.includes(step)) {
      issues.push(`Release workflow is missing a step "${step}".`);
    }
  }

  const bounds = {
    gates: lines.indexOf(GATES_STEP),
    publish: lines.indexOf(PUBLISH_STEP),
  };
  addOrderIssues(issues, lines, INSTALL_STEP, bounds);
  addOrderIssues(issues, lines, BROWSER_STEP, bounds);
  return issues;
}
