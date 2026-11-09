import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join, sep } from "node:path";

/** Session-only state; result files (logs, AX trees) stay for inspection. */
const sessionEntries = [
  "cache",
  "config",
  "data",
  "runtime",
  "speech",
  "speech.pid",
  "speech.sock",
];

/** Mount points the kernel reports at or below `directory`, deepest first. */
function findMountsUnder(directory) {
  let table = "";
  try {
    table = readFileSync("/proc/self/mounts", "utf8");
  } catch {
    return [];
  }
  return table
    .split("\n")
    .map((line) => line.split(" ")[1]?.replaceAll("\\040", " "))
    .filter(
      (target) =>
        target !== undefined &&
        (target === directory || target.startsWith(`${directory}${sep}`))
    )
    .sort((a, b) => b.length - a.length);
}

/**
 * The isolated D-Bus session starts FUSE daemons (document portal, GVfs)
 * that mount inside the probe's XDG_RUNTIME_DIR. Killing the session leaves
 * those mounts behind, so detach them lazily, then delete the session state.
 * Only paths inside `work` are touched. Safe to call more than once.
 */
export function releaseNativeSession(work) {
  for (const target of findMountsUnder(work)) {
    const result = spawnSync("fusermount3", ["-u", "-z", target]);
    if (result.status !== 0) {
      spawnSync("fusermount", ["-u", "-z", target]);
    }
  }
  const remaining = findMountsUnder(work);
  if (remaining.length > 0) {
    console.error(`Could not detach: ${remaining.join(", ")}`);
    return;
  }
  for (const entry of sessionEntries) {
    rmSync(join(work, entry), { force: true, recursive: true });
  }
}
