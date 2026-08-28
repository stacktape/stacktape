# CLI presentation layer

All terminal effects go through the `tuiManager` facade in `index.ts`. Application and domain code report semantic
progress through `operation-manager`; they must not import OpenTUI, mutate presenter state or write terminal control
sequences.

## Output model

`output/mode.ts` selects:

- `tty`: a primary-screen stream or alternate-screen dashboard, switchable with Ctrl+T;
- `plain`: line-oriented output suitable for CI and redirected terminals;
- `jsonl`: machine-readable records; `JsonlStdioGuard` wraps stray stdout/stderr writes so the stream stays valid.

Every mode also writes records to the log collector through `OutputRouter`. `commandUi` in `src/index.ts` makes the UI
choice exhaustive for every command. JSONL shapes in `output/jsonl-types.ts` are a public automation contract.

## Canonical operation model

`operation-manager` owns an append-only journal and a reducer-backed state store. Stable activity IDs are allocated by
the reporter. Presentation is a projection of those records and never a source of truth.

```text
command/domain -> OperationReporter -> OperationJournal -> OperationStore
                                         |                    |
                                         +-> output router     +-> dashboard
                                         +-> stream presenter
```

The stream presenter owns the primary screen. It writes completed work and subprocess output durably, and repaints only
a small bounded block of running activities. The dashboard owns the alternate screen. `PresentationController` is the
only component allowed to transfer terminal ownership between them. Its replay cursor prevents both lost and duplicate
records during Ctrl+T transitions.

In `auto` mode initialization, packaging, upload and post-deploy use the stream; the deploy phase uses the dashboard.
`--ui stream` and `--ui dashboard` pin one view for the whole command. A manual Ctrl+T also pins the selected view for
the rest of that command.

## Prompts and subprocesses

Prompt callbacks and cancellation functions live in `interaction/coordinator.ts`, outside serializable operation state.
Dashboard text/password prompts use OpenTUI's native input control; selection prompts use its native select control.
Prompts opened from the stream temporarily switch to the dashboard modal so OpenTUI has exclusive terminal ownership;
the stream and its durable history are restored after the answer. Password answers are never written to the journal.
Sensitive defaults also stay in the interaction coordinator, and `SecureInputRenderable` blanks the native editor's
render buffer—hiding plaintext with foreground color alone still leaks it into raw terminal output.

Child standard I/O modes are explicit:

- `capture`: stdout/stderr become operation output; stdin is not inherited;
- `inherit`: the UI releases the terminal to the child and restores itself afterward;
- `ignore`: no child standard I/O is shown.

Never let a presenter and a child process read raw stdin simultaneously.

## Non-obvious constraints

- Set `OTUI_USE_CONSOLE=false` before importing OpenTUI. `runtime/opentui.ts` also disables its debug console overlay.
- Only one `TtyRuntime` may own a terminal at a time.
- Strip ANSI/OSC control sequences at the operation boundary; OpenTUI otherwise counts them as visible cells.
- Use native OpenTUI input/select controls. Do not rebuild text editing, paste or cursor behavior from key events.
- Use the shared, ref-counted spinner clock. Recreated row components freeze per-instance timers.
- Use glyphs from `ui/glyphs.ts`; they are checked as single terminal cells across supported terminals.
- Read reactive theme values directly. Do not destructure and cache them.
- OpenTUI 0.4.5 uses sibling `<text fg>` elements rather than `<span fg>`.
- `forceFullRenders` relies on a renderer internal to preserve clickable OSC-8 links. Recheck it on OpenTUI upgrades.
- CloudFormation percentages require a known resource count. Do not present resource progress as overall deployment
  progress.
- The session clock pauses for prompts; summaries use the same elapsed-time helper.

## Main directories

- `operation-manager`: renderer-neutral journal, reducer, store and reporter.
- `output`: headless routing, records and sinks; no OpenTUI imports.
- `format`: pure text, blocks and errors.
- `runtime`: renderer lifecycle and presentation ownership.
- `progress`: stream and dashboard projections.
- `dev`: separate long-lived full-screen dashboard with overview and log tabs.
- `prompt` and `interaction`: prompt routing and non-serializable callbacks.
- `launcher`: interactive command builder shown with no command.
- `ui`: shared Solid primitives, theme and glyphs.

## Validate changes

```sh
bun scripts/tui-demo.ts deploy 1
bun scripts/tui-preview.ts
bun test src/app/operation-manager src/app/tui-manager --isolate
```

Headless tests cover reducer semantics, replay, prompt controls and narrow layouts. The demo is the real-terminal gate
for mode switching, resize behavior, cursor restoration, interactive children, hyperlinks and themes.
