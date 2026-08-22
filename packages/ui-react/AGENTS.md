# @stacktape/ui-react maintainer guide

This package owns reusable React UI, not a second application. Keep its exports explicit and its components
router-neutral. React consumers import the compiled subpath they need and import `@stacktape/ui-react/styles.css` once;
feature styles with large lazy dependencies may ship a separate stylesheet beside that feature.

## Current boundaries

- Each public component owns one top-level folder (`src/tabs/Tabs.tsx`, not `src/tabs.tsx`). Keep tests and small
  component-specific helpers beside it. There is no root barrel; every public entry point is an explicit package
  subpath.
- Reusable primitives currently include buttons and links, form controls, tabs, badges, dialog, tooltip, alerts,
  determinate progress, linear/section loaders, and responsive grid lists. Application wrappers may translate old prop
  names or add form-library/router behavior, but must not duplicate the primitive's DOM, focus, or interaction
  implementation.
- `resource-icon` owns the product-wide resource-to-icon/category/diagram mapping. `framework-icon` owns reusable
  framework artwork. The isometric diagram consumes the same catalog through its heavy, private isopack resolver; do not
  put product icon meaning back under `isometric-diagram` or reproduce the mapping in an application.
- `config-editor` is the reusable editor frame: view navigation, panels, overlays, fullscreen layout, and shared
  document state. A host controller supplies compilation, persistence, pricing, Monaco language behavior, and actions.
- `isometric-diagram` is an independent component that accepts a parsed `StacktapeConfig`. It does not belong to or
  import ConfigEditor. Keep its icon-heavy entry point lazy in applications.
- `monaco-editor` is the small lifecycle-safe base for Monaco models and editor instances. It has no Stacktape language
  services or toolbar. Console adds those in `components/StacktapeEditor`.

Do not move a private API call, router, global store, account context, or navigation behavior into this package. Give an
application a thin adapter when those concerns must surround shared presentation. Conversely, do not rebuild shared
keyboard, focus, loading, or semantic behavior in an application wrapper.

## Styling

Components use stable `stp-ui-*` classes inside the `stacktape-ui` cascade layer and design-token variables. Accept
ordinary `className` and `style`; do not expose Emotion `Css`, Tailwind configuration, or a router type. Consumers may
attach Emotion's `css` prop because it compiles to `className`, without making Emotion part of this package's API.
Astro/Tailwind consumers import the same stylesheet and may map the underlying `--stp-*` tokens into Tailwind. Shared
components therefore use ordinary CSS and CSS variables—not Emotion, Tailwind utilities, or styled-component APIs.

Run:

```sh
pnpm --filter @stacktape/ui-react run typecheck
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run build
```

For non-obvious editor synchronization rules, read `src/config-editor/AGENTS.md`. For the diagram's semantic and visual
invariants, read `src/isometric-diagram/AGENTS.md`.
