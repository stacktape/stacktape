# CLI presentation layer

All terminal effects go through the `tuiManager` facade in `index.ts`. Application code may import pure formatters,
output types, the dev manager or launcher directly, but must not write progress state or renderer internals.

## Output model

`output/mode.ts` selects:

- `tty`: OpenTUI renders a fixed footer while completed work enters terminal scrollback;
- `plain`: line-oriented output suitable for CI and redirected terminals;
- `jsonl`: machine-readable records; `JsonlStdioGuard` wraps stray stdout/stderr writes so the stream stays valid.

Every mode also writes records to the log collector through `OutputRouter`. `commandUi` in `src/index.ts` makes the UI
choice exhaustive for every command. JSONL shapes in `output/jsonl-types.ts` are a public automation contract.

## TTY mental model

The footer shows only current work. A finished event is rendered once into real scrollback and is never repainted.

```text
command -> tuiManager -> TuiStateSink -> TuiState -> footer views
                              |
                              +-> scrollback feed -> render completed item once
```

`progress/state.ts` is a plain pub/sub store. `progress/sink.ts` decides whether an update belongs in live state or
scrollback. Phase mode buffers event output and shows it on failure; simple mode streams command output as it arrives.
Never stream content that another path will render again.

`runtime/lifecycle.ts` is the only renderer lifecycle (`idle -> starting -> active -> stopping`) for both progress and
dev dashboards. All mount and teardown paths go through it. Teardown must reject pending prompts or the calling command
will hang.

The phase footer is always 13 rows; simple mode is always 9. Running, prompt, cancellation and completion views reuse
those rows. Do not add wrapping or variable-height content. Only clocks, spinners, counters, progress fill and slot
content should change during a tick.

## Non-obvious constraints

- Set `OTUI_USE_CONSOLE=false` before importing OpenTUI. `runtime/opentui.ts` also disables its debug console overlay.
- Use the shared, ref-counted spinner clock. Recreated row components freeze per-instance timers.
- Use glyphs from `ui/glyphs.ts`; they are checked as single terminal cells across supported terminals.
- Read reactive theme values directly. Do not destructure and cache them.
- OpenTUI 0.4.5 uses sibling `<text fg>` elements rather than `<span fg>`.
- `forceFullRenders` relies on a renderer internal to preserve clickable OSC-8 links. Recheck it on OpenTUI upgrades.
- CloudFormation percentages require a known resource count. Do not present resource progress as overall deployment
  progress.
- The session clock pauses for prompts; summaries use the same elapsed-time helper.

## Main directories

- `output`: headless routing, records and sinks; no OpenTUI imports.
- `format`: pure text, blocks and errors.
- `runtime`: renderer and lifecycle ownership.
- `progress`: deploy-style state, feed and views.
- `dev`: separate long-lived dashboard using the same lifecycle.
- `prompt`: routes footer, inline and non-interactive prompts.
- `launcher`: interactive command builder shown with no command.
- `ui`: shared Solid primitives, theme and glyphs.

## Validate changes

```sh
bun scripts/tui-demo.ts deploy 1
bun scripts/tui-preview.ts
bun test src/app/tui-manager
```

The demo is the primary real-terminal check. The preview prints headless frames. Tests cover stable footer geometry and
scrollback behavior; they cannot prove terminal resize, hyperlinks or theme behavior, so check those interactively after
renderer or lifecycle changes.
