# Architecture

## Repository structure

```text
.
├── .github/workflows/
├── demo/vite/
├── docs/
├── scripts/
├── src/
│   ├── adapters/
│   │   ├── file/
│   │   ├── hls/
│   │   ├── native/
│   │   └── shared/
│   ├── captions/
│   ├── core/
│   ├── preview/
│   ├── react/
│   ├── skins/
│   ├── styles/
│   └── ui/
└── test/
```

## Ownership

| Module     | Responsibility                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `core`     | Sources, adapter contracts, capabilities, controller state, normalized events/errors, analytics and resume orchestration |
| `adapters` | Provider bridges, provider runtime loading and source-specific lifecycle                                                 |
| `react`    | Subscriptions, mounting, source synchronization and React playback lifecycle                                             |
| `ui`       | Player assemblies, controls, timeline, captions and interaction rendering                                                |
| `preview`  | Decorative poster/video layers and their independent visibility lifecycle                                                |
| `skins`    | Preset metadata, stable CSS hooks and reference design values                                                            |
| `captions` | WebVTT parsing and cue selection                                                                                         |
| `styles`   | Package CSS assets                                                                                                       |

Product applications own routing, authentication, media policy, telemetry sinks,
storage choices, watched state, and SEO. The package accepts explicit integration
hooks rather than importing those application systems.

## Adapter modules

`file` and `hls` own their provider implementations and colocated
behavior tests. File and HLS share browser video operations through `native`.
`shared` contains genuinely provider-neutral helpers such as target cleanup and
listener contracts. Providers do not reach into sibling implementations.

`create-vibe-player-adapter.ts` composes the built-in provider factories. The
adapter contract stays in `core`; introducing a provider folder does not create a
second contract owner or a new public package entrypoint.

Provider runtimes translate their APIs into package events, snapshots and
capabilities. Shared rendering consumes those normalized contracts. HLS keeps
managed playback, native fallback, live behavior, quality selection and pending
load ownership inside its bridge.

Use composition for shared browser operations. A common adapter superclass is
not required merely because several providers implement the same methods.

## Public integration levels

- Ready-made UI: `VibePlayerCompact`, `VibePlayerStage`, `VibePlayerInline`,
  `VibePlayerModal`.
- Custom UI: `useVibePlayer` owns media/source lifecycle and exposes normalized
  state, commands and a target binding.
- Manual lifecycle: `useVibePlayerController` binds a controller to React;
  `VibePlayerController` and adapter factories support lower-level integration.

The core controller receives an adapter factory by injection. React and UI
composition may select the default package factory. Callback updates do not
create a new playback session; factory/store changes define a new controller.
Source content changes, including URLs under the same ID, remain observable.
Core lazy activation and renewal own source intent independently of an attached
adapter. Stop invalidates pending work and releases media while retaining its
source/position; application session retirement remains host-owned.
The media mount and optional presentation container have separate ownership;
changing fullscreen chrome does not restart playback. Presentation state and
provider rate choices are optional normalized adapter snapshot fields.

Watched ranges, analytics and resume saves read the controller's raw adapter
feed (provider events as reported, pause acknowledgments, seeks, playback
starts and adapter releases), never the intent-shaped controller state. State
subscribers and event listeners receive every update in order through a
bounded queue.
Host persistence, analytics and controller listeners are isolated at the core
observer boundary. Their failures remain observable as nonfatal integration
errors. Caption request status/retry belongs to the React caption binding and
has a separate ready-made UI observer; it never becomes a playback failure.

Skin tokens describe the preset. Runtime styling uses the bundled stylesheet and
its CSS custom properties; changing a metadata object does not restyle a player.

## Dependency direction

- `core` depends only on its own framework/provider-neutral modules.
- `adapters` depends on `core` and permitted internal provider/native/shared
  modules. Only provider bridges load SDKs.
- `captions` owns its parsing dependency and does not depend on player UI.
- `react` depends on `core`, `captions`, and the adapter composition entrypoint.
- `ui` depends on `core`, `react`, and the adapter composition entrypoint.
- `preview` owns decorative media behavior independently of playback adapters.
- `skins` and `styles` own presentation without becoming runtime owners.

Use explicit outward exports. Internal files import their actual dependency
rather than reaching through the package root. Consumers import `vibe-player`
and the explicit `/hook`, `/stage`, `/compact`, and `/styles.css` entry points;
internal folders are not consumer subpaths. Client entry outputs carry a
`"use client"` directive and CSS is the only side effect. HLS is an injected peer
runtime and is not bundled into the compact/hook budget.

## Verification

`package:boundaries` checks production dependency ownership as well as forbidden
application imports. `package:surface` checks compiler-resolved declaration
exports and actual runtime exports against the explicit public inventory. A public API change must update that
inventory deliberately, preserve supported imports, and pass a consumer type
check alongside publint and ATTW.

Behavior belongs to the layer that owns it. Use the testing-patterns skill for
regressions. Browser evidence owns playback, focus, rendering and motion claims;
DOM emulation proves state and interaction contracts only. `test:browser` uses
built package exports and local MP4/HLS/VTT in Chromium and native-HLS WebKit; see
[test/browser/README.md](../../test/browser/README.md). `package:consumer`
installs a real archive outside the repository and checks documentation recipes,
strict types, SSR, CSS, the installed CLI and a consumer build. The manual release
workflow also checks exact minimum Node/React against the same built package.
Accessibility-tree assertions and isolated native
keyboard/AT-SPI checks have explicit platform boundaries; see
[accessibility-acceptance.md](../accessibility-acceptance.md).

See [architecture-dx.md](../architecture-dx.md) for the decisions and acceptance
criteria behind this structure.
