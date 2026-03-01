import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathExists, readFile } from 'fs-extra';
import { buildIndex, search, formatAnswer } from './lexical-index';
import type { LexicalIndex, DocType } from './lexical-index';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';

type ToolOutput = {
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
  rawTail?: string;
  nextActions?: string[];
};

type DevSession = {
  agentPort: number;
  startedAt: string;
};

let activeDevSession: DevSession | null = null;

const OPS_COMMAND_MAP = {
  preview_changes: 'preview-changes',
  deploy: 'deploy',
  delete: 'delete',
  rollback: 'rollback',
  script_run: 'script:run',
  compile_template: 'compile-template',
  secret_create: 'secret:create',
  secret_get: 'secret:get',
  secret_delete: 'secret:delete'
} as const;

const DIAGNOSE_COMMAND_MAP = {
  info_stack: 'info:stack',
  info_stacks: 'info:stacks',
  info_operations: 'info:operations',
  info_whoami: 'info:whoami',
  logs: 'debug:logs',
  metrics: 'debug:metrics',
  alarms: 'debug:alarms',
  container_exec: 'debug:container-exec',
  sql: 'debug:sql',
  dynamodb: 'debug:dynamodb',
  redis: 'debug:redis',
  opensearch: 'debug:opensearch',
  aws_sdk: 'debug:aws-sdk'
} as const;

const DIAGNOSE_ALLOWED_ARGS: Record<keyof typeof DIAGNOSE_COMMAND_MAP, string[]> = {
  info_stack: ['stackName', 'projectName', 'stage', 'region', 'awsAccount', 'logLevel'],
  info_stacks: ['projectName', 'stage', 'region', 'awsAccount', 'logLevel'],
  info_operations: ['projectName', 'stage', 'region', 'limit', 'logLevel'],
  info_whoami: ['logLevel'],
  logs: [
    'resourceName',
    'raw',
    'filter',
    'container',
    'query',
    'limit',
    'startTime',
    'endTime',
    'projectName',
    'stage',
    'region'
  ],
  metrics: ['resourceName', 'metric', 'period', 'stat', 'startTime', 'endTime', 'projectName', 'stage', 'region'],
  alarms: ['resourceName', 'state', 'projectName', 'stage', 'region'],
  container_exec: ['resourceName', 'command', 'container', 'taskArn', 'projectName', 'stage', 'region'],
  sql: ['resourceName', 'sql', 'limit', 'timeout', 'bastionResource', 'projectName', 'stage', 'region'],
  dynamodb: [
    'resourceName',
    'operation',
    'key',
    'item',
    'pk',
    'sk',
    'index',
    'limit',
    'projectName',
    'stage',
    'region'
  ],
  redis: ['resourceName', 'operation', 'key', 'pattern', 'limit', 'field', 'value', 'projectName', 'stage', 'region'],
  opensearch: ['resourceName', 'operation', 'index', 'id', 'document', 'query', 'projectName', 'stage', 'region'],
  aws_sdk: ['service', 'command', 'input', 'region', 'projectName', 'stage']
};

const maskSecretString = (value: string): string => {
  if (value.length <= 8) {
    return '*'.repeat(Math.max(value.length, 1));
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const maskSensitiveValues = (input: unknown, parentKey = ''): unknown => {
  if (typeof input === 'string') {
    if (/secret|token|password|credential|key|value/i.test(parentKey)) {
      return maskSecretString(input);
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveValues(item, parentKey));
  }

  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = maskSensitiveValues(value, key);
    }
    return result;
  }

  return input;
};

const ARG_ALIASES: Record<string, string> = {
  project_name: 'projectName',
  config_path: 'configPath',
  resource_name: 'resourceName',
  script_name: 'scriptName',
  secret_name: 'secretName',
  secret_value: 'secretValue',
  secret_file: 'secretFile',
  bastion_resource: 'bastionResource',
  out_file: 'outFile',
  out_format: 'outFormat',
  auto_confirm_operation: 'autoConfirmOperation',
  task_arn: 'taskArn',
  start_time: 'startTime',
  end_time: 'endTime'
};

const toCamelCase = (value: string): string => value.replace(/[_-]([a-z])/g, (_, char: string) => char.toUpperCase());

const normalizeToolArgs = (args?: Record<string, unknown>): Record<string, unknown> => {
  if (!args) return {};
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    const mappedKey = ARG_ALIASES[key] || toCamelCase(key);
    normalized[mappedKey] = value;
  }
  return normalized;
};

const pickAllowedArgs = (args: Record<string, unknown>, allowedArgs: string[]): Record<string, unknown> => {
  const allowed = new Set(allowedArgs);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

const hasValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const validateRequiredArgs = ({
  operation,
  args,
  requiredAny,
  requiredAll
}: {
  operation: string;
  args: Record<string, unknown>;
  requiredAny?: string[];
  requiredAll?: string[];
}): ToolOutput | null => {
  if (requiredAll && requiredAll.length > 0) {
    const missing = requiredAll.filter((argName) => !hasValue(args[argName]));
    if (missing.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Missing required argument(s) for ${operation}: ${missing.map((argName) => `--${argName}`).join(', ')}`
      };
    }
  }

  if (requiredAny && requiredAny.length > 0) {
    const hasAny = requiredAny.some((argName) => hasValue(args[argName]));
    if (!hasAny) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Missing required argument for ${operation}. Provide one of: ${requiredAny.map((argName) => `--${argName}`).join(', ')}`
      };
    }
  }

  return null;
};

const extractJsonLogPayload = (rawTail?: string): Record<string, unknown> | undefined => {
  if (!rawTail) return undefined;
  const lines = rawTail
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type === 'log' && typeof parsed.message === 'string') {
        try {
          const messagePayload = JSON.parse(parsed.message);
          if (messagePayload && typeof messagePayload === 'object') {
            return messagePayload as Record<string, unknown>;
          }
        } catch {
          // ignore non-json log message
        }
      }
    } catch {
      // ignore non-json tail line
    }
  }
  return undefined;
};

const MAX_RESPONSE_CHARS = 30000;

const truncateRawTail = (rawTail: string | undefined, maxChars: number): string | undefined => {
  if (!rawTail || rawTail.length <= maxChars) return rawTail;
  const lines = rawTail.split('\n');
  // Keep first few lines and last lines to stay within limit
  const head = lines.slice(0, 5).join('\n');
  const tail = lines.slice(-20).join('\n');
  const truncated = `${head}\n\n... [${lines.length - 25} lines truncated] ...\n\n${tail}`;
  return truncated.length <= maxChars ? truncated : truncated.slice(0, maxChars);
};

const toToolText = (payload: ToolOutput | Record<string, unknown>) => {
  // Truncate rawTail if present
  if ('rawTail' in payload && typeof payload.rawTail === 'string') {
    payload = { ...payload, rawTail: truncateRawTail(payload.rawTail as string, 8000) };
  }

  let text = JSON.stringify(payload, null, 2);
  if (text.length > MAX_RESPONSE_CHARS) {
    // Remove rawTail entirely if still too large
    const withoutTail = { ...payload };
    delete (withoutTail as Record<string, unknown>).rawTail;
    text = JSON.stringify(withoutTail, null, 2);

    if (text.length > MAX_RESPONSE_CHARS) {
      text = `${text.slice(0, MAX_RESPONSE_CHARS)}\n\n... [response truncated at ${MAX_RESPONSE_CHARS} chars]`;
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ]
  };
};

const buildToolOutputFromCliResult = ({
  result,
  parseJsonPayloadFallback,
  codeFallback = 'INTERNAL_ERROR'
}: {
  result: {
    ok: boolean;
    code: string;
    message: string;
    data?: Record<string, unknown>;
    rawTail?: string;
  };
  parseJsonPayloadFallback?: boolean;
  codeFallback?: string;
}): ToolOutput => {
  let data = result.data;
  if (!data && parseJsonPayloadFallback) {
    data = extractJsonLogPayload(result.rawTail);
  }

  return {
    ok: result.ok,
    code: result.code || codeFallback,
    message: result.message,
    ...(data ? { data } : {}),
    ...(result.rawTail ? { rawTail: result.rawTail } : {})
  };
};

const devApiRequest = async ({
  port,
  method,
  path,
  body
}: {
  port: number;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, code: 'INTERNAL_ERROR', message: text };
    }

    const envelope = parsed as Record<string, unknown>;
    if (typeof envelope.ok === 'boolean' && typeof envelope.code === 'string') {
      const data = envelope.data && typeof envelope.data === 'object' ? (envelope.data as Record<string, unknown>) : {};
      return {
        ok: envelope.ok,
        code: envelope.code,
        message: typeof envelope.message === 'string' ? envelope.message : undefined,
        ...data
      };
    }

    return envelope;
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR', message: text || `HTTP ${response.status}` };
  }
};

const ensureDevSessionAvailable = async (): Promise<
  { ok: true; session: DevSession } | { ok: false; output: ToolOutput }
> => {
  if (!activeDevSession) {
    return {
      ok: false,
      output: {
        ok: false,
        code: 'NOT_FOUND',
        message: 'No active dev session found.',
        nextActions: ['Call stacktape_dev with operation=start first']
      }
    };
  }

  const health = await devApiRequest({
    port: activeDevSession.agentPort,
    method: 'GET',
    path: '/health'
  });
  if (health.ok === false) {
    const stalePort = activeDevSession.agentPort;
    activeDevSession = null;
    return {
      ok: false,
      output: {
        ok: false,
        code: 'NOT_FOUND',
        message: `Dev session on port ${stalePort} is no longer reachable.`,
        nextActions: ['Call stacktape_dev with operation=start to create a new dev session']
      }
    };
  }

  return { ok: true, session: activeDevSession };
};

const readDevLogs = async ({
  logFile,
  cursor,
  limit
}: {
  logFile: string;
  cursor?: number;
  limit?: number;
}): Promise<{ entries: unknown[]; nextCursor: number; totalLines: number }> => {
  if (!(await pathExists(logFile))) {
    return { entries: [], nextCursor: 0, totalLines: 0 };
  }

  const content = await readFile(logFile, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const start = Math.max(0, cursor ?? 0);
  const maxItems = Math.max(1, Math.min(limit ?? 200, 1000));
  const page = lines.slice(start, start + maxItems);

  const entries = page.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { message: line };
    }
  });

  return {
    entries,
    nextCursor: start + page.length,
    totalLines: lines.length
  };
};

// ─── MCP Server Setup ────────────────────────────────────────────────────────

const createMcpServer = (index: LexicalIndex) => {
  const server = new McpServer(
    {
      name: 'stacktape',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // ─── stacktape_docs tool ─────────────────────────────────────────────────

  server.tool(
    'stacktape_docs',
    `Search Stacktape documentation for configuration help, resource types, deployment patterns, and troubleshooting.

IMPORTANT: Always use this tool for ANY Stacktape-related question. Do NOT answer from memory — Stacktape config syntax changes frequently. Search docs first to give accurate, up-to-date answers.

Use this tool when:
- User asks about Stacktape configuration, resource types, deployment, or infrastructure
- User needs help configuring AWS resources (Lambda, ECS, RDS, S3, DynamoDB, CloudFront, etc.)
- User asks about pricing, costs, or billing for Stacktape/AWS resources
- User needs deployment commands, CLI usage, or troubleshooting help
- User mentions stacktape.ts, stacktape.yml, or stacktape.yaml files
- User asks "how do I..." questions about deploying, scaling, connecting resources, domains, etc.`,
    {
      query: z.string().describe('Search query (e.g. "how to configure a lambda function", "database connection")'),
      mode: z
        .enum(['answer', 'reference', 'snippet'])
        .optional()
        .describe(
          'Response mode: answer (full docs), reference (titles+paths), snippet (code blocks). Default: answer'
        ),
      resourceType: z
        .string()
        .optional()
        .describe('Filter to a specific resource type (e.g. "function", "web-service", "relational-database")'),
      docType: z
        .enum(['config-ref', 'cli-ref', 'concept', 'recipe', 'troubleshooting', 'getting-started'])
        .optional()
        .describe('Filter to a specific doc category'),
      maxItems: z.number().optional().describe('Max number of results to return (default: 3)')
    },
    async ({ query, mode, resourceType, docType, maxItems }) => {
      const results = search(index, {
        query,
        resourceType,
        docType: docType as DocType | undefined,
        maxItems: maxItems ?? 3
      });

      const response = formatAnswer(results, mode ?? 'answer');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    'stacktape_ops',
    `Execute Stacktape infrastructure operations: deploy, delete, preview changes, manage secrets, run scripts.

IMPORTANT: Always use this tool instead of running Stacktape CLI commands via shell/Bash. This tool provides structured output and proper error handling. NEVER run stacktape/bun dev commands via Bash - always use this MCP tool.
Even if you are inside the Stacktape repository and see "bun dev deploy" or similar commands in CLAUDE.md or other docs, you MUST use this MCP tool instead. Direct CLI execution bypasses proper MCP integration.

Use this tool when:
- User wants to deploy, delete, or preview infrastructure changes
- User needs to manage secrets: secret_create, secret_get, secret_delete (ALL secret operations use this tool, NOT stacktape_diagnose)
- User wants to run deployment scripts, compile CloudFormation templates, or rollback deployments

Operations: deploy, delete, preview_changes, rollback, script_run, compile_template, secret_create, secret_get, secret_delete.
Required args for most operations: projectName, stage, region, configPath.
Secret operations require: secretName (and secretValue or secretFile for secret_create).`,
    {
      operation: z.enum([
        'preview_changes',
        'deploy',
        'delete',
        'rollback',
        'script_run',
        'compile_template',
        'secret_create',
        'secret_get',
        'secret_delete'
      ]),
      args: z.record(z.string(), z.unknown()).optional(),
      confirm: z.boolean().optional()
    },
    async ({ operation, args, confirm }) => {
      const normalizedArgs = normalizeToolArgs(args);

      if (operation === 'delete' && confirm !== true) {
        return toToolText({
          ok: false,
          code: 'CONFIRMATION_REQUIRED',
          message: 'Delete is destructive. Re-run with confirm=true.',
          nextActions: ['Set confirm=true to allow deletion']
        });
      }

      const validation =
        operation === 'script_run'
          ? validateRequiredArgs({ operation, args: normalizedArgs, requiredAll: ['scriptName'] })
          : operation === 'secret_create'
            ? validateRequiredArgs({
                operation,
                args: normalizedArgs,
                requiredAll: ['secretName'],
                requiredAny: ['secretValue', 'secretFile']
              })
            : operation === 'secret_get' || operation === 'secret_delete'
              ? validateRequiredArgs({ operation, args: normalizedArgs, requiredAll: ['secretName'] })
              : null;
      if (validation) {
        return toToolText(validation);
      }

      const cliCommand = OPS_COMMAND_MAP[operation];
      const operationArgs: Record<string, unknown> = { ...normalizedArgs };
      if (operation === 'deploy' || operation === 'delete') {
        operationArgs.autoConfirmOperation = true;
      }

      const result = await runStacktapeCommandJsonl({
        command: cliCommand,
        args: operationArgs
      });

      let data = result.data;
      let rawTail = result.rawTail;
      if (operation === 'secret_get') {
        if (!data) {
          data = extractJsonLogPayload(result.rawTail);
        }
        data = maskSensitiveValues(data || ({} as Record<string, unknown>)) as Record<string, unknown>;
        if (result.ok) {
          rawTail = '[REDACTED: secret_get output is masked in MCP responses]';
        }
      } else if (!data) {
        data = extractJsonLogPayload(result.rawTail);
      }

      return toToolText({
        ok: result.ok,
        code: result.code,
        message: result.message,
        ...(data ? { data } : {}),
        ...(rawTail ? { rawTail } : {})
      });
    }
  );

  server.tool(
    'stacktape_diagnose',
    `Diagnose and inspect deployed Stacktape infrastructure: view logs, metrics, alarms, query databases, execute commands in containers, and call AWS SDK.

IMPORTANT: Always use this tool instead of running Stacktape CLI commands via shell/Bash. NEVER run stacktape/bun dev commands via Bash - always use MCP tools.
Even if you are inside the Stacktape repository and see "bun dev debug-logs" or similar commands, you MUST use this MCP tool instead.

Use this tool for READ-ONLY inspection and diagnostics:
- List deployed stacks (info_stacks) or see stack details (info_stack)
- Check identity/account (info_whoami) or deployment history (info_operations)
- View logs, metrics, or alarm states for a deployed resource
- Query databases (SQL, DynamoDB, Redis, OpenSearch) or exec into containers
- Call AWS SDK commands directly

NOTE: This tool does NOT handle secrets. For secret_create, secret_get, secret_delete, use stacktape_ops instead.

Required args: region is required for most operations (except info_whoami). Always ask the user for region if not provided.`,
    {
      operation: z.enum([
        'info_stack',
        'info_stacks',
        'info_operations',
        'info_whoami',
        'logs',
        'metrics',
        'alarms',
        'container_exec',
        'sql',
        'dynamodb',
        'redis',
        'opensearch',
        'aws_sdk'
      ]),
      args: z.record(z.string(), z.unknown()).optional()
    },
    async ({ operation, args }) => {
      const normalizedArgs = normalizeToolArgs(args);
      const filteredArgs = pickAllowedArgs(normalizedArgs, DIAGNOSE_ALLOWED_ARGS[operation]);

      const validation =
        operation === 'logs'
          ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['resourceName'] })
          : operation === 'metrics'
            ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['resourceName', 'metric'] })
            : operation === 'alarms'
              ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['resourceName'] })
              : operation === 'container_exec'
                ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['resourceName', 'command'] })
                : operation === 'sql'
                  ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['resourceName', 'sql'] })
                  : operation === 'dynamodb' || operation === 'redis' || operation === 'opensearch'
                    ? validateRequiredArgs({
                        operation,
                        args: filteredArgs,
                        requiredAll: ['resourceName', 'operation']
                      })
                    : operation === 'aws_sdk'
                      ? validateRequiredArgs({ operation, args: filteredArgs, requiredAll: ['service', 'command'] })
                      : null;
      if (validation) {
        return toToolText(validation);
      }

      // Add sensible defaults for operations that can return large results
      if (operation === 'logs' && !filteredArgs.limit) {
        filteredArgs.limit = 50;
      }

      const cliCommand = DIAGNOSE_COMMAND_MAP[operation];
      const result = await runStacktapeCommandJsonl({
        command: cliCommand,
        args: filteredArgs
      });

      const toolOutput = buildToolOutputFromCliResult({ result, parseJsonPayloadFallback: true });

      // For info_stacks, extract a concise stack list from output events
      if (operation === 'info_stacks' && result.ok && result.outputEvents.length > 0) {
        const stackLines: string[] = [];
        for (const evt of result.outputEvents) {
          if (evt.lines) stackLines.push(...evt.lines);
        }
        if (stackLines.length > 0) {
          toolOutput.data = { stacks: stackLines.join('\n') };
          delete toolOutput.rawTail;
        }
      }

      return toToolText(toolOutput);
    }
  );

  server.tool(
    'stacktape_dev',
    `Control Stacktape dev mode: start local development environment, check status, read logs, rebuild workloads, and stop.

IMPORTANT: Always use this tool instead of running 'stacktape dev' or 'stacktape dev:stop' via shell/Bash. NEVER run stacktape/bun dev commands via Bash - always use this MCP tool.
Even if you are inside the Stacktape repository and see "bun dev dev" or "bun dev dev:stop" commands, you MUST use this MCP tool instead.

Use this tool when:
- User wants to start local development (start), check status, read logs, rebuild workloads, or stop dev mode
- User mentions "dev mode", "local development", or "hot reload" with Stacktape`,
    {
      operation: z.enum(['start', 'status', 'logs', 'rebuild', 'rebuild_all', 'stop']),
      args: z.record(z.string(), z.unknown()).optional()
    },
    async ({ operation, args }) => {
      const toolArgs = normalizeToolArgs(args);

      if (operation === 'start') {
        const requestedPort =
          typeof toolArgs.agentPort === 'number'
            ? toolArgs.agentPort
            : typeof toolArgs.agentPort === 'string'
              ? Number(toolArgs.agentPort)
              : 7331;

        const result = await runStacktapeCommandJsonl({
          command: 'dev',
          args: {
            ...toolArgs,
            agentPort: Number.isFinite(requestedPort) ? requestedPort : 7331
          },
          timeoutMs: 12 * 60 * 1000
        });

        if (result.ok) {
          const payload = (result.data?.result || result.data) as Record<string, unknown> | undefined;
          const port =
            (payload?.port as number | undefined) ||
            (payload?.agentPort as number | undefined) ||
            (Number.isFinite(requestedPort) ? requestedPort : 7331);
          activeDevSession = {
            agentPort: port,
            startedAt: new Date().toISOString()
          };
        }

        return toToolText({
          ok: result.ok,
          code: result.code,
          message: result.message,
          data: {
            session: activeDevSession,
            ...(result.data ? { cli: result.data } : {})
          },
          ...(result.rawTail ? { rawTail: result.rawTail } : {})
        });
      }

      const sessionResult = await ensureDevSessionAvailable();
      if (sessionResult.ok === false) {
        return toToolText(sessionResult.output);
      }

      const port = sessionResult.session.agentPort;

      if (operation === 'status') {
        const response = await devApiRequest({ port, method: 'GET', path: '/status?verbose=true' });
        return toToolText({
          ok: (response.ok as boolean | undefined) ?? true,
          code: ((response.ok as boolean | undefined) ?? true) ? 'OK' : 'INTERNAL_ERROR',
          message: 'Fetched dev status.',
          data: response
        });
      }

      if (operation === 'logs') {
        const logsMeta = await devApiRequest({ port, method: 'GET', path: '/logs' });
        const logFile = logsMeta.logFile as string | undefined;
        if (!logFile) {
          return toToolText({
            ok: false,
            code: 'NOT_FOUND',
            message: 'Dev log file path not available.',
            data: logsMeta
          });
        }

        const cursor = typeof toolArgs.cursor === 'number' ? toolArgs.cursor : Number(toolArgs.cursor || 0);
        const limit = typeof toolArgs.limit === 'number' ? toolArgs.limit : Number(toolArgs.limit || 200);
        const page = await readDevLogs({
          logFile,
          cursor: Number.isFinite(cursor) ? cursor : 0,
          limit: Number.isFinite(limit) ? limit : 200
        });

        const requestedWorkload = typeof toolArgs.workload === 'string' ? toolArgs.workload.trim() : undefined;
        const filteredEntries = requestedWorkload
          ? page.entries.filter((entry) => {
              const source = (entry as Record<string, unknown>).source;
              return typeof source === 'string' && source === requestedWorkload;
            })
          : page.entries;

        return toToolText({
          ok: true,
          code: 'OK',
          message: requestedWorkload
            ? `Fetched ${filteredEntries.length} log entries for workload '${requestedWorkload}'.`
            : `Fetched ${filteredEntries.length} log entries.`,
          data: {
            logFile,
            entries: filteredEntries,
            nextCursor: page.nextCursor,
            totalLines: page.totalLines
          }
        });
      }

      if (operation === 'rebuild') {
        const workload = typeof toolArgs.workload === 'string' ? toolArgs.workload : undefined;
        if (!workload) {
          return toToolText({
            ok: false,
            code: 'VALIDATION_ERROR',
            message: 'Missing required args.workload for rebuild operation.'
          });
        }

        const response = await devApiRequest({
          port,
          method: 'POST',
          path: `/rebuild/${encodeURIComponent(workload)}`,
          body: {}
        });
        return toToolText({
          ok: (response.ok as boolean | undefined) ?? false,
          code: ((response.ok as boolean | undefined) ?? false) ? 'OK' : 'INTERNAL_ERROR',
          message:
            ((response.ok as boolean | undefined) ?? false)
              ? `Rebuild requested for workload '${workload}'.`
              : 'Failed to request workload rebuild.',
          data: response
        });
      }

      if (operation === 'rebuild_all') {
        const response = await devApiRequest({
          port,
          method: 'POST',
          path: '/rebuild/all',
          body: {}
        });
        return toToolText({
          ok: (response.ok as boolean | undefined) ?? false,
          code: ((response.ok as boolean | undefined) ?? false) ? 'OK' : 'INTERNAL_ERROR',
          message:
            ((response.ok as boolean | undefined) ?? false)
              ? 'Rebuild requested for all workloads.'
              : 'Failed to request rebuild for all workloads.',
          data: response
        });
      }

      if (operation === 'stop') {
        const response = await devApiRequest({
          port,
          method: 'POST',
          path: '/stop',
          body: {}
        });
        const ok = (response.ok as boolean | undefined) ?? false;
        if (ok) {
          activeDevSession = null;
        }
        return toToolText({
          ok,
          code: ok ? 'OK' : 'INTERNAL_ERROR',
          message: ok ? 'Dev session stop requested.' : 'Failed to stop dev session.',
          data: response
        });
      }

      return toToolText({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Unsupported dev operation: ${operation}`
      });
    }
  );

  return server;
};

// ─── Command Entry ───────────────────────────────────────────────────────────

export const commandMcp = async () => {
  // Build the lexical index from generated AI docs
  const index = await buildIndex();

  // Create and start the MCP server
  const server = createMcpServer(index);
  const transport = new StdioServerTransport();

  await server.connect(transport);
};
