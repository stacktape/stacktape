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

## How the tty progress app works

Mental model: the terminal is split in two. The bottom N rows are a **pinned footer** (an OpenTUI
split-footer app, re-rendered at 60fps) showing only what is _currently happening_. Everything that is
_finished_ is written **once** into real terminal scrollback above it and never touched again — after the
run, the scrollback reads as a complete, well-typeset document of what happened. All flicker/jump bugs in
past iterations came from violating that split, which is why invariant 1 exists.

Data flow for a deploy-style command:

```
command code                    tuiManager facade (index.ts)
  showCommandHeader(...)   ──►  header → TuiState + scrollback 'header' item
  start({phases:'deploy'}) ──►  TtyRuntime.mount(ProgressDashboard, footerHeight 13|9)
  setPhase/startEvent/
  updateEvent/finishEvent/ ──►  TuiStateSink (progress/sink.ts)
  appendEventOutput                 │
                                    ├─► TuiState (progress/state.ts, pub/sub store)
                                    │     └─► Solid views subscribe via createTuiSignal
                                    │         (progress/views/*, footer only)
                                    └─► scrollbackFeed (progress/feed.ts)
                                          └─► scrollback-consumer renders each item with
                                              ScrollbackItemView (scrollback-items.tsx) and
                                              writes the text above the footer, once
  promptConfirm/Select/... ──►  PromptSink → state.activePrompt → PromptBlock replaces the
                                footer body rows; resolve/clear on answer (Esc rejects with
                                UserCancelledError; a 'prompt-answer' item records the answer)
  setPendingCompletion +
  commitPendingCompletion  ──►  summary in state (footer shows ✓ DEPLOYED banner)
  stop()                   ──►  emitFinalScrollback (receipt / error block) → brief hold →
                                TtyRuntime.unmount → footer disappears, document remains
```

Key pieces:

- **`TuiState`** (`progress/state.ts` + `types.ts`) is a plain pub/sub store — phases, an event tree
  (top-level events with children keyed by `eventId` = eventType + instanceId), header, activePrompt,
  cancelDeployment, summary, prompt-pause bookkeeping. Solid views bridge to it with
  `createTuiSignal(selector)` (`views/signals.ts`). Notifications are batched; tests call
  `tuiState.flushPendingNotifications()`.
- **`TuiStateSink`** (`progress/sink.ts`) is the write path. It decides what is footer state vs a
  scrollback item: events emit their scrollback block when they FINISH (children render inside the
  parent's block); phase headers are emitted lazily on first content. Output routing follows
  `showPhaseHeaders`: phase mode buffers event output (cap 200 lines) and renders it only on failure;
  simple mode (script:run) streams it shell-style with `[source]` prefixes when concurrent.
- **The footer** (`progress/views/dashboard.tsx`) is a rounded frame with `stacktape / <verb>` in the top
  border. Fixed rows: border / identity+clock / phase rail (spinner on active phase) / blank / 6-row body
  / status strip / hints / border (13 total; simple mode drops the rail block → 9). The body swaps between
  `LivePanel` (running events; CF panel with progress bar + 3 stable resource rows), `PromptBlock`,
  `CancelConfirm` and `CompleteBanner` — always inside the same reserved rows.
- **CF progress** arrives via `updateEvent({detail: {kind:'cloudformation-progress', ...}})` emitted by
  `cloudformation-stack-manager`; `live-panel.tsx` extracts it (`CfProgressData`, incl. per-resource
  `inProgressDetails`). This shape is part of the JSONL contract (invariant 8).
- **Cancel**: commands register `setCancelDeployment({onCancel})`; the footer offers `c` → inline
  confirm → `onCancel()`; `updateCancelDeployment({isCancelling})` drives the rollback status strip.
- **The session clock** pauses while a prompt is open (`inputPausedSince`/`inputPausedMs`,
  `sessionElapsedMs()` in `progress/types.ts`); the receipt total and plain exit summary use the same
  helper.
- **`stacktape dev`** (`dev/`) is a separate always-mounted dashboard app (`devTuiManager`) with its own
  state/feed/views, sharing `TtyRuntime`, the theme and glyphs. The **launcher** (`launcher/`) is the
  no-command interactive builder.

## Working on it — harnesses

- `bun scripts/tui-demo.ts <deploy|fail|cancel|prompts|script|dev> [speed]` — drives the real
  presentation layer with synthetic data in a real terminal (speed 2 = 2× slower). This is the primary
  way to _feel_ the UI; no AWS involved.
- `bun scripts/tui-preview.ts` — headless frame renderer (`scripts/support/tui-preview-scenes.tsx` +
  `testRender`/`captureCharFrame`): prints every footer state and scrollback item as text frames. Use it
  to "see" the TUI from a non-TTY context and to eyeball diffs after view changes.
- `bun test src/app/tui-manager` — includes frame-diff stability tests (dashboard.test.tsx) that fail if
  a CF tick repaints rows it shouldn't or the footer changes height.

Gotchas that will bite you:

- OpenTUI's renderer registers global `uncaughtException`/`unhandledRejection` handlers; its
  `openConsoleOnError` option defaults to **true** and pops a debug console overlay into the footer —
  `runtime/opentui.ts` disables it. Similarly `OTUI_USE_CONSOLE=false` must be set before any `@opentui`
  import (done there; never import `@opentui/*` elsewhere except type-only).
- Rows that re-create on every state tick freeze per-instance spinner intervals — spinners share one
  refcounted module clock (`ui/spinner.tsx`) and lists of live rows use positional `<Index>`, not `<For>`.
- `<span fg>` does not exist in OpenTUI 0.4.5 — use sibling `<text fg>` elements (+ `<b>`).
- On Windows, Bun's bundling lanes are broken with pnpm symlinks; the demo/preview/tests all run
  unbundled (runtime Solid transform via `scripts/support/opentui-loader`).

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
