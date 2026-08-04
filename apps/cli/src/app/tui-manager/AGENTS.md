# tui-manager — CLI presentation layer

Everything the Stacktape CLI writes to a terminal goes through this module. The `tuiManager` singleton
(`index.ts`) is the only import surface the rest of the application uses; it composes the layers below and
contains no rendering logic of its own.

## Output modes

`output/mode.ts` resolves one of three modes (`--outputFormat` / `--agent` → jsonl, TTY auto-detect, CI → plain):

- **tty** — an OpenTUI split-footer app is mounted; finished work streams into real terminal scrollback.
- **plain** — line-oriented stdout via `output/plain.ts`; console output is captured and passed through.
- **jsonl** — machine-readable records on stdout via `output/jsonl.ts`; raw stdout/stderr writes are wrapped
  into structured records by `JsonlStdioGuard` so the stream stays parseable.

All modes additionally stream records to the log-collector file through `OutputRouter`. Text styling
(`format/text.ts`) is enabled only in tty mode; the facade updates the toggle whenever the mode changes.

Which command gets which UI is declared exhaustively in `commandUi` in `src/index.ts` — adding a command
forces an explicit decision there.

## Layout

- `output/` — headless pipeline: mode resolution, `OutputRecord` types, router, plain + jsonl sinks,
  console interception and jsonl stdio guards. No OpenTUI imports here.
- `format/` — pure formatting. `text.ts` (colors, pretty*, durations), `blocks.ts` (ascii tables, boxes,
  command headers), `errors.ts` (error rendering + CloudFormation error message parsing). The error catalog
  (`src/config/error-messages.ts`) imports these directly — never the facade.
- `runtime/` — OpenTUI ownership. `opentui.ts` creates the renderer (and sets `OTUI_USE_CONSOLE=false`
  before any `@opentui` import — every OpenTUI import in the app must go through it). `lifecycle.ts` is the
  single `TtyRuntime` state machine (`idle → starting → active → stopping`) used by both the progress app
  and the dev app; all mount/teardown races are handled there and nowhere else. `scrollback.ts` is the
  generic buffered queue; `scrollback-consumer.tsx` writes queue items into terminal scrollback.
- `progress/` — the phase/event progress app used by deploy/delete/rollback/script:run/…: state store,
  event sink, scrollback feed, phase presets, plain exit summary, CF progress extraction, Solid views.
- `dev/` — the `stacktape dev` dashboard app (`devTuiManager`): own state/feed/views, mounted through the
  shared `TtyRuntime`.
- `launcher/` — the interactive command builder shown when running `stacktape` with no command.
- `prompt/` — the one prompt router: TUI footer prompt / inline `prompts` package / non-interactive
  auto-answer-or-error.
- `ui/` — shared Solid toolkit: brand palette + light/dark themes, context helper, small primitives.
- `spinner.ts` — inline spinners for commands without a mounted TUI; agent-style line output in non-tty
  modes is derived from the output mode by the facade.

## Invariants

1. **Scrollback is written exactly once.** Top-level events stream to scrollback on FINISH; the footer
   live area shows only `running` events. There is no exit re-render — whatever is in scrollback when the
   renderer tears down _is_ the output. Event output sits on the correct side of the append/re-render
   seam: in phase mode it is incidental, so it buffers on the event and renders inside the event's block
   ONLY when the event fails — the log is a failure diagnostic, invisible on success; in simple mode
   (script:run) the output IS the content and streams shell-style as it arrives. Never stream something
   that will also be re-rendered later. The
   plain exit summary (`progress/exit-summary.ts`) runs only in plain mode or when the renderer never
   mounted.
2. **All mounts and teardowns go through `TtyRuntime`.** Never store renderer handles or destroy flags
   elsewhere. On teardown the facade rejects pending prompts (`PromptSink.rejectPending`) — otherwise
   awaiting commands hang.
3. **The footer has fixed geometry.** The footer is a rounded frame (`stacktape / <verb>` in the top
   border) — phase mode is always exactly 13 rows, simple mode 9, with reserved row ownership
   (border / identity+clock / rail / body / status strip / hints / border) in every state — running,
   prompt, cancel confirm, rollback, complete. Never insert or remove rows, never use a scrollbox in the
   footer, never let the layout engine wrap a footer row (wrapMode="none" + truncation), and keep all
   timers fixed-width (`formatClock`, hh:mm:ss). The session clock pauses while a prompt is open
   (`inputPausedMs`/`inputPausedSince` + `sessionElapsedMs` — user input is not deployment time; the
   receipt total uses the same helper). Only the clock, spinners, counters, bar fill and resource
   slot contents may change between ticks — `dashboard.test.tsx` has frame-diff tests enforcing this.
4. **One glyph vocabulary.** Every glyph comes from `ui/glyphs.ts` (verified single-cell across Windows
   Terminal / macOS / Linux; ASCII `i`/`!` for info/warn to avoid emoji-style rendering). The scrollback is
   a document with a fixed grammar: 2-cell icon gutter, right-aligned duration rail, `├`/`└` children,
   `│` output gutter, `▌ VERB` command blocks, titled-rule phase dividers, and the deployment receipt
   (`── stacktape ── ✓ DEPLOYED …`) as the closing signature block. The document measure is capped at 100
   cells. Error blocks wrap semantically via `wrapText` — never rely on terminal auto-wrap inside a block.
5. **Never render `description` and `finalMessage` together.** A finished row shows its one normalized
   outcome message; a running row shows its subject (+ live detail). CF progress percent comes from real
   resource counts (`resolveCfPercent`) — never show a bare percentage without a known denominator, and
   never present resource progress as overall deploy progress.
6. **Spinners under a mounted TUI route through the spinner message sink** (silent while running, final
   line → scrollback). Inline `\r` animation under capture-stdout would spam scrollback.
7. **Theme is reactive via `createStore`** — read `theme.x` / `messageColors[type]` directly; never
   destructure-and-cache. Brand tokens live in `ui/theme.tsx` (`brand`); the launcher shares them.
8. **JSONL wire shapes (`output/jsonl-types.ts`) are a contract** consumed by agents/CI — change them
   deliberately, never as a refactor side effect.
9. `forceFullRenders` in `runtime/opentui.ts` relies on renderer internals (`lib.render(ptr, true)`) to
   keep OSC-8 hyperlinks clickable — re-verify on any OpenTUI version bump.

## Testing

```sh
bun test src/app/tui-manager
```

Views are covered with `@opentui/core/testing`'s `testRender` (Solid transform comes from the bunfig test
preload). Footer pinning, resize, light-theme switching and notifications cannot be verified by these
tests — check them interactively in a real terminal (`bun dev deploy …`, `bun dev dev …`) after changing
renderer or lifecycle behavior.
