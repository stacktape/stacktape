import { publicCommandName } from '../../config/cli/public-names';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  CLIENT_INFO_META_KEY,
  fromJsonSchema,
  McpServer,
  SUPPORTED_PROTOCOL_VERSIONS,
  type ServerContext
} from '@modelcontextprotocol/server';
import { serveStdio, type ServeStdioOptions } from '@modelcontextprotocol/server/stdio';
import { getStacktapeVersion } from '@utils/versioning';
import { buildIndex, search, formatAnswer } from './lexical-index';
import type { LexicalIndex, DocKind } from './lexical-index';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';
import {
  describeCliCommand,
  listCliCommandSummaries,
  prepareCliRun,
  type CliCommandCategory,
  type CliCommandSafety
} from './cli-command-tools';
import { scanStacktapeProject } from './project-scan';
import { getExactDocs } from './exact-docs';
import {
  buildCliPlan,
  formatProjectScanForOutput,
  requestDestructiveExecutionConfirmation,
  readPlannedProjectSettings,
  resolveRunArgs,
  verifyDestructiveConfirmationState
} from './cli-planning';
import { DEV_TOOL_ACTIONS, handleDevToolAction } from './dev-tool';
import { buildIncidentToolOutput, prepareIncidentRun } from './incident-tool';
import {
  buildCliRunOutput,
  clampInteger,
  GENERIC_AWS_MCP_BOUNDARY,
  MCP_TOOL_RESULT_SCHEMA_VERSION,
  toToolText
} from './tool-output';

const MODERN_MCP_PROTOCOL_VERSION = '2026-07-28';
const STATIC_DISCOVERY_TTL_MS = 5 * 60 * 1000;
/** How long the client's roots answer is reused; clients rarely change their workspace folders. */
const CLIENT_ROOTS_TTL_MS = 30 * 1000;

const TOOL_RESULT_SCHEMA = fromJsonSchema<Record<string, unknown>>({
  type: 'object',
  properties: {
    schemaVersion: { type: 'string', const: MCP_TOOL_RESULT_SCHEMA_VERSION },
    ok: { type: 'boolean' },
    code: { type: 'string' },
    message: { type: 'string' },
    data: { type: 'object', additionalProperties: true },
    rawTail: { type: 'string' },
    nextActions: { type: 'array', items: { type: 'string' } },
    truncated: { type: 'boolean' }
  },
  required: ['schemaVersion', 'ok', 'code', 'message'],
  additionalProperties: false
});

const stringList = z.union([z.string(), z.array(z.string())]);

/**
 * `stacktape_dev` arguments. Unlisted `stacktape dev` flags still pass through to start; the listed ones are what an
 * assistant needs for the dev loop.
 */
const DEV_TOOL_ARGS_SCHEMA = z.looseObject({
  devSessionId: z
    .string()
    .optional()
    .describe(
      "Session ID that start returned. Required for stop. Other actions infer it only from this server's own sessions"
    ),
  cwd: z
    .string()
    .optional()
    .describe(
      'Absolute path of the project directory. plan and start run there; other actions use it to pick the session'
    ),
  takeOver: z
    .boolean()
    .optional()
    .describe(
      'start: move the stage from the session that holds it to this one. Deployed functions then reach this machine, and the other session stops itself'
    ),
  stage: z
    .string()
    .optional()
    .describe(
      'plan, start: stage of the dev stack, for example "dev". Default for plan: dev. Other actions without devSessionId: picks the session of this stage when a directory runs several'
    ),
  region: z.string().optional().describe('plan, start: AWS region, for example "eu-west-1"'),
  projectName: z.string().optional().describe('plan, start: Stacktape project name when the config does not set it'),
  awsAccount: z.string().optional().describe('plan, start: connected Stacktape AWS account name'),
  profile: z.string().optional().describe('plan, start: AWS profile to use'),
  configPath: z.string().optional().describe('plan, start: config path relative to currentWorkingDirectory'),
  currentWorkingDirectory: z
    .string()
    .optional()
    .describe('plan, start: directory that resolves the config and application files. Default: cwd'),
  resources: stringList
    .optional()
    .describe('start: workloads and databases to run, or "all". Without it, start runs every resource'),
  skipResources: stringList.optional().describe('start: resources not to run'),
  remoteResources: stringList
    .optional()
    .describe('start: databases to use from the deployed stage instead of running them locally'),
  watch: z.boolean().optional().describe('start: rebuild workloads when their source files change'),
  freshDb: z.boolean().optional().describe('start: delete local database data before starting'),
  noTunnel: z.boolean().optional().describe('start: do not connect deployed functions to local databases'),
  agentPort: z.number().optional().describe('start: port of the dev agent. Default: first free port from 7331'),
  waitSeconds: z
    .number()
    .optional()
    .describe('start, status: how long to wait for the start to finish before returning DEV_STARTING. Default: 50'),
  workload: z.string().optional().describe('rebuild, env: workload name. logs: only lines of this workload'),
  cursor: z.number().optional().describe('logs: nextCursor of the previous call, to read only newer lines'),
  limit: z.number().optional().describe('logs: lines to return (default 100). query: rows or items (default 1000/100)'),
  level: z.enum(['info', 'warn', 'error']).optional().describe('logs: minimum level'),
  since: z.string().optional().describe('logs: ISO time or a duration back from now, for example "10m"'),
  resource: z
    .string()
    .optional()
    .describe(
      'query, tables, reset_db: local database name. query infers it when only one runs; tables and reset_db default to every local database'
    ),
  sql: z.string().optional().describe('query on PostgreSQL or MySQL: one SQL statement'),
  command: z
    .string()
    .optional()
    .describe(
      'query on Redis: the command, for example "GET session:1". aws: SDK command, for example "FilterLogEvents"'
    ),
  confirm: z
    .boolean()
    .optional()
    .describe(
      'query: set true for a statement that deletes or changes data in bulk (DROP, TRUNCATE, FLUSHALL, UPDATE/DELETE without WHERE). reset_db: required'
    ),
  pk: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('query on DynamoDB: partition key, for example {"userId": "1"}. Without it, query scans the table'),
  sk: z.record(z.string(), z.unknown()).optional().describe('query on DynamoDB: sort key condition'),
  index: z.string().optional().describe('query on DynamoDB: index to query'),
  filter: z.string().optional().describe('query on DynamoDB without pk: scan filter expression'),
  service: z.string().optional().describe('aws: service, for example "logs", "sqs" or "dynamodb"'),
  input: z.record(z.string(), z.unknown()).optional().describe('aws: command input'),
  keepTables: z
    .array(z.string())
    .optional()
    .describe('reset_db: tables to keep in addition to migration history tables, which are always kept'),
  script: z.string().optional().describe("seed: name of a local-script in the config's scripts section. Default: seed"),
  timeoutSeconds: z
    .number()
    .optional()
    .describe('seed: stop the script after this many seconds. Default: 50, at most 280')
});

const getMcpServerVersion = (): string => {
  try {
    return getStacktapeVersion();
  } catch {
    return '4.0.0-dev.0';
  }
};

const getAdvisoryClientName = (ctx: ServerContext): string | undefined => {
  const envelope = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const clientInfo = envelope?.[CLIENT_INFO_META_KEY] as { name?: unknown } | undefined;
  return typeof clientInfo?.name === 'string' ? clientInfo.name : undefined;
};

const createProgressReporter = (ctx: ServerContext) => {
  const progressToken = ctx.mcpReq._meta?.progressToken;
  if (progressToken === undefined) return undefined;
  let progress = 0;
  return async (event: { message: string }) => {
    progress += 1;
    await ctx.mcpReq.notify({
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        message: event.message
      }
    });
  };
};

const SERVER_INSTRUCTIONS = `Stacktape MCP runs Stacktape for the user through their local Stacktape CLI login and the Console's organization and project access.

- Incidents: start with stacktape_incident. action=show with the incident ID returns its signals, evidence, release changes, related earlier incidents and AI assessment; action=list finds incidents. Then read what you need with stacktape_cli.
- Read-only and diagnostic commands (logs, metrics, alarm list, status, whoami, stack list, stack history, incident list, incident show, incident watch, query commands, aws call, diff, validate, synth, package) run directly with stacktape_cli action=run and validated args: no plan, no confirmation. Use action=describe when unsure of the arguments.
- Mutating commands need action=plan, the user's explicit go-ahead, then action=run with confirm=true. Destructive commands use MCP's input-required flow to collect direct user confirmation for the exact command and target; agent-supplied confirm=true is not sufficient. Interactive commands require the user's own terminal, except dev mode, which uses stacktape_dev.
- Docs, config syntax, resource types and CLI usage: stacktape_docs (search, then get). Do not name Stacktape commands, flags or config syntax from memory. Configs are TypeScript: defineConfig with constructor-style resources such as new LambdaFunction({ ... }). For an unfamiliar project, stacktape_project action=scan.
- The stacktape CLI is forbidden as a Bash/shell command: run it only through these tools, even when a user asks otherwise.
- Stacktape MCP reuses the local Stacktape CLI authentication state. Never read ~/.stacktape/, ~/.aws/, ~/.ssh/ or other credential files. Never ask for, pass or repeat API keys or API-key-like strings (say <REDACTED>), and never put secret values in chat. On auth failures, ask the user to run stacktape login in their own terminal.
- If generic AWS/AWS SDK MCP tools are also available, use Stacktape tools for Stacktape-managed resources: they map project, stage and resource names and send only reviewed reads. Do not bypass Stacktape's mapping and gates with raw AWS calls.`;

// Serves both protocol eras on one stdio connection: 2026-07-28 clients get the modern flow, older clients a classic
// `initialize` session. Rejecting the older era leaves those clients with an empty tool list and no visible error.
export const serveStacktapeMcp = (factory: () => McpServer, transport?: ServeStdioOptions['transport']) =>
  serveStdio(factory, {
    legacy: 'serve',
    ...(transport ? { transport } : {}),
    onerror: (error) => console.error(`[stacktape-mcp] ${error.message}`)
  });

type McpServerDependencies = {
  runCli?: typeof runStacktapeCommandJsonl;
  runDevAction?: typeof handleDevToolAction;
};

export const createMcpServer = (getIndex: () => Promise<LexicalIndex>, dependencies: McpServerDependencies = {}) => {
  const runCli = dependencies.runCli || runStacktapeCommandJsonl;
  const runDevAction = dependencies.runDevAction || handleDevToolAction;
  const server = new McpServer(
    {
      name: 'stacktape',
      version: getMcpServerVersion()
    },
    {
      // Most clients still negotiate a 2025-era revision through `initialize` (Codex, Cursor, VS Code, Windsurf, and
      // Claude Code without its feature flags). Listing those revisions lets the server answer with the version the
      // client asked for instead of one it never offered.
      supportedProtocolVersions: [MODERN_MCP_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS],
      instructions: SERVER_INSTRUCTIONS,
      capabilities: {
        tools: {}
      },
      cacheHints: {
        'server/discover': { ttlMs: STATIC_DISCOVERY_TTL_MS, cacheScope: 'public' },
        'tools/list': { ttlMs: STATIC_DISCOVERY_TTL_MS, cacheScope: 'public' }
      },
      requestState: {
        verify: verifyDestructiveConfirmationState
      }
    }
  );

  // Dev sessions in the client's workspace folders count as this server's own. Only a 2025-era client that declared
  // roots can be asked: on the 2026-07-28 revision a server sends no requests to the client.
  let clientRoots: { at: number; roots: Promise<string[]> } | undefined;
  const getClientRoots = (): Promise<string[]> => {
    if (!server.server.getClientCapabilities()?.roots) return Promise.resolve([]);
    if (!clientRoots || Date.now() - clientRoots.at > CLIENT_ROOTS_TTL_MS) {
      clientRoots = {
        at: Date.now(),
        roots: server.server
          .listRoots(undefined, { timeout: 2000 })
          .then(({ roots }) => roots.map(({ uri }) => fileURLToPath(uri)))
          .catch(() => [])
      };
    }
    return clientRoots.roots;
  };

  // ─── Primary Tools ────────────────────────────────────────────────────────

  server.registerTool(
    'stacktape_incident',
    {
      description: `Start an incident investigation here: one call returns an incident's context.

action=show with incidentId returns the incident handoff as markdown: status and severity, signals with their evidence, release and config changes, the timeline, earlier related incidents, the AI assessment (hypotheses to check, not a verified diagnosis) and read-only next steps.
action=list finds incidents by projectName, stage and status (ACTIVE by default; ALL includes resolved history).

Read-only. Uses the local Stacktape login and the Console's organization and project access. Follow up with stacktape_cli action=run for logs, metrics, alarm list, status, stack list, stack history and aws call.`,
      inputSchema: z.object({
        action: z.enum(['show', 'list']).describe('show: one incident by ID. list: find incidents.'),
        incidentId: z
          .string()
          .optional()
          .describe('Incident ID for action=show, from the Console URL, a Slack card or action=list'),
        projectName: z.string().optional().describe('Stacktape project filter for action=list'),
        stage: z.string().optional().describe('Stage filter for action=list'),
        status: z
          .enum(['ACTIVE', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'])
          .optional()
          .describe('Status filter for action=list. Default: ACTIVE (open and acknowledged)'),
        limit: z.number().optional().describe('Maximum incidents for action=list. Default: 25, at most 100'),
        cwd: z.string().optional().describe("Absolute path to the user's project root, when known")
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async ({ action, incidentId, projectName, stage, status, limit, cwd }, ctx) => {
      const prepared = prepareIncidentRun({ action, incidentId, projectName, stage, status, limit });
      if (!prepared.ok) return toToolText(prepared);
      const result = await runCli({
        command: prepared.command,
        args: prepared.args,
        cwd,
        signal: ctx.mcpReq.signal,
        clientName: getAdvisoryClientName(ctx),
        onProgress: createProgressReporter(ctx)
      });
      return toToolText(buildIncidentToolOutput({ command: prepared.command, args: prepared.args, result }));
    }
  );

  server.registerTool(
    'stacktape_docs',
    {
      description: `Search or fetch Stacktape documentation.

Use action=search for Stacktape configuration help, resource types, deployment patterns, CLI usage, and troubleshooting.
Use action=get after search when you need an exact route, headingPath, resourceType, definitionName, propertyName, or sourcePath.

Triggers: "give me a Stacktape config", "minimal example", "wire/connect X to Y", "Hono on Lambda", "DynamoDB access", "query database", "check a row", "run SELECT", "production DB from CLI".

IMPORTANT: Always use this tool for Stacktape docs/config/CLI questions before answering from memory, including advisory or safety questions where you think you already know the answer. Prefer the current TypeScript constructor-based examples from the docs; do not translate them into legacy YAML or object-style config unless the user explicitly asks. When the user asks for a config, return a complete TypeScript code block with defineConfig and constructor-style resources.`,
      inputSchema: z.object({
        action: z.enum(['search', 'get']).describe('Docs operation to perform'),
        query: z.string().optional().describe('Search query for action=search'),
        mode: z.enum(['answer', 'reference', 'snippet']).optional().describe('Search response mode. Default: answer'),
        resourceType: z.string().optional().describe('Filter or selector resource type, for example "function"'),
        docKind: z.enum(['docs-page', 'config-reference']).optional().describe('Filter to a docs artifact kind'),
        maxItems: z.number().optional().describe('Max search results to return. Default: 3'),
        route: z
          .string()
          .optional()
          .describe('Exact docs route for action=get, for example "/config-reference/function"'),
        definitionName: z
          .string()
          .optional()
          .describe('Exact TypeScript interface/type name for action=get, for example "LambdaFunction"'),
        propertyName: z
          .string()
          .optional()
          .describe('Exact config property name for action=get, for example "timeout"'),
        sourcePath: z.string().optional().describe('Exact source path from a previous docs reference'),
        headingPath: z.array(z.string()).optional().describe('Exact headingPath array from a previous docs reference'),
        maxChars: z.number().optional().describe('Maximum content characters for action=get. Default: 16000'),
        includeFullPage: z
          .boolean()
          .optional()
          .describe('Set true only when intentionally fetching all content for a long route selector')
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async ({
      action,
      query,
      mode,
      resourceType,
      docKind,
      maxItems,
      route,
      definitionName,
      propertyName,
      sourcePath,
      headingPath,
      maxChars,
      includeFullPage
    }) => {
      if (action === 'search') {
        if (!query) {
          return toToolText({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Missing required argument for docs search: query'
          });
        }

        const normalizedMode = mode ?? 'answer';
        const requestedMaxItems = clampInteger({ value: maxItems, defaultValue: 3, min: 1, max: 20 });
        const index = await getIndex();
        const results = search(index, {
          query,
          resourceType,
          docKind: docKind as DocKind | undefined,
          maxItems: normalizedMode === 'snippet' ? Math.min(requestedMaxItems, 8) : requestedMaxItems
        });

        const response = formatAnswer(results, normalizedMode);
        return toToolText(response as unknown as Record<string, unknown>);
      }

      return toToolText(
        getExactDocs({
          index: await getIndex(),
          route,
          resourceType,
          definitionName,
          propertyName,
          sourcePath,
          headingPath,
          docKind: docKind as DocKind | undefined,
          maxChars,
          includeFullPage
        })
      );
    }
  );

  server.registerTool(
    'stacktape_project',
    {
      description: `Inspect a local Stacktape project.

Use action=scan to orient in a Stacktape project, for example when the user asks what it contains or what should be deployed. It ranks Stacktape config candidates, parses package.json scripts that invoke stacktape, infers suggested CLI defaults (stage, region, project name), and returns compact Stacktape-specific context.`,
      inputSchema: z.object({
        action: z
          .enum(['scan', 'orient'])
          .optional()
          .describe('Project operation. Default: scan. orient currently returns a scan plus stronger next actions.'),
        cwd: z
          .string()
          .optional()
          .describe(
            "Absolute path to the user's Stacktape project root. Pass this whenever you have it. If omitted, the server falls back to its process cwd, which may not match the user's project."
          ),
        maxFiles: z.number().optional().describe('Maximum ranked files to return per category. Default: 8'),
        includeDetails: z
          .boolean()
          .optional()
          .describe('Set true to include full package script commands and unabridged candidate metadata')
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async ({ action, cwd, maxFiles, includeDetails }) => {
      try {
        const result = await scanStacktapeProject({
          cwd,
          maxFiles: clampInteger({ value: maxFiles, defaultValue: action === 'orient' ? 12 : 8, min: 1, max: 50 })
        });
        return toToolText({
          ok: true,
          code: 'OK',
          message: `Found ${result.totalConfigCandidates} Stacktape config candidate(s); returning ${result.configCandidates.length} ranked candidate(s).`,
          data: formatProjectScanForOutput(result, includeDetails),
          nextActions: [
            "Read-only commands: call stacktape_cli action=run directly with the detected defaults. Mutating commands: action=plan, the user's go-ahead, then action=run with confirm=true.",
            'For resource explanations, call stacktape_docs with action=search using detected resource constructors.',
            GENERIC_AWS_MCP_BOUNDARY
          ]
        });
      } catch (error) {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to scan Stacktape project.'
        });
      }
    }
  );

  server.registerTool(
    'stacktape_cli',
    {
      description: `List, describe, plan, or run Stacktape CLI commands.

- Read-only and diagnostic commands (logs, metrics, alarms, info:*, incidents, incident show, incident watch, query:*, aws call) run directly: action=run with validated args, no plan or confirmation. Non-mutating commands such as diff, synth, package and validate also run here, never through Bash.
- aws call sends only reviewed read-only AWS SDK operations; action=describe command="aws call" lists them per service, and args.input takes the SDK command's input as JSON. The Secrets Manager and SSM value reads are excluded and Lambda/ECS environment values are redacted, but content reads (log events, S3 objects, table items) return application data as it is: fetch them when the diagnosis needs them. logs StartQuery starts a Logs Insights query that AWS bills.
- Mutating commands: action=plan first (it normalizes args and returns an action=run payload), then action=run with confirm=true once the user asks for the change. Destructive commands additionally require direct user confirmation through MCP's input-required flow; agent-supplied confirm=true is not sufficient.
- Interactive commands are rejected here; use stacktape_dev for dev mode or tell the user to run other interactive commands in their own terminal.
- Auth comes from the local Stacktape CLI login. Never pass apiKey/STACKTAPE_API_KEY/STP_API_KEY as MCP arguments, and never read ~/.stacktape/, ~/.aws/, ~/.ssh/ or other credential files. Do not repeat API-key-like strings; say <REDACTED>. On auth failures, ask the user to run stacktape login in their own terminal; CI uses a STACKTAPE_API_KEY secret configured outside this conversation.
- If the user asks to show a secret value (secret get, private param get), do not put it in chat; tell them to run the command in their own terminal.
- For logs, metrics, alarms, stacks, databases, buckets and queues of a Stacktape project, prefer this tool over generic AWS MCP tools.`,
      inputSchema: z.object({
        action: z.enum(['list', 'describe', 'plan', 'run']).describe('CLI operation to perform'),
        command: z.string().optional().describe('Stacktape CLI command, for example "deploy", "logs", or "secret get"'),
        cwd: z
          .string()
          .optional()
          .describe("Absolute path to the user's Stacktape project root. Pass this whenever you have it."),
        args: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "CLI arguments as an object using camelCase arg names. The top-level stage, region, projectName and similar fields work too; values here win. A projectName or region declared in the Stacktape config is read by the CLI and needs no argument; any other missing one comes from the project's Stacktape package script."
          ),
        category: z
          .enum([
            'account',
            'config',
            'deployment',
            'dev',
            'diagnostics',
            'docs',
            'errors',
            'local',
            'project',
            'secrets',
            'utility'
          ])
          .optional()
          .describe('Filter for action=list'),
        safety: z
          .enum(['readOnly', 'diagnostic', 'local', 'mutating', 'destructive', 'interactive'])
          .optional()
          .describe('Filter for action=list'),
        stage: z.string().optional().describe('Target Stacktape stage, for example "production" or "dev"'),
        region: z.string().optional().describe('Target AWS region, for example "eu-west-1"'),
        projectName: z.string().optional().describe('Stacktape project name, for example "docs"'),
        awsAccount: z.string().optional().describe('Connected Stacktape AWS account name'),
        configPath: z.string().optional().describe('Stacktape config path relative to currentWorkingDirectory'),
        currentWorkingDirectory: z.string().optional().describe('Working directory for resolving config and app files'),
        fullDeploy: z
          .boolean()
          .optional()
          .describe('Deploy every change through CloudFormation instead of updating changed code directly'),
        resourceName: z.string().optional().describe('Stacktape resource name for diagnostics commands'),
        scriptName: z.string().optional().describe('Stacktape deployment script name for script run commands'),
        secretName: z.string().optional().describe('Stacktape secret name for secret commands'),
        secretValue: z.string().optional().describe('Secret value for secret set; tool output masks this value'),
        secretFile: z.string().optional().describe('Path to a file containing the secret value for secret set'),
        confirm: z.boolean().optional().describe('Required for mutating or destructive commands when action=run'),
        timeoutMs: z.number().optional().describe('Command timeout in milliseconds for action=run')
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async (
      {
        action,
        command,
        cwd,
        args,
        category,
        safety,
        stage,
        region,
        projectName,
        awsAccount,
        configPath,
        currentWorkingDirectory,
        fullDeploy,
        resourceName,
        scriptName,
        secretName,
        secretValue,
        secretFile,
        confirm,
        timeoutMs
      },
      ctx
    ) => {
      if (action === 'list') {
        return toToolText({
          ok: true,
          code: 'OK',
          message: 'Listed Stacktape CLI commands.',
          data: {
            guidance:
              'For ad-hoc database/data access, prefer query sql, query redis, query opensearch, query dynamodb, logs, and metrics. Use bastion tunnel, bastion shell, or container shell only for persistent interactive shell/tunnel access.',
            commands: listCliCommandSummaries({
              category: category as CliCommandCategory | undefined,
              safety: safety as CliCommandSafety | undefined
            })
          }
        });
      }

      if (!command) {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: `Missing required argument for stacktape_cli action=${action}: command`
        });
      }

      if (action === 'describe') {
        const description = describeCliCommand(command);
        if (!description) {
          return toToolText({
            ok: false,
            code: 'UNKNOWN_COMMAND',
            message: `Unknown Stacktape CLI command: ${publicCommandName(command)}`
          });
        }
        return toToolText({
          ok: true,
          code: 'OK',
          message: `Described Stacktape CLI command: ${publicCommandName(command)}`,
          data: description
        });
      }

      if (action === 'plan') {
        try {
          return toToolText(
            await buildCliPlan({
              command,
              cwd,
              args,
              stage,
              region,
              projectName,
              awsAccount,
              configPath,
              currentWorkingDirectory,
              fullDeploy,
              resourceName,
              scriptName,
              secretName,
              secretValue,
              secretFile
            })
          );
        } catch (error) {
          return toToolText({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to prepare Stacktape CLI plan.'
          });
        }
      }

      const runArgs = await resolveRunArgs({
        command,
        cwd,
        args,
        convenienceArgs: {
          stage,
          region,
          projectName,
          awsAccount,
          configPath,
          currentWorkingDirectory,
          fullDeploy,
          resourceName,
          scriptName,
          secretName,
          secretValue,
          secretFile
        }
      });
      const projectSettings = await readPlannedProjectSettings({ command, cwd, args: runArgs });
      if (projectSettings.error) {
        return toToolText(projectSettings.error);
      }
      const prepared = prepareCliRun({ command, args: runArgs, confirm, configSettings: projectSettings.settings });
      if (!prepared.ok) {
        return toToolText(prepared);
      }

      if (prepared.policy.safety === 'destructive') {
        const destructiveConfirmationResult = await requestDestructiveExecutionConfirmation({
          ctx,
          initializeCapabilities: server.server.getClientCapabilities(),
          command: prepared.command,
          args: prepared.args,
          cwd: resolve(cwd || process.cwd())
        });
        if (destructiveConfirmationResult) {
          return 'resultType' in destructiveConfirmationResult
            ? destructiveConfirmationResult
            : toToolText(destructiveConfirmationResult);
        }
      }

      const result = await runCli({
        command: prepared.command,
        args: prepared.args,
        cwd,
        timeoutMs,
        signal: ctx.mcpReq.signal,
        clientName: getAdvisoryClientName(ctx),
        onProgress: createProgressReporter(ctx)
      });

      return toToolText(
        buildCliRunOutput({
          result,
          command: prepared.command,
          policy: prepared.policy
        })
      );
    }
  );

  server.registerTool(
    'stacktape_dev',
    {
      description: `Control Stacktape dev mode: plan or start local development, check status, read logs, rebuild workloads, query and reset local databases, read workload environments, call AWS, and stop.

Use this instead of running stacktape dev or stacktape dev stop through Bash, and instead of calling the dev agent's HTTP API. Use action=plan to prepare dev mode without starting it; its data.stacktapeDevStart.arguments is a complete start call. action=start returns data.session.devSessionId; pass it as args.devSessionId for follow-up operations. Always pass it to stop. Other actions may omit it only when exactly one session of this server's projects runs: one this server started, or one whose project directory is the server's working directory or one of the client's roots. rebuild, rebuild_all, reset_db, seed and writing queries never act on a session in another directory without its devSessionId; refusals list each session with its projectDirectory. A query on another project's session through args.cwd runs read-only in the database. Sessions started earlier, also by another MCP server process, are found again. When another session takes the stage over, calls keep returning DEV_STAGE_TAKEN_OVER for the replaced session until a dev session starts in that directory; they never reach the new holder. The take-over was deliberate: ask the user before moving the stage back. start refuses a stage another session holds with DEV_STAGE_RUNNING_ELSEWHERE; args.takeOver=true moves the stage here and stops the other session. rebuild and rebuild_all answer after the build and deployment finish: ok=false with code REBUILD_FAILED carries the build error and the log file, and CONFIG_CHANGED_RESTART_REQUIRED means the configuration file changed and dev mode must restart.

start and status wait up to args.waitSeconds (default 50) and send progress notifications. A first start creates the dev network and the dev stack and takes several minutes: start then returns code DEV_STARTING with the latest progress while the start continues; call status with the devSessionId until it returns the ready status or the start's error. logs returns the newest lines by default; pass args.cursor (the previous nextCursor) for new lines only, args.level (info, warn, error) for a minimum level, args.since (ISO time or 10m) and args.workload to filter. Lines with source "dev" are dev mode's own lifecycle: rebuilds, file changes, dev stack updates, dev box state, resets and seeds.

Database actions reach only the databases dev mode runs on this machine, never deployed ones. tables lists tables, Redis keys, the DynamoDB key schema or OpenSearch indices. query runs args.sql (PostgreSQL, MySQL), args.command (Redis) or a DynamoDB query (args.pk) or scan; a bulk delete or change returns DESTRUCTIVE_OPERATION until repeated with args.confirm=true. reset_db with args.confirm=true deletes all rows (PostgreSQL, MySQL, DynamoDB) or keys (Redis) of args.resource or of every local database, and keeps the schema and migration history tables. seed runs the config's local-script args.script (default "seed") with the local database connections, as a beforeDev hook would, and returns its output; it stops the script after args.timeoutSeconds (default 50) and refuses scripts that reference a deployed resource, but it runs with the developer's AWS credentials and is not a sandbox. env returns a workload's environment with secret values masked. aws calls a reviewed read-only AWS SDK operation (args.service, args.command, args.input) scoped to the dev stack.`,
      inputSchema: z.object({
        action: z.enum(DEV_TOOL_ACTIONS),
        args: DEV_TOOL_ARGS_SCHEMA.optional()
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async ({ action, args }, ctx) =>
      runDevAction({
        action,
        args,
        signal: ctx.mcpReq.signal,
        clientName: getAdvisoryClientName(ctx),
        onProgress: createProgressReporter(ctx),
        getProjectRoots: getClientRoots
      })
  );

  return server;
};

// ─── Command Entry ───────────────────────────────────────────────────────────

export const commandMcp = async () => {
  // If launched from a dev wrapper that needed to cd into the repo for module
  // resolution, restore the caller's original cwd so project_scan/cli_plan see
  // the user's project directory (not the repo dir).
  const overrideCwd = process.env.STACKTAPE_MCP_USER_CWD;
  if (overrideCwd && overrideCwd !== process.cwd()) {
    try {
      process.chdir(overrideCwd);
    } catch {
      // tolerate: if the override dir is gone we keep the current cwd.
    }
  }

  if (!process.env.STACKTAPE_MCP_CLI_COMMAND) {
    const execName = basename(process.execPath || '').toLowerCase();
    if (!['bun', 'bun.exe', 'node', 'node.exe'].includes(execName)) {
      process.env.STACKTAPE_MCP_CLI_COMMAND =
        process.platform === 'win32' ? process.execPath.replace(/\\/g, '/') : process.execPath;
    }
  }

  let indexPromise: Promise<LexicalIndex> | undefined;
  const getIndex = () => {
    indexPromise ||= buildIndex();
    return indexPromise;
  };

  // Create and start the MCP server before loading the docs index so CLI/project
  // tools are discoverable immediately, even when another fast AWS MCP server is
  // installed in the same client.
  const stdioServer = serveStacktapeMcp(() => createMcpServer(getIndex));
  void getIndex().catch(() => {
    // Surface docs-index failures through stacktape_docs calls instead of
    // failing MCP startup and hiding the operational tools.
  });
  await new Promise<void>((resolveShutdown) => {
    const shutdown = () => resolveShutdown();
    process.stdin.once('end', shutdown);
    process.stdin.once('close', shutdown);
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
  await stdioServer.close();
};
