# Changelog

## Unreleased

- Moved the extension into the Stacktape monorepo and adopted its pnpm, Turbo, TypeScript 6, Oxlint, and Oxfmt setup.
- Replaced the copied YAML language-server implementation with the maintained upstream package and a focused Stacktape
  adapter.
- Embedded the canonical Stacktape schema as an offline fallback instead of maintaining a second generated copy.
- Run CLI actions through structured VS Code tasks instead of constructing a terminal command string.

## 1.0.0

### Fixed

- Language server failed to start on recent VS Code builds (Node 22+) with `ERR_MODULE_NOT_FOUND`. The extension now
  ships as a single self-contained bundle, so this class of module-resolution failure can no longer occur.
- Documentation hover links updated to the current docs.stacktape.com structure (resources, triggers, directives,
  packaging, hooks).

### Added

- **Go to definition** for `$ResourceParam` / `$CfResourceParam` / `$Var` directive arguments and `connectTo` entries —
  jumps to where the resource/variable is defined.
- **Reference validation** — directive/`connectTo` references to resources or variables not defined in the file are
  flagged (toggle with `stacktape.validateReferences`).
- **Directive hover & completion** — preview a referenced resource's type on hover, and complete resource/variable names
  inside directives.
- **CLI commands** — Validate, Preview (diff), and Deploy, available from the editor title bar, right-click menu, and
  Command Palette (including for `*.stacktape.ts` configs).
- Local project installs (`node_modules/stacktape`) are now supported for schema/version resolution, in addition to
  global installs.
- Settings: `stacktape.validate`, `stacktape.hover`, `stacktape.completion`, `stacktape.validateReferences`,
  `stacktape.defaultStage`, `stacktape.defaultRegion`, `stacktape.profile`, `stacktape.trace.server`.

### Changed

- Stacktape config files now use a dedicated **Stacktape** language id, so the extension coexists cleanly with the
  official YAML extension instead of prompting to uninstall it.
- Modernized the toolchain: migrated to pnpm, TypeScript 5, current esbuild, and language server 9. Minified production
  bundle.
- Requires VS Code 1.82 or newer.
