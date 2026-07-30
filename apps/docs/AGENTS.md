# Stacktape documentation

This is the public Astro documentation application. Its UI is intentionally still a minimal v4 shell.

## Canonical documentation data

- `content/**/*.mdx` contains the 194 canonical narrative/reference pages migrated from v3.
- `.resources.json` contains the resource metadata used to render referenceable parameters.
- These files are also inputs to the CLI's shipped LLM documentation corpus.
- Images, the old documentation UI, and other legacy site assets were deliberately not imported with this data.
- `content/**` is intentionally excluded from Oxfmt. MDX pages contain template-string code examples whose
  whitespace is meaningful, and the formatter can rewrite that embedded source. Preserve authored formatting and
  make deliberate edits only.

The CLI owns the single current generator because it is the only code consumer. It reads this application as data;
`apps/docs` does not import CLI implementation. Do not edit `apps/cli/@generated/llm-docs` directly or create a
page-specific patcher. Update the canonical MDX/resource data and run the ordinary Turbo generation path.

`aws:call` documentation must match the runtime allowlist in
`apps/cli/src/domain/debug-services/aws-read-only-operations.ts`: exact service/operation pairs, required deployed
stack, debug-role preference with caller-credential fallback, and stack defaults as the only reason project/stage may
be omitted.

## Checks

```sh
pnpm --filter @stacktape/docs run typecheck
pnpm --filter @stacktape/docs run build
pnpm exec turbo run generate:llm-docs --filter @stacktape/cli
pnpm --filter @stacktape/cli run test:llm-docs
```
