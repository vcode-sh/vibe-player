# Playwright browser lane as a Release gate

Researched: 2026-11-06 23:08 (local). Scope: whether `bun run test:browser`
(Chromium + WebKit with native HLS) should gate the manual Release workflow, and
what the cheapest way to keep it would be. Measured values come from GitHub
Actions job/step timestamps and log lines. Anything marked **est.** is an estimate.

Status: adopted 2026-11-06 — Release runs the browser lane after `bun run ci`
and uploads failure and cancellation evidence (open question 4).

## TL;DR

**Keep the gate, and keep it simple.** Put the two removed pieces back as
separate steps in `release.yml` _after_ `bun run ci`, and leave `ci` in
`package.json` without the browser lane.
- **Cost.** The lane cost **127 s and 172 s** in the two real Release runs, which
  was 68–72 % of each job. Releases have happened twice in 15 days, so that is
  about 5 minutes of runner time a month.
- **Where the time goes.** Most of it is the `--with-deps` apt install, and that
  is also the unpredictable part: 37–564 s across 6 runs, because of the Ubuntu
  mirror. The browser download is a steady 9–12 s. The tests take 76–81 s.
- **Value.** The lane has caught one real product regression, and it is a kind
  that Happy DOM cannot see: a clipped tooltip at 320 px (CI run 39739818829,
  fixed in `ef573e0`). No flakes were seen in 5 executions.
- **Nothing else covers it.** This repo has **never had a pull request**, and CI
  now only triggers on `pull_request`. If the lane leaves Release, no automated
  browser coverage runs anywhere. Releases are also irreversible:
  "Once `package@version` has been used, you can never use it again"
  ([npm unpublish policy](https://docs.npmjs.com/policies/unpublish)).
- **Optimizations don't pay at this release cadence.** Browser caching, sharding,
  a parallel job and a PR path filter each save ≤ 40 s (est.) or never run here.
  The Playwright Docker image is the only option that removes the apt tail. It is
  worth revisiting only if slow mirror runs recur.

## Measured timings

Sources: `gh api repos/vcode-sh/vibe-player/actions/runs/<id>/jobs` for step
start/end times, and `gh run view <id> --log` for the sub-phases inside a step.

### Release runs (with the browser lane)

| Phase                                                                |       41817417553 (2026-11-04, `ubuntu-26.04`) | 39835208863 (2026-10-22, `ubuntu-latest`) |
| -------------------------------------------------------------------- | ---------------------------------------------: | ----------------------------------------: |
| Setup (checkout, Node, Bun, `bun install`)                           |                                            9 s |                                       6 s |
| `--with-deps` apt (`Installing dependencies…` → first `Downloading`) | **79.7 s** (139 MB fetched in 61 s, 2281 kB/s) |               **36.6 s** (119 MB in 18 s) |
| Browser download (Chromium, headless shell, FFmpeg, WebKit)          |                                         11.2 s |                                    12.2 s |
| `bun run ci` without the browser lane (lint → consumer → `tsc`)      |                         38.7 s (Vitest 27.7 s) |                    36.5 s (Vitest 26.1 s) |
| `playwright test`                                                    |      **80.7 s** (52 tests, "52 passed (1.3m)") |                     **76.5 s** (51 tests) |
| Minimum-Node check, publish, post steps                              |                                          ~18 s |                                     ~15 s |
| **Job total**                                                        |                                      **238 s** |                                 **187 s** |
| **Browser-lane share** (apt + download + tests)                      |                             **171.6 s = 72 %** |                        **125.3 s = 67 %** |

The earlier run used `ubuntu-latest`, which was Ubuntu 24.04 then (log shows
`webkit-ubuntu-24.04.zip`). The later one used `ubuntu-26.04` (`webkit-ubuntu-26.04.zip`).
The 26.04 run needed 185 new packages versus 181.

### `Install browser engines` step across every run that had it

| Run         | Event   | Step time | Note                                                                 |
| ----------- | ------- | --------: | -------------------------------------------------------------------- |
| 39739502996 | push CI |      37 s |                                                                      |
| 39741372426 | push CI |      43 s |                                                                      |
| 39835208863 | Release |      50 s |                                                                      |
| 41817417553 | Release |      91 s |                                                                      |
| 39739267937 | push CI |     353 s | log no longer retrievable                                            |
| 39739818829 | push CI | **564 s** | "Fetched 119 MB in 8min 40s (229 kB/s)"; browser download only 8.9 s |

The browser CDN download stayed between 8.9 and 12.2 s in every log that still
exists (n=3). The apt mirror is the slow and variable part.

### Local run (this machine, built working tree, 2026-11-06)

`bun run build` took 0.3 s. `bunx playwright test`: **53 passed in 37.5 s**,
`workers: 1`, 0 flaky. Summed test durations from the JSON reporter:

| Project  | Tests |    Sum |
| -------- | ----: | -----: |
| chromium |    41 | 24.7 s |
| webkit   |    12 | 11.9 s |

The slowest files were `seek-thumbnails` (6.2 s), `selection` (4.5 s) and
`controls` (4.3 s). The CI runner takes about 2.1× longer (80 s vs 37.5 s). That
fits a 4-vCPU public runner
([GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners):
public `ubuntu-26.04` gets 4 CPU / 16 GB) set against a 32-thread desktop.

## Value assessment

**What the lane proves that Vitest/Happy DOM cannot.** The repo assigns these
claims to the browser lane:
- `docs/claude/architecture.md:118-121`: "Browser evidence owns playback, focus,
  rendering and motion claims; DOM emulation proves state and interaction
  contracts only."
- `.claude/skills/testing-patterns/references/repository.md:14`: "Actual
  geometry, focus, playback and motion need the browser lane."

What the lane covers (`test/browser/README.md:14-63`):
- Real decoding of the local MP4/HLS/VTT files, consumed through the **built
  package exports**.
- Modal focus containment and restoration, and nested Escape handling.
- Fullscreen through the browser's own `document.exitFullscreen()`.
- Geometry and pointer reach at 240–1100 px widths.
- Seek-preview sprite crops.
- YouTube iframe hit-testing and shadow-bleed pixel checks.
- A credentialed HLS origin (cookie and CORS).

**WebKit's distinct coverage.** These are the only automated test of the
browser's **native** HLS path. Everywhere else uses the managed hls.js/MSE path.
- `test/browser/webkit-native.browser.ts:7,24`
- `test/browser/webkit-presentation.browser.ts:10,49`
- `selection`/`seek-thumbnails` also run in WebKit (`playwright.config.ts:12-25`).

Three settings make it work:
- `playwright.config.ts:22` sets `WEBKIT_GST_ENABLE_HLS_SUPPORT: "1"` because
  "Linux WebKitGTK/WPE disables native HLS by default"
  (`test/browser/README.md:29-32`).
- That backend needs the GStreamer plugins that `--with-deps webkit` installs.
  The 41817417553 log shows `gstreamer1.0-plugins-bad`, `-good`, `-base`, `-libav`
  and `-plugins-extra` being unpacked.
- The tests require a manifest `currentSrc` rather than a blob URL
  (`README.md:22-27`).

**Track record.**
- **One real catch.** CI run 39739818829 (push to `main`, 2026-10-22) failed on
  `[chromium] › test/browser/youtube-layout.browser.ts:131:3 › custom controls stay outside the embed in a 320px container`
  with "`.vibe-player-tooltip__bubble is clipped`" (assertion at
  `youtube-layout.browser.ts:95`). The fix landed 14 minutes later in `ef573e0`:
  a 1-line change in `src/ui/vibe-player-bottom-control-buttons.tsx`, "wider
  system fonts pushed the bubble past the stage edge at 320px". Vitest passed in
  that same run (479/479). This is a layout bug that only a real layout engine
  can detect.
- **No false positives found.** Every execution I could see passed or failed for
  a real reason: 2 Release passes, 1 CI pass (39741372426), 1 genuine CI failure,
  and 1 local pass. Two other CI failures (39739502996, 39739267937) stopped
  before Playwright ran (fixture `tsc` and Biome).
- **Git history is thin.** There are 27 commits, and the browser lane was added
  on 2026-10-22 (`cf50a87`, `2711940`). So n is small; this is one catch in about
  two weeks of use.
- **The upcoming 0.3.0 release** is the largest behavior change since the lane
  existed: `hls.js` becomes a peer dependency, the `/hook`, `/stage` and
  `/compact` entry points are new, and the HLS adapters were reworked (working
  tree `package.json` diff). The current tree passes the lane locally (above).

**What is left without it.** `bun run ci` still proves types, unit/DOM contracts,
build, size, public surface, tarball, publint, ATTW, and a packed consumer with
SSR/ESM/CSS (`package.json:86`). None of those render or play media.

## Options compared

Time saved is per Release run and is based on the measurements above.

| Option                                                             | Time saved vs. keep                                                                                                                                            | Risk                                                                                                                                                                                                                                                                                                                                                       | Maintenance                               | WebKit native HLS                                                                     | npm OIDC publish                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Keep (separate steps after `ci`)**                               | 0 s (costs 125–172 s; apt tail seen up to 564 s in CI)                                                                                                         | Slow mirror stretches a run; worst seen ≈ 12 min, under `timeout-minutes: 15` (`release.yml:18`)                                                                                                                                                                                                                                                           | None                                      | Yes, as today                                                                         | Unchanged                                                                                   |
| Cache `~/.cache/ms-playwright` by `@playwright/test` version       | ≤ 9–12 s gross, minus restore of ~949 MB (local `du`). Net ≈ 0                                                                                                 | apt still runs, so the tail stays                                                                                                                                                                                                                                                                                                                          | Cache key upkeep                          | Yes                                                                                   | Unchanged                                                                                   |
| Official Docker image as job container                             | Removes apt and download (48–91 s, up to 564 s); adds pull of **994 MiB compressed** (`v1.64.1-resolute` amd64 manifest; pull time on runner **not measured**) | Image ships **Node 24**, no Bun (Dockerfile `NODE_VERSION=24`); runs as root by default; GStreamer HLS inside the container unverified                                                                                                                                                                                                                     | Tag must track `@playwright/test` exactly | Probably: image runs `install-deps` for all browsers (Dockerfile), unverified for HLS | Keep publish **outside** the container (separate job) to avoid changing a working OIDC path |
| Chromium-only in Release, WebKit local                             | est. ~12 s of tests (WebKit is 33 % of local test time) + some apt                                                                                             | Drops the only native-HLS check, the engine most different from Chromium                                                                                                                                                                                                                                                                                   | Low                                       | **No**                                                                                | Unchanged                                                                                   |
| Separate parallel browser job, `publish needs: [quality, browser]` | est. ~25–40 s wall (non-browser gates overlap); runner minutes go _up_ (second setup + build)                                                                  | Package must be rebuilt or passed as an artifact; more YAML                                                                                                                                                                                                                                                                                                | Medium                                    | Yes                                                                                   | Publish job needs `id-token: write` only there                                              |
| Sharding (`--shard`)                                               | est. ≤ 40 s wall on an 80 s suite; each shard pays its own 50–90 s apt install                                                                                 | Playwright recommends `workers: 1` in CI and sharding for scale ([docs](https://playwright.dev/docs/ci#workers)); here the suite is too small                                                                                                                                                                                                              | Matrix + report merge                     | Yes                                                                                   | Unchanged                                                                                   |
| Drop the gate entirely, rely on local runs                         | 125–172 s (+ tail)                                                                                                                                             | Nothing enforces local runs; the one real catch would have been missed if nobody remembered                                                                                                                                                                                                                                                                | None                                      | Local only                                                                            | Unchanged                                                                                   |
| Run on PRs touching `src/`/`test/browser/`                         | 125–172 s at release                                                                                                                                           | **Zero PRs in this repo's history** (`gh pr list --state all` empty), so it would never run. Path-filtered _required_ workflows stay "Pending" and block merges ([GitHub docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)) | Path list upkeep                          | Yes                                                                                   | Unchanged                                                                                   |

Primary-source notes:
- Playwright: "Caching browser binaries is not recommended, since the amount of
  time it takes to restore the cache is comparable to the time it takes to
  download the binaries. Especially under Linux, operating system dependencies
  need to be installed, which are not cacheable."
  ([playwright.dev/docs/ci](https://playwright.dev/docs/ci), "Caching browsers").
  The measurements agree: download is about 11 s, and apt is the real cost.
- Docker: the image "includes the Playwright browsers and browser system
  dependencies"; "The Playwright package/dependency is not included"; pin the
  image or "Playwright will be unable to locate browser executables"; tags exist
  for `resolute` (26.04), `noble` and `jammy`; it uses root by default and
  recommends `--ipc=host` and `--init`
  ([playwright.dev/docs/docker](https://playwright.dev/docs/docker)).
  Build recipe:
  [`utils/docker/Dockerfile.resolute` @ v1.64.1](https://github.com/microsoft/playwright/blob/v1.64.1/utils/docker/Dockerfile.resolute).
- Job containers: steps run inside the container; the default `run` shell is
  `sh`; `--network`/`--entrypoint` options are not supported
  ([GitHub docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)).

## Recommended workflow change (adopted, see Status)

Keep `package.json` `ci` as it is in the working tree, without `test:browser`, so
local `bun run ci` stays fast. Add the lane back to `.github/workflows/release.yml`
as its own steps after the cheap gates. A broken lint or unit test then fails in
about 50 s without paying for apt, and the browser time shows up as a separate
step in the run UI.

```yaml
- name: Install
  run: bun install --frozen-lockfile

- name: Release quality gates
  run: bun run ci # builds dist/, which the browser fixture imports

- name: Install browser engines
  run: bunx playwright install --with-deps chromium webkit

- name: Browser acceptance (Chromium + WebKit native HLS)
  run: bun run test:browser
  timeout-minutes: 5 # suite takes 76–81 s on the runner

- name: Setup minimum consumer Node
  # ...unchanged from here: minimum Node/React check, restore Node 26, publish
```

Leave out step timeouts on the install step. The observed 564 s apt run would
have failed under any tight limit, and the job-level 15 minutes already covers
the worst case seen (about 12 min).

Adopted in the same change, which also reworded these then-contradicting doc
edits:
- `docs/claude/release.md:39-41` ("Playwright browser acceptance is not a release gate")
- the matching `CONTRIBUTING.md` lines

**Escalation path if slow mirrors keep happening.** Move only the two browser
steps into a parallel `browser` job with
`container: { image: mcr.microsoft.com/playwright:v1.64.1-resolute, options: --ipc=host --init }`
and Node 26 + Bun set up inside it. Make `publish` (`needs: [quality, browser]`,
the only job with `id-token: write`) run on the host. Do this only after one
trial run confirms three things:
- the image pull time
- that `setup-bun` and `setup-node` work in that container
- that the WebKit native-HLS tests pass there

## Open questions

1. **Docker pull time on a hosted runner** was not measured. The compressed size
   is 994 MiB. One `workflow_dispatch` trial on a scratch branch (which skips
   publish because of the `refs/heads/main` guard) would settle it.
2. **Does GStreamer HLS work inside the Playwright image** with
   `WEBKIT_GST_ENABLE_HLS_SUPPORT=1`? The packages should be there (`install-deps`
   with no arguments), but this is not verified.
3. **`workers > 1` on the 4-vCPU runner** was not tested. The config pins
   `workers: 1` / `fullyParallel: false` (`playwright.config.ts:5,43`), and
   Playwright recommends 1 in CI. Fullscreen/PiP and focus tests may share global
   state, so treat this as unverified.
4. **Failure diagnostics (resolved).** The config keeps traces and screenshots
   on failure (`playwright.config.ts:31-35`). Release now uploads
   `test-results/` with `actions/upload-artifact@v7.0.2` on
   `failure() || cancelled()`.
5. **Apt mirror slowness.** Is the slow mirror seen on 2026-10-22 recurring or
   a one-off? With n=6 it is not possible to tell. Re-check after a few more
   releases before deciding on the Docker path.
