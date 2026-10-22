import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "linux") {
  throw new Error("The isolated native accessibility probe requires Linux.");
}
execFileSync("which", [
  "dbus-run-session",
  "xvfb-run",
  "orca",
  "speech-dispatcher",
  "google-chrome",
  "/usr/bin/python3",
]);
execFileSync("/usr/bin/python3", [
  "-c",
  'import ctypes, gi; gi.require_version("Atspi", "2.0"); from gi.repository import Atspi; ctypes.CDLL("libXtst.so.6")',
]);
const existingOrca = spawnSync("pgrep", [
  "-u",
  String(process.getuid()),
  "-x",
  "orca",
]);
if (existingOrca.status !== 1) {
  throw new Error(
    "Stop this probe: an Orca process exists or its absence cannot be verified. The probe never replaces it."
  );
}

const work = mkdtempSync(join(tmpdir(), "vibe-player-native-a11y-"));
for (const directory of ["config", "cache", "data", "runtime", "speech"]) {
  mkdirSync(join(work, directory), { mode: 0o700 });
}
mkdirSync(join(work, "data/orca"));
writeFileSync(
  join(work, "data/orca/orca-customizations.py"),
  "from orca import debug\nif debug.debugFile:\n    debug.debugFile.reconfigure(line_buffering=True)\n"
);
writeFileSync(
  join(work, "speech/speechd.conf"),
  'LogLevel 3\nDefaultLanguage "en"\nDefaultModule "dummy"\nAddModule "dummy" "sd_dummy" ""\n'
);
const environment = {
  ...process.env,
  AT_SPI_BUS_ADDRESS: undefined,
  DBUS_SESSION_BUS_ADDRESS: undefined,
  SPEECHD_ADDRESS: `unix_socket:${work}/speech.sock`,
  WAYLAND_DISPLAY: undefined,
  XDG_CACHE_HOME: join(work, "cache"),
  XDG_CONFIG_HOME: join(work, "config"),
  XDG_DATA_HOME: join(work, "data"),
  XDG_RUNTIME_DIR: join(work, "runtime"),
  XDG_SESSION_TYPE: "x11",
};

console.log(`Isolated accessibility artifacts: ${work}`);
const child = spawn(
  "dbus-run-session",
  [
    "--",
    "xvfb-run",
    "-a",
    "--server-args=-screen 0 1280x800x24",
    process.execPath,
    join(
      dirname(fileURLToPath(import.meta.url)),
      "accessibility-native-runner.mjs"
    ),
    work,
  ],
  { detached: true, env: environment, stdio: "inherit" }
);

function stopOwnedSession() {
  if (!child.pid) {
    return;
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }
  }
}

const deadline = setTimeout(stopOwnedSession, 45_000);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopOwnedSession();
    process.exit(1);
  });
}
try {
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  if (status !== 0) {
    throw new Error(
      `Isolated accessibility session failed (${status}); inspect ${work}.`
    );
  }
} finally {
  clearTimeout(deadline);
  stopOwnedSession();
}
