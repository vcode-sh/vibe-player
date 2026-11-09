/**
 * Builds release-workflow YAML text for rule tests. Each job is
 * `{ name, keys: string[], steps: string[][] }`, where a step is its key lines.
 * Pass `permissions: null` for a workflow without top-level permissions.
 */
export function buildWorkflow({ jobs, permissions = ["contents: read"] }) {
  const top =
    permissions === null
      ? []
      : ["permissions:", ...permissions.map((line) => `  ${line}`), ""];
  const body = jobs.flatMap(({ keys = [], name, steps }) => [
    `  ${name}:`,
    ...keys.map((line) => `    ${line}`),
    "    steps:",
    ...steps.flatMap(([first, ...rest]) => [
      `      - ${first}`,
      ...rest.map((line) => `        ${line}`),
    ]),
  ]);
  return [...top, "jobs:", ...body, ""].join("\n");
}

export const releaseJobKeys = [
  "permissions:",
  "  contents: read",
  "  id-token: write",
];

export const checkoutStep = [
  "uses: actions/checkout@v7.0.1",
  "with:",
  "  persist-credentials: false",
];

export const prereleaseStep = ["run: node scripts/assert-prerelease-mode.mjs"];
export const notesStep = [
  'run: node scripts/write-release-notes.mjs --output "$RUNNER_TEMP/notes.md"',
];
export const npmCheckStep = [
  "run: node scripts/assert-unpublished-version.mjs",
];
export const tagCheckStep = [
  "run: |",
  "  status=0",
  '  git ls-remote --exit-code --tags origin "refs/tags/$TAG" || status=$?',
  '  if [ "$status" -ne 2 ]; then exit 1; fi',
];
export const gatesStep = ["run: bun run ci"];
export const publishStep = ["run: bun run release:publish --no-git-tag"];

export const tagJobKeys = [
  "needs: release",
  "permissions:",
  "  contents: write",
];
export const tagStep = [
  "run: |",
  '  git tag -a "$TAG" -m "$TAG" "$GITHUB_SHA"',
  '  git push origin "refs/tags/$TAG"',
];
export const githubReleaseStep = [
  'run: gh release create "$TAG" --notes-file "$RUNNER_TEMP/notes/notes.md"',
];

export function releaseJob(patch = {}) {
  return {
    keys: releaseJobKeys,
    name: "release",
    steps: [
      checkoutStep,
      prereleaseStep,
      notesStep,
      npmCheckStep,
      tagCheckStep,
      gatesStep,
      publishStep,
    ],
    ...patch,
  };
}

export function tagJob(patch = {}) {
  return {
    keys: tagJobKeys,
    name: "tag",
    steps: [["uses: actions/checkout@v7.0.1"], tagStep, githubReleaseStep],
    ...patch,
  };
}
