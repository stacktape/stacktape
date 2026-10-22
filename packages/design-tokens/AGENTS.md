# @stacktape/design-tokens maintainer guide

This package is the styling-system-neutral source of truth shared by Console (Emotion), Docs/Website (Astro + Tailwind),
`@stacktape/ui-react` (plain CSS), and the planned React init wizard.

- Put a value here only when multiple product surfaces must mean the same thing: semantic surfaces, text, borders,
  interaction/status/AWS-category colours, shared radii, focus, motion, and the spacing, type and dialog-width scale
  that Console pages and `@stacktape/ui-react` share. Other app-only layout values remain in the app.
- The scale is closed. Console page code may not use a literal font size, gap, padding or border radius
  (`scripts/quality/ast-grep/rules/console-page-scale.yml`); add a stop here only when a design needs it everywhere.
- `src/tokens.ts` owns both raw typed values and typed `var(--stp-*)` references. The committed `generated/tokens.css`
  is emitted deterministically from it; never hand-edit generated CSS.
- Keep the package independent of React, Emotion, Astro and Tailwind. Each consumer maps the same CSS variables into its
  own styling system; do not add framework-specific adapter packages.
- Changing a token is a cross-application visual change. Check at least one Emotion consumer and one Astro/Tailwind
  consumer, then run the generator freshness checks.
- `interactive.*` colours belong to emphasized actions and selected states. Generic input/select focus stays neutral and
  uses `field.*`; do not infer a focus colour from a token named `primary` or from the brand colour.

Run:

```sh
pnpm --filter @stacktape/design-tokens run generate:check
pnpm --filter @stacktape/design-tokens run typecheck
pnpm --filter @stacktape/design-tokens run test
```
