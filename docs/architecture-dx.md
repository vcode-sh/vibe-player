# Architecture and Developer Experience Decisions

The goal is a small provider-agnostic player package that owns playback
orchestration while consumers choose product integration and presentation.

## Revalidated constraints

- Provider code already contains focused modules and shared native video
  operations. Flat placement obscures those boundaries.
- The demo assembled another stage to observe state and keep controls visible,
  duplicating source loading, autoplay, commands and interaction handling.
- Hook/controller ownership depended on options object identity, making callback
  updates capable of recreating playback infrastructure.
- Source recipes using `as const` could not satisfy mutable collection inputs.
  The package reads those collections; it does not need to mutate them.
- Adapter events contained useful provider error detail that the high-level
  controller state did not preserve.
- Existing architecture and public-surface checks did not fully enforce module
  ownership or the actual exported symbol set.
- Exported skin tokens describe design values; they do not drive CSS or hook
  configuration at runtime.

## Decisions

1. Give file, HLS and YouTube their own modules. Keep browser-native operations
   shared between file/HLS and reserve generic helpers for genuinely shared
   concerns. Preserve root imports and provider policies.
2. Simplify the redundant HLS command delegation without creating a universal
   adapter superclass, provider registry or plugin framework.
3. Make advanced runtime contracts deliberate public types and document adapter
   lifecycle ownership, including disposal of pending asynchronous work.
4. Keep core factory injection. Offer a default factory at React/UI composition
   boundaries so ordinary consumers do not repeat provider dispatch.
5. Keep playback infrastructure stable across callback updates and equivalent
   source values. A changed source URL under the same ID must still reload.
6. Provide package-owned headless orchestration. The ready-made stage and custom
   controls should share mounting, source loading, autoplay and cleanup behavior.
7. Forward playback options through inline/modal assemblies. Add normalized
   state/error observation and intentional chrome policy so the demo can use the
   ready-made package player.
8. Accept readonly source/caption collections and use `satisfies` in source
   examples. Keep examples runnable against public exports.
9. Preserve source-aware lifecycle errors, including provider detail where
   available, while leaving logging and telemetry destinations to the host.
10. Enforce production layer/provider boundaries and deliberate public exports.
    Keep ESM, root/CSS entrypoints, lazy HLS loading and opt-in persistence.
11. Document skin tokens as reference metadata and use existing CSS custom
    properties for visual overrides. Preserve decorative preview as its own
    concern.

## Acceptance criteria

- Existing supported root imports still resolve and exported signatures remain
  intentional. Runtime injection has usable named types.
- Callback updates and equivalent source objects retain active playback; real
  source/factory/store changes take effect.
- Superseded loads and disposed work cannot replace current state or media.
- The demo uses the public package stage without copying playback orchestration.
- Inline and modal consumers retain custom composition and can use stage playback
  options without rebuilding a player.
- Errors expose source identity and phase, and a new source clears old errors.
- Documented source and headless examples pass a real consumer type check.
- Boundary/public-surface guards reject meaningful violations and accept valid
  composition.
- Existing unit contracts, package gates and relevant browser flows pass. Browser
  and live-provider limitations are reported separately.

A file move alone makes no promise about playback speed or bundle size. Those
claims require measurements of a relevant consumer build and browser session.
