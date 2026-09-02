/*
 * The snippet catalog — the public entry point of the build-time snippet pipeline.
 *
 * BUILD TIME ONLY. This module reaches for `node:fs`, the 3.5 MB Stacktape config schema and Shiki.
 * Import it from `.astro` frontmatter and pass the result down as props; importing it from a `.tsx`
 * island would drag all of that into the browser bundle.
 *
 * Story convention: the whole homepage follows one fictional project, `acme-project`, whose
 * production stage holds `web`, `apiService`, `worker`, `mainDatabase`, `cache` and `firewall`.
 * `nextjs-postgres` is the canonical config and uses those exact names; the other tabs are separate
 * use cases and name their resources naturally.
 */
import { renderSnippet } from './render';
import type { RenderedSnippet, SnippetId } from './types';

type SnippetDefinition = {
  id: SnippetId;
  label: string;
  summary: string;
  /** Basename inside `./configs`. */
  file: string;
};

/**
 * Tab order. The first entry is what a visitor sees before touching anything, so it is the config
 * the rest of the page keeps referring to.
 */
const SNIPPET_DEFINITIONS: readonly SnippetDefinition[] = [
  {
    id: 'nextjs-postgres',
    label: 'Next.js + Postgres',
    summary: 'A Next.js app and the Postgres database it connects to.',
    file: 'nextjs-postgres.yml'
  },
  {
    id: 'lambda-api-dynamodb',
    label: 'Lambda API',
    summary: 'An HTTP API backed by Lambda functions and a DynamoDB table.',
    file: 'lambda-api-dynamodb.yml'
  },
  {
    id: 'container-api-redis',
    label: 'Container API',
    summary: 'A containerized service on Fargate with a Redis cache.',
    file: 'container-api-redis.yml'
  },
  {
    id: 'ai-agent',
    label: 'AI agent',
    summary: 'A Bedrock AgentCore runtime with a table for its conversations.',
    file: 'ai-agent.yml'
  },
  {
    id: 'worker-sqs',
    label: 'Queue worker',
    summary: 'An SQS queue and the function that drains it.',
    file: 'worker-sqs.yml'
  }
];

/**
 * The `.yml` sources, read through Vite rather than `fs`.
 *
 * `import.meta.glob` keeps the configs as first-class source files: editing one invalidates the
 * module in dev and re-renders the page, which `readFile` would not do. Eager, because the catalog
 * is five short files and the pipeline is synchronous from here on.
 */
const CONFIG_SOURCES = import.meta.glob<string>('./configs/*.yml', { query: '?raw', import: 'default', eager: true });

const readConfig = (file: string): string => {
  const source = CONFIG_SOURCES[`./configs/${file}`];
  if (source === undefined) {
    throw new Error(`Snippet config "${file}" is missing from src/lib/snippets/configs.`);
  }
  return source;
};

/** Rendering is memoised per process: a build renders each snippet once, not once per page. */
let renderedPromise: Promise<RenderedSnippet[]> | undefined;

/** Every snippet, in tab order. */
export const getSnippets = (): Promise<RenderedSnippet[]> => {
  renderedPromise ??= Promise.all(
    SNIPPET_DEFINITIONS.map(({ id, label, summary, file }) =>
      renderSnippet({ id, label, summary, yaml: readConfig(file) })
    )
  );
  return renderedPromise;
};

/** One snippet by id. Throws rather than returning `undefined`: a typo here is a build-time bug. */
export const getSnippet = async (id: SnippetId): Promise<RenderedSnippet> => {
  const snippet = (await getSnippets()).find((candidate) => candidate.id === id);
  if (!snippet) throw new Error(`Unknown snippet id "${id}".`);
  return snippet;
};
