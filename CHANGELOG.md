# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, adapted for a private package that
will later become public.

## [Unreleased]

### Added

- Initial standalone repository scaffold for `@vibe-code/vibe-player`
- Package-first architecture split across `core`, `adapters`, `react`, `ui`,
  `captions`, `skins`, and `styles`
- Provider adapters for direct file, HLS, YouTube iframe, and compliant
  YouTube external handoff sources
- React controller hooks, inline/modal/stage assemblies, captions, timeline,
  default controls, keyboard shortcuts, fullscreen, and native PiP support for
  providers that expose it
- Cinematic default skin, ambient preview primitives, package-owned volume
  popover, quality menu, and tooltip system
- Vite demo for file, HLS, YouTube iframe, and YouTube external handoff modes
- Media delivery audit CLI and package bin with range, faststart, CORS,
  direct-file size, rollout readiness, and structured remediation findings
- Package guards for coding rules, boundaries, dependency shape, private
  release stance, built stylesheet contract, package size, public surface, and
  tarball contents
- Biome + Ultracite linting baseline
- TypeScript + tsdown build pipeline
- Vitest + Testing Library test baseline
- Publint + Are the Types Wrong validation scripts
- Changesets versioning scaffold
- GitHub Actions CI
- Root repo rules via `AGENTS.md`, `CLAUDE.md`, and `docs/claude/*`
- Copied implementation plan in `todo/vibe-player.md`

### Changed

- Package stylesheet consumption now resolves through built `dist/styles.css`
  instead of split source CSS files.
- Local consumer documentation now treats `file:` dependencies as active
  integration only and requires versioned internal release or workspace policy
  before stabilization.

## [0.1.0] - 2026-06-08

### Added

- Initial private scaffold created by Vibe Code for implementation kickoff
