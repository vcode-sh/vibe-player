# Architecture

## Repo structure

```text
.
├── .github/workflows/
├── docs/claude/
├── src/
│   ├── adapters/
│   ├── captions/
│   ├── core/
│   ├── react/
│   ├── skins/
│   ├── styles/
│   └── ui/
├── test/
└── todo/
```

## Ownership model

### `src/core`

Owns:

- source contracts
- adapter contracts
- capabilities
- controller state
- normalized events
- time and progress helpers

Must not import from:

- `ui`
- `skins`
- product-specific code

### `src/adapters`

Owns:

- direct file playback bridge
- HLS playback bridge
- YouTube playback bridge

Adapters translate provider-specific APIs into normalized package events and
capabilities.

### `src/react`

Owns:

- hooks
- `useSyncExternalStore` bindings
- mount/unmount helpers

### `src/ui`

Owns:

- inline player assembly
- modal player assembly
- shell
- controls
- timeline
- caption overlay

### `src/skins`

Owns:

- default cinematic preset
- future Discovery-parity preset

### `src/captions`

Owns:

- WebVTT parsing
- cue helpers
- active-line selection helpers

### `src/styles`

Owns package CSS assets only.

## Dependency direction

Allowed:

- `react` -> `core`
- `ui` -> `react`, `core`
- `skins` -> `ui`, `styles`, `core`
- `adapters` -> `core`

Disallowed:

- `core` -> `ui`
- `core` -> `skins`
- `core` -> provider packages with visual concerns
