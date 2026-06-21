Verify that claims are grounded in the provided sources.

Use source priority:
1. `types/stacktape-config/*.d.ts` and runtime validators in `src/domain/**`.
2. `@generated/schemas/config-schema.json`.
3. `@generated/llm-docs/*.md`.
4. `docs/_curated-docs/**`.
5. CLI source in `src/commands/**/index.ts`.
6. `console-app/src/**` and `console-app/server/**`.

For high and medium issues, include evidence with the exact source path and a quote when possible. Do not raise a high factual issue without evidence unless the draft itself contains an obviously broken MDX/component pattern.
