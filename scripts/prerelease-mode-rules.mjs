/**
 * A prerelease version (one with a `-` suffix) must be published while
 * Changesets pre mode is active, so it goes to its prerelease dist-tag.
 * Without pre mode, `changeset publish` would move npm `latest` to it.
 * @param {string} version The package.json version.
 * @param {{mode?: string, tag?: string} | null} preState Parsed
 *   `.changeset/pre.json`, or null when the file does not exist.
 * @returns {string[]} English issue descriptions; empty when publishing is safe.
 */
export function collectPrereleaseModeIssues(version, preState) {
  if (!version.includes("-")) {
    return [];
  }
  if (preState === null) {
    return [
      `Version ${version} is a prerelease, but .changeset/pre.json is missing, so npm "latest" would point to it. Enter pre mode with "bunx changeset pre enter <tag>" and version again.`,
    ];
  }
  if (preState.mode !== "pre") {
    return [
      `Version ${version} is a prerelease, but Changesets pre mode is "${preState.mode}", not "pre", so npm "latest" would point to it.`,
    ];
  }
  return [];
}
