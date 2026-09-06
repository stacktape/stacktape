/*
 * The six projects every desk shows, rendered once for the whole build.
 *
 * BUILD TIME ONLY. This reaches for the snippet pipeline (Shiki, the config schema) and the YAML
 * parser; import it from `.astro` frontmatter and pass the result down as props. Importing it from a
 * `.tsx` island would drag all of that into the browser bundle.
 *
 * The projects are the ones the ideal customer actually runs — an early-stage startup or a small
 * agency with developers but no DevOps team: the web app most start with, the serverless API, the
 * containerised API, background jobs, the AI agent, and the full-stack app that shows the depth.
 */
import { parse, stringify } from 'yaml';
import { renderSnippet } from '../../lib/snippets/render';
import type { RenderedCode, RenderedSnippet, SnippetId } from '../../lib/snippets/types';
import { ACME_DIAGRAM_CONFIG } from '../InitWizardRun/acme-config';
import nextjsRaw from '../../lib/snippets/configs/nextjs-postgres.yml?raw';
import lambdaRaw from '../../lib/snippets/configs/lambda-api-dynamodb.yml?raw';
import containerRaw from '../../lib/snippets/configs/container-api-redis.yml?raw';
import workerRaw from '../../lib/snippets/configs/worker-sqs.yml?raw';
import agentRaw from '../../lib/snippets/configs/ai-agent.yml?raw';

export type DeskProjectId = 'nextjs' | 'fullstack' | 'serverless' | 'container' | 'worker' | 'agent';

export type DeskProject = {
  id: DeskProjectId;
  label: string;
  /** One line naming what the config deploys. Never a product claim. */
  summary: string;
  yaml: RenderedCode;
  typescript: RenderedCode | null;
  /** The parsed configuration the diagram draws. Crosses the island boundary as JSON. */
  config: unknown;
  /** Top-level resource names, so a page can link a line in the file to its node in the picture. */
  resources: string[];
};

const DEFAULT_ORDER: DeskProjectId[] = ['nextjs', 'fullstack', 'serverless', 'container', 'worker', 'agent'];

const resourceNames = (config: unknown): string[] => {
  const resources = (config as { resources?: Record<string, unknown> } | null)?.resources;
  return resources ? Object.keys(resources) : [];
};

let cached: Promise<Map<DeskProjectId, DeskProject>> | undefined;

/** The desk's panes are narrow; Prettier wraps the TypeScript twin to fit them. */
const TYPESCRIPT_PRINT_WIDTH = 60;

const build = async (): Promise<Map<DeskProjectId, DeskProject>> => {
  // Every config goes through the snippet pipeline here rather than through the shared catalogue,
  // because the desk wants the TypeScript twin wrapped for its own pane width. The `id` is nominal —
  // the pipeline only uses it as a key — and must be one of the catalogue's ids.
  const render = (id: SnippetId, label: string, yaml: string): Promise<RenderedSnippet> =>
    renderSnippet({ id, label, summary: label, yaml, typescriptPrintWidth: TYPESCRIPT_PRINT_WIDTH });
  const [nextjs, lambda, container, worker, agent, acme] = await Promise.all([
    render('nextjs-postgres', 'Next.js + Postgres', nextjsRaw),
    render('lambda-api-dynamodb', 'Serverless API', lambdaRaw),
    render('container-api-redis', 'Container API', containerRaw),
    render('worker-sqs', 'Background jobs', workerRaw),
    render('ai-agent', 'AI agent', agentRaw),
    // The acme project is the six-resource story every other surface tells; it has no snippet file.
    render('nextjs-postgres', 'Full-stack app', stringify(ACME_DIAGRAM_CONFIG).trimEnd())
  ]);

  const make = (
    id: DeskProjectId,
    label: string,
    summary: string,
    rendered: RenderedSnippet,
    config: unknown
  ): DeskProject => ({
    id,
    label,
    summary,
    yaml: rendered.yaml,
    typescript: rendered.typescript,
    config,
    resources: resourceNames(config)
  });

  const projects: DeskProject[] = [
    make(
      'nextjs',
      'Next.js + Postgres',
      'A Next.js app on its own domain and the Postgres database it connects to.',
      nextjs,
      parse(nextjsRaw)
    ),
    make(
      'fullstack',
      'Full-stack app',
      'A Next.js web, a Fargate API, a Lambda worker, Postgres, Redis and a firewall, in one VPC.',
      acme,
      ACME_DIAGRAM_CONFIG
    ),
    make(
      'serverless',
      'Serverless API',
      'An HTTP API on Lambda functions with a DynamoDB table behind it.',
      lambda,
      parse(lambdaRaw)
    ),
    make(
      'container',
      'Container API',
      'A Docker service on Fargate with a Redis cache next to it.',
      container,
      parse(containerRaw)
    ),
    make('worker', 'Background jobs', 'An SQS queue and the Lambda function that drains it.', worker, parse(workerRaw)),
    make(
      'agent',
      'AI agent',
      'A Bedrock AgentCore runtime with a DynamoDB table for its conversations.',
      agent,
      parse(agentRaw)
    )
  ];
  return new Map(projects.map((project) => [project.id, project]));
};

/** The projects in the order a page wants them. The first one is what the page opens on. */
export const loadDeskProjects = async (order: DeskProjectId[] = DEFAULT_ORDER): Promise<DeskProject[]> => {
  cached ??= build();
  const map = await cached;
  return order.map((id) => {
    const project = map.get(id);
    if (!project) throw new Error(`Unknown desk project "${id}".`);
    return project;
  });
};

/** What the diagram island needs: every config and label by id. */
export const deskDiagramProps = (projects: DeskProject[]) => ({
  configs: Object.fromEntries(projects.map((project) => [project.id, project.config])),
  labels: Object.fromEntries(projects.map((project) => [project.id, project.label]))
});
