/**
 * Which coding agents are installed, and what each can actually do.
 *
 * Capabilities are recorded rather than assumed because the three supported CLIs differ in ways that
 * change how we drive them, and every one of these was established by running the thing rather than
 * by reading a page:
 *
 * - Claude Code takes `--tools ""` and switches every built-in off. Codex cannot disable
 *   `apply_patch`, so it runs in a scratch working directory where a stray write lands somewhere we
 *   delete. Copilot denies built-ins by kind.
 * - Only Claude Code enforces a turn ceiling for us. The others degrade to a wall-clock timeout.
 * - Only Claude Code accepts a system prompt out of band; the others take it inline behind a
 *   delimiter.
 * - Copilot emits no structured transcript at all — survivable, because the result arrives through
 *   `submit_facts` and our own MCP server sees every tool call, so the timeline comes from our side.
 */

import { terminateChild } from '../terminate-child';
import { spawn } from 'node:child_process';
import type { AgentProviderId } from './transport';

export type AgentCapabilities = {
  /** Every built-in tool can be switched off, so our tools are genuinely the only ones. */
  canDisableBuiltInTools: boolean;
  /** The CLI enforces a maximum number of turns; otherwise budgets are wall-clock only. */
  enforcesTurnLimit: boolean;
  /** A system prompt can be passed out of band rather than prepended to the user prompt. */
  acceptsSystemPrompt: boolean;
  /** The CLI emits a machine-readable transcript we can render directly. */
  emitsStructuredTranscript: boolean;
  /** Custom MCP servers can be registered per invocation, without touching the user's config. */
  isolatedMcpConfig: boolean;
};

export type DetectedAgent = {
  id: AgentProviderId;
  executable: string;
  version: string;
  capabilities: AgentCapabilities;
};

const PROVIDERS: ReadonlyArray<{
  id: Exclude<AgentProviderId, 'stacktape-hosted'>;
  executable: string;
  versionArgs: readonly string[];
  capabilities: AgentCapabilities;
}> = [
  {
    id: 'claude-code',
    executable: 'claude',
    versionArgs: ['--version'],
    capabilities: {
      canDisableBuiltInTools: true,
      enforcesTurnLimit: true,
      acceptsSystemPrompt: true,
      emitsStructuredTranscript: true,
      isolatedMcpConfig: true
    }
  },
  {
    id: 'codex',
    executable: 'codex',
    versionArgs: ['--version'],
    capabilities: {
      // `apply_patch` cannot be switched off, so containment comes from a scratch working directory
      // plus a read-only sandbox rather than from the tool list alone.
      canDisableBuiltInTools: false,
      enforcesTurnLimit: false,
      acceptsSystemPrompt: false,
      emitsStructuredTranscript: true,
      isolatedMcpConfig: true
    }
  },
  {
    id: 'copilot',
    executable: 'copilot',
    versionArgs: ['--version'],
    capabilities: {
      canDisableBuiltInTools: true,
      enforcesTurnLimit: false,
      acceptsSystemPrompt: false,
      emitsStructuredTranscript: false,
      // Copilot documents no flag for an alternative MCP config path, so a session has to work
      // around the user's global `~/.copilot/mcp-config.json` rather than replace it.
      isolatedMcpConfig: false
    }
  }
];

const VERSION_TIMEOUT_MS = 5_000;

/**
 * Run `<executable> --version` and return its first line, or undefined if it is not installed.
 *
 * `shell: true` on Windows because agent CLIs are installed as `.cmd` shims that `spawn` will not
 * find otherwise — a detail that silently reports every agent as missing if you skip it.
 */
const probeVersion = async (executable: string, args: readonly string[]): Promise<string | undefined> =>
  new Promise((resolveVersion) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executable, [...args], {
        stdio: ['ignore', 'pipe', 'ignore'],
        ...(process.platform === 'win32' ? { shell: true } : {})
      });
    } catch {
      resolveVersion(undefined);
      return;
    }

    let output = '';
    let settled = false;
    const settle = (value: string | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveVersion(value);
    };

    const timer = setTimeout(() => {
      terminateChild(child);
      settle(undefined);
    }, VERSION_TIMEOUT_MS);
    timer.unref?.();

    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', () => settle(undefined));
    child.on('close', (code) => {
      const firstLine = output.split(/\r?\n/).find((line) => line.trim() !== '');
      settle(code === 0 && firstLine !== undefined ? firstLine.trim() : undefined);
    });
  });

/**
 * Find every installed agent, probed concurrently.
 *
 * Ordered by how well each can be driven, so a caller taking the first entry gets the best available
 * without having to know the ranking.
 */
export const detectAgents = async (): Promise<DetectedAgent[]> => {
  const results = await Promise.all(
    PROVIDERS.map(async (provider): Promise<DetectedAgent | undefined> => {
      const version = await probeVersion(provider.executable, provider.versionArgs);
      return version === undefined
        ? undefined
        : {
            id: provider.id,
            executable: provider.executable,
            version,
            capabilities: provider.capabilities
          };
    })
  );

  return results.filter((entry): entry is DetectedAgent => entry !== undefined);
};
