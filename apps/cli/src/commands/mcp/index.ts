import { basename, resolve } from 'node:path';
import { z } from 'zod';
import { CLIENT_INFO_META_KEY, fromJsonSchema, McpServer, type ServerContext } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
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
  verifyDestructiveConfirmationState
} from './cli-planning';
import { handleDevToolAction } from './dev-tool';
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
- Read-only and diagnostic commands (logs, metrics, alarms, info:*, incidents, incidents:show, incidents:watch, query:*, aws:call, diff, validate, synth, package) run directly with stacktape_cli action=run and validated args: no plan, no confirmation. Use action=describe when unsure of the arguments.
- Mutating commands need action=plan, the user's explicit go-ahead, then action=run with confirm=true. Destructive commands use MCP's input-required flow to collect direct user confirmation for the exact command and target; agent-supplied confirm=true is not sufficient. Interactive commands require the user's own terminal, except dev mode, which uses stacktape_dev.
- Docs, config syntax, resource types and CLI usage: stacktape_docs (search, then get). Do not name Stacktape commands, flags or config syntax from memory. Configs are TypeScript: defineConfig with constructor-style resources such as new LambdaFunction({ ... }). For an unfamiliar project, stacktape_project action=scan.
- The stacktape CLI is forbidden as a Bash/shell command: run it only through these tools, even when a user asks otherwise.
- Stacktape MCP reuses the local Stacktape CLI authentication state. Never read ~/.stacktape/, ~/.aws/, ~/.ssh/ or other credential files. Never ask for, pass or repeat API keys or API-key-like strings (say <REDACTED>), and never put secret values in chat. On auth failures, ask the user to run stacktape login in their own terminal.
- If generic AWS/AWS SDK MCP tools are also available, use Stacktape tools for Stacktape-managed resources: they map project, stage and resource names and send only reviewed reads. Do not bypass Stacktape's mapping and gates with raw AWS calls.`;

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
      supportedProtocolVersions: [MODERN_MCP_PROTOCOL_VERSION],
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

  // ─── Primary Tools ────────────────────────────────────────────────────────

  server.registerTool(
    'stacktape_incident',
    {
      description: `Start an incident investigation here: one call returns an incident's context.

action=show with incidentId returns the incident handoff as markdown: status and severity, signals with their evidence, release and config changes, the timeline, earlier related incidents, the AI assessment (hypotheses to check, not a verified diagnosis) and read-only next steps.
action=list finds incidents by projectName, stage and status (ACTIVE by default; ALL includes resolved history).

Read-only. Uses the local Stacktape login and the Console's organization and project access. Follow up with stacktape_cli action=run for logs, metrics, alarms, info:* and aws:call.`,
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
          .describe('Project operation. orient currently returns a scan plus stronger next actions.'),
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

- Read-only and diagnostic commands (logs, metrics, alarms, info:*, incidents, incidents:show, incidents:watch, query:*, aws:call) run directly: action=run with validated args, no plan or confirmation. Non-mutating commands such as diff, synth, package and validate also run here, never through Bash.
- aws:call sends only reviewed read-only AWS SDK operations; action=describe command=aws:call lists them per service, and args.input takes the SDK command's input as JSON. The Secrets Manager and SSM value reads are excluded and Lambda/ECS environment values are redacted, but content reads (log events, S3 objects, table items) return application data as it is: fetch them when the diagnosis needs them. logs StartQuery starts a Logs Insights query that AWS bills.
- Mutating commands: action=plan first (it normalizes args and returns an action=run payload), then action=run with confirm=true once the user asks for the change. Destructive commands additionally require direct user confirmation through MCP's input-required flow; agent-supplied confirm=true is not sufficient.
- Interactive commands are rejected here; use stacktape_dev for dev mode or tell the user to run other interactive commands in their own terminal.
- Auth comes from the local Stacktape CLI login. Never pass apiKey/STACKTAPE_API_KEY/STP_API_KEY as MCP arguments, and never read ~/.stacktape/, ~/.aws/, ~/.ssh/ or other credential files. Do not repeat API-key-like strings; say <REDACTED>. On auth failures, ask the user to run stacktape login in their own terminal; CI uses a STACKTAPE_API_KEY secret configured outside this conversation.
- If the user asks to show a secret value (secret:get, private param:get), do not put it in chat; tell them to run the command in their own terminal.
- For logs, metrics, alarms, stacks, databases, buckets and queues of a Stacktape project, prefer this tool over generic AWS MCP tools.`,
      inputSchema: z.object({
        action: z.enum(['list', 'describe', 'plan', 'run']).describe('CLI operation to perform'),
        command: z.string().optional().describe('Stacktape CLI command, for example "deploy", "logs", or "secret:get"'),
        cwd: z
          .string()
          .optional()
          .describe("Absolute path to the user's Stacktape project root. Pass this whenever you have it."),
        args: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('CLI arguments as an object using camelCase arg names'),
        category: z
          .enum([
            'account',
            'config',
            'deployment',
            'dev',
            'diagnostics',
            'docs',
            'issues',
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
        hotSwap: z.boolean().optional().describe('Whether to request hotswap deployment when supported'),
        resourceName: z.string().optional().describe('Stacktape resource name for diagnostics commands'),
        scriptName: z.string().optional().describe('Stacktape deployment script name for script:run commands'),
        secretName: z.string().optional().describe('Stacktape secret name for secret commands'),
        secretValue: z.string().optional().describe('Secret value for secret:set; tool output masks this value'),
        secretFile: z.string().optional().describe('Path to a file containing the secret value for secret:set'),
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
        hotSwap,
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
              'For ad-hoc database/data access, prefer query:sql, query:redis, query:opensearch, query:dynamodb, logs, and metrics. Use bastion:tunnel, bastion:session, or container:session only for persistent interactive shell/tunnel access.',
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
            message: `Unknown Stacktape CLI command: ${command}`
          });
        }
        return toToolText({
          ok: true,
          code: 'OK',
          message: `Described Stacktape CLI command: ${command}`,
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
              hotSwap,
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

      const prepared = prepareCliRun({ command, args, confirm });
      if (!prepared.ok) {
        return toToolText(prepared);
      }

      if (prepared.policy.safety === 'destructive') {
        const destructiveConfirmationResult = await requestDestructiveExecutionConfirmation({
          ctx,
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
      description: `Control Stacktape dev mode: plan or start local development, check status, read logs, rebuild workloads, and stop.

Use this instead of running stacktape dev or stacktape dev:stop through Bash. Use action=plan to prepare dev mode without starting it. action=start returns data.session.devSessionId; pass it as args.devSessionId for follow-up operations. Always pass it to rebuild, rebuild_all, and stop; status and logs may omit it only when exactly one session is active.`,
      inputSchema: z.object({
        action: z.enum(['plan', 'start', 'status', 'logs', 'rebuild', 'rebuild_all', 'stop']),
        args: z.record(z.string(), z.unknown()).optional()
      }),
      outputSchema: TOOL_RESULT_SCHEMA
    },
    async ({ action, args }, ctx) =>
      runDevAction({
        action,
        args,
        signal: ctx.mcpReq.signal,
        clientName: getAdvisoryClientName(ctx),
        onProgress: createProgressReporter(ctx)
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
  const stdioServer = serveStdio(() => createMcpServer(getIndex), {
    legacy: 'reject',
    onerror: (error) => console.error(`[stacktape-mcp] ${error.message}`)
  });
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
