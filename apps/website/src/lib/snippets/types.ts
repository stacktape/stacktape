/*
 * The shape of a rendered snippet.
 *
 * Types only, and deliberately in their own module: the pipeline that produces these values pulls
 * in Shiki, the config schema and `node:fs`, none of which may reach the browser. A React island
 * can `import type` from here and stay clean.
 */

/** Ids are part of the public API — sections address a snippet by id, never by index. */
export type SnippetId = 'nextjs-postgres' | 'lambda-api-dynamodb' | 'container-api-redis' | 'ai-agent' | 'worker-sqs';

export type RenderedCode = {
  /** Shiki output, ready for `set:html` / `dangerouslySetInnerHTML`. */
  html: string;
  /** Line count, so a caller can render a gutter without parsing the HTML back. */
  lineCount: number;
};

export type RenderedSnippet = {
  id: SnippetId;
  /** Tab label. */
  label: string;
  /** One line naming what the config actually deploys — never a product claim. */
  summary: string;
  yaml: RenderedCode;
  /** `null` when the converter rejects the source; the editor then hides its TypeScript toggle. */
  typescript: RenderedCode | null;
  /** How many keys carry schema documentation, for an "N documented keys" affordance. */
  hoverCount: number;
};
