import { fileURLToPath } from 'node:url';

/**
 * Every artifact this application consumes from `apps/cli`, named in one place.
 *
 * The CLI owns the deterministic generators; `apps/docs` reads their reviewed output as data and
 * never imports CLI implementation. Turbo makes the dependency explicit (see the
 * `@stacktape/docs#build` / `#typecheck` entries in the root `turbo.json`), so no human has to
 * remember a generation step — but a missing artifact must still fail the build loudly rather than
 * fall back to a published package or the network.
 */

const fromRepoRoot = (relativePath: string) => fileURLToPath(new URL(`../../../../${relativePath}`, import.meta.url));

export const REPO_ROOT = fromRepoRoot('');

/**
 * Normalized API reference — definitions, properties, union branches, defaults, descriptions and
 * rendered type declarations. Produced by `apps/cli`'s `generate`, which is the single
 * owner of that normalization and renders the very same data into the LLM corpus.
 */
export const CLI_API_REFERENCE_DATA = fromRepoRoot('apps/cli/@generated/schemas/api-reference-data.json');

/** Deterministic LLM documentation corpus. Produced by `apps/cli`'s `generate`. */
export const CLI_LLM_DOCS_DIR = fromRepoRoot('apps/cli/@generated/llm-docs');

/**
 * `stacktape` package type declarations. Produced by `apps/cli`'s `generate:monaco`, which is the
 * same artifact the Console's Monaco editor loads — so the documentation code samples type-check
 * against the declarations this checkout would publish, not against a released npm version.
 */
export const CLI_STACKTAPE_DECLARATIONS_DIR = fromRepoRoot('apps/cli/.generated/monaco-declarations');

/** Discovery files served verbatim at the site root. */
export const LLM_DISCOVERY_FILES = ['llms.txt', 'llms-full.txt', 'llms-api-reference.txt'] as const;

export const generatorHint = (turboTask: string) =>
  `Run \`pnpm exec turbo run ${turboTask} --filter @stacktape/cli\` (ordinary docs builds get this through Turbo).`;
