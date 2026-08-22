# Config Editor

This folder owns the reusable editor frame and the small pieces of state that every host needs. It does not own a
complete Stacktape editing workflow.

The main boundary is intentional:

- `ConfigEditor` renders view tabs, the active panel, actions, overlays and fullscreen layout.
- The host owns Monaco language services, parsing, compilation, pricing, persistence and product actions. Console's host
  is `apps/console/ui/src/components/ConfigEditor/ConsoleConfigEditor.tsx`.
- `IsometricDiagram` is a sibling feature, not part of Config Editor. A host can render it in a panel, but this folder
  must not import it.

`useConfigDocument` is not a normal controlled-input hook. Monaco updates its local value immediately while a save can
remain in flight. `markPendingSave` records the submitted snapshot so a later host acknowledgement cannot overwrite
newer edits. Preserve this behavior when changing synchronization.

TypeScript configs are executable programs. Browser code may edit them, but it must not execute them or pass them
through YAML-only analysis. `getConfigEditorCapabilities` is the shared gate for that distinction.

Keep this package router-neutral and styling-system-neutral. Add shared behavior here only when another host can use it
without importing Console state, tRPC, Emotion or a private API type.
