# Config Editor

This folder owns the editor frame: view tabs, the active panel, header actions, overlays and fullscreen layout. The init
wizard's review step is its host and owns everything inside the panels, including Monaco, parsing and actions.

`IsometricDiagram` is a sibling feature, not part of the frame. A host can render it in a panel, but this folder must
not import it.

Keep the frame router-neutral and styling-system-neutral: no host state, tRPC, Emotion or private API types.
