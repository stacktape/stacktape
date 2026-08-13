/**
 * Codex as a session transport.
 *
 * Close to Claude Code, but not inert, and the gaps shape the whole invocation:
 *
 * - **`apply_patch` cannot be switched off.** Shell, web search and image tools can be, and the
 *   sandbox can be made read-only, but there is no flag that removes the patch tool. So Codex runs
 *   with its working directory set to a scratch folder we create and delete: a stray patch lands
 *   somewhere disposable and never touches the user's repository. Our tools address the repository
 *   by absolute root, so nothing legitimate depends on the working directory.
 * - **No system-prompt flag.** It rides in-band, ahead of the task, behind a delimiter.
 * - **No turn ceiling.** The budget degrades to a wall-clock timeout.
 * - **Per-invocation config only.** `--ignore-user-config` plus repeated `-c` overrides keeps the
 *   user's `config.toml` untouched while leaving their ChatGPT subscription auth intact, which lives
 *   elsewhere.
 */

import { INIT_MCP_SERVER_NAME } from '../../mcp/session-server';
import type { AgentEvent, TokenUsage } from '../transport';

const SYSTEM_PROMPT_DELIMITER = '=== TASK ===';

/** Codex has no system-prompt flag, so the two prompts are concatenated with a visible boundary. */
export const combineCodexPrompt = (systemPrompt: string, userPrompt: string): string =>
  `${systemPrompt}\n\n${SYSTEM_PROMPT_DELIMITER}\n\n${userPrompt}`;

/** TOML basic-string escaping, which matters most for Windows paths full of backslashes. */
export const tomlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;

const tomlStringArray = (values: readonly string[]): string => `[${values.map(tomlString).join(',')}]`;

export type CodexArgsInput = {
  mcpServer: { command: string; args: readonly string[]; env: Record<string, string> };
  model?: string;
};

export const buildCodexArgs = (input: CodexArgsInput): string[] => [
  'exec',
  // `-` reads the prompt from stdin. Not optional: a long prompt passed as a single argv entry
  // crashes Codex on Windows outright.
  '-',
  '--json',
  '--skip-git-repo-check',
  '--ignore-user-config',
  '--sandbox',
  'read-only',
  ...(input.model === undefined ? [] : ['--model', input.model]),
  '-c',
  'features.shell_tool=false',
  // Booleans here, not the string enum some documentation shows — the string form fails config parsing.
  '-c',
  'tools.web_search=false',
  '-c',
  'tools.view_image=false',
  '-c',
  `mcp_servers.${INIT_MCP_SERVER_NAME}.command=${tomlString(input.mcpServer.command)}`,
  '-c',
  `mcp_servers.${INIT_MCP_SERVER_NAME}.args=${tomlStringArray(input.mcpServer.args)}`,
  '-c',
  `mcp_servers.${INIT_MCP_SERVER_NAME}.required=true`,
  // Non-interactive runs cancel every MCP call without this. `prompt` has nobody to ask, `auto`
  // still cancels, and an approval policy of `never` means never-ask-and-deny.
  '-c',
  `mcp_servers.${INIT_MCP_SERVER_NAME}.default_tools_approval_mode="approve"`,
  ...Object.entries(input.mcpServer.env).flatMap(([key, value]) => [
    '-c',
    `mcp_servers.${INIT_MCP_SERVER_NAME}.env.${key}=${tomlString(value)}`
  ])
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const canonicalToolName = (name: string): string =>
  /^(?:mcp__)?.*?__?(read_file|list_dir|glob|grep|get_project_brief|submit_facts)$/.exec(name)?.[1] ?? name;

export type CodexStreamResult = {
  events: AgentEvent[];
  usage: TokenUsage;
  stopReason: 'complete' | 'error';
  errorMessage?: string;
  /** Whether the stream reached a conclusion, mirroring the Claude transport's exit-code rule. */
  sawConclusion: boolean;
};

export const parseCodexStream = (lines: readonly string[]): CodexStreamResult => {
  const events: AgentEvent[] = [];
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let stopReason: CodexStreamResult['stopReason'] = 'error';
  let errorMessage: string | undefined = 'Codex produced no conclusion.';
  let sawConclusion = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    let event: unknown;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(event)) continue;

    const type = typeof event.type === 'string' ? event.type : '';

    if (type.endsWith('tool_call') || type === 'item.tool_call') {
      const name = typeof event.name === 'string' ? canonicalToolName(event.name) : 'tool';
      events.push({ type: 'tool-call', name, summary: name });
      continue;
    }

    if (type.includes('agent_message') || type === 'item.assistant_message') {
      const text = typeof event.text === 'string' ? event.text : typeof event.message === 'string' ? event.message : '';
      if (text !== '') events.push({ type: 'text', text });
      continue;
    }

    if (isRecord(event.usage)) {
      usage.inputTokens += typeof event.usage.input_tokens === 'number' ? event.usage.input_tokens : 0;
      usage.outputTokens += typeof event.usage.output_tokens === 'number' ? event.usage.output_tokens : 0;
    }

    // Subscription plan consumption. On a flat-rate plan this is the meaningful budget signal — a
    // dollar estimate there describes money nobody is spending.
    if (isRecord(event.rate_limits)) {
      for (const window of Object.values(event.rate_limits)) {
        if (isRecord(window) && typeof window.used_percent === 'number') {
          usage.planUsedPercent = Math.max(usage.planUsedPercent ?? 0, window.used_percent);
        }
      }
    }

    if (type === 'turn.completed') {
      sawConclusion = true;
      stopReason = 'complete';
      errorMessage = undefined;
    } else if (type === 'turn.failed' || type === 'error') {
      sawConclusion = true;
      stopReason = 'error';
      const message =
        isRecord(event.error) && typeof event.error.message === 'string' ? event.error.message : undefined;
      errorMessage = message ?? (typeof event.message === 'string' ? event.message : 'Codex reported an error.');
    }
  }

  if (usage.inputTokens > 0 || usage.outputTokens > 0 || usage.planUsedPercent !== undefined) {
    events.push({ type: 'usage', usage });
  }

  return { events, usage, stopReason, errorMessage, sawConclusion };
};
