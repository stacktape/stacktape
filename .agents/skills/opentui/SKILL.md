---
name: opentui
description: Build terminal UIs with OpenTUI. Covers the core API, native audio, keymaps, React and Solid bindings, components, layout, keyboard input, plugins, and testing.
---

# OpenTUI Skill

> **Stacktape-specific note (re-check on upgrade):** this skill is vendored from the official OpenTUI repo (`packages/web/src/content/`, upstream commit `b7e0bb9c`, 2026-06-11, v0.4.1-era) and documents the **0.4.x API**. Check `package.json` before writing renderer code: if the project still pins `@opentui/core` **0.1.86**, the renderer-options API differs — 0.1.86 uses `useAlternateScreen: boolean` / `useConsole: boolean` / `experimental_splitHeight`, which were replaced in 0.1.93 by `screenMode: "alternate-screen" | "main-screen" | "split-footer"`, `consoleMode`, `externalOutputMode`, and `footerHeight`. Features like `writeToScrollback`, `clearOnShutdown`, scrollback writers, `@opentui/keymap`, and plugins/slots do NOT exist in 0.1.86. To re-vendor after an upgrade: copy `SKILL.md` + `docs/` from `packages/web/src/content/` at the matching tag and re-add this note.

Canonical reference docs are authored once in sibling `docs/**/*.mdx` files.

Inside the OpenTUI repo, this skill root lives at `packages/web/src/content/`, so the same files are also visible at `packages/web/src/content/docs/**/*.mdx`.

## Path invariant

- `/docs/<slug>` maps to `docs/<slug>.mdx` relative to this skill root
- in the repo, that same slug maps to `packages/web/src/content/docs/<slug>.mdx`

## Reading order by area

- Getting started: `/docs/getting-started`
- Core: `/docs/core-concepts/renderer`
- Testing: `/docs/core-concepts/testing`
- Audio: `/docs/core-concepts/audio`
- Keymap: `/docs/keymap/overview`
- React: `/docs/bindings/react`
- Solid: `/docs/bindings/solid`
- Components: `/docs/components/text`, `/docs/components/input`
- Layout: `/docs/core-concepts/layout`
- Keyboard: `/docs/core-concepts/keyboard`
- Plugins: `/docs/plugins/slots`
- Reference: `/docs/reference/env-vars`

## Quick routing by intent

| Intent(s)                                                  | Start here                        |
| ---------------------------------------------------------- | --------------------------------- |
| `getting-started`, `installation`, `quickstart`, `intro`   | `docs/getting-started.mdx`        |
| `core`, `renderer`, `terminal`, `scrollback`, `lifecycle`  | `docs/core-concepts/renderer.mdx` |
| `audio`, `native-audio`, `sound`, `playback`, `pcm`, `fft` | `docs/core-concepts/audio.mdx`    |
| `keymap`, `keybindings`, `shortcuts`, `commands`, `leader` | `docs/keymap/overview.mdx`        |
| `layout`, `flexbox`, `yoga`, `positioning`                 | `docs/core-concepts/layout.mdx`   |
| `keyboard`, `input`, `keybindings`, `paste`, `focus`       | `docs/core-concepts/keyboard.mdx` |
| `testing`, `test-renderer`, `snapshots`, `frames`          | `docs/core-concepts/testing.mdx`  |
| `react`, `jsx`, `hooks`, `animation`, `testing`            | `docs/bindings/react.mdx`         |
| `solid`, `signals`, `jsx`, `hooks`, `animation`, `testing` | `docs/bindings/solid.mdx`         |
| `plugins`, `plugin`, `slots`, `registry`, `extensions`     | `docs/plugins/slots.mdx`          |
| `text`, `styling`, `content`, `selection`                  | `docs/components/text.mdx`        |
| `input`, `form`, `editing`, `focus`                        | `docs/components/input.mdx`       |
| `env`, `environment`, `configuration`, `flags`             | `docs/reference/env-vars.mdx`     |

For concrete component requests, jump straight to `docs/components/<name>.mdx` after the relevant entry page. For plugin implementation details, narrow from `docs/plugins/slots.mdx` into `docs/plugins/core.mdx`, `docs/plugins/react.mdx`, or `docs/plugins/solid.mdx`.

## Current skill entry pages

- `docs/getting-started.mdx`
- `docs/core-concepts/renderer.mdx`
- `docs/core-concepts/audio.mdx`
- `docs/keymap/overview.mdx`
- `docs/core-concepts/layout.mdx`
- `docs/core-concepts/keyboard.mdx`
- `docs/bindings/react.mdx`
- `docs/bindings/solid.mdx`
- `docs/plugins/slots.mdx`
- `docs/components/text.mdx`
- `docs/components/input.mdx`
- `docs/reference/env-vars.mdx`

## Working rules

- Prefer the current entry pages first, then read narrower docs in the same section.
- Read the sibling `docs/**/*.mdx` files directly instead of copying prose into this file.
- Use stable `/docs/...` URLs when cross-referencing docs.
