import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

export type ConnectionCheck = {
  ok: boolean;
  protocolVersion?: string;
  toolCount?: number;
  /** Why the server did not answer, when it did not. */
  reason?: string;
  stderrTail?: string;
};

const CONNECT_TIMEOUT_MS = 30_000;
const STDERR_TAIL_CHARS = 600;

/**
 * Starts the exact command written into an agent's config and completes the MCP handshake the way a 2025-era agent
 * does, then lists the tools. This is what the agent will do on its next start, so a pass here means the entry works
 * with this command on this machine (the agent's own PATH can still differ, see `resolveServerCommand`).
 */
export const verifyMcpServerCommand = async ({
  command,
  args,
  env
}: {
  command: string;
  args: string[];
  env?: Record<string, string>;
}): Promise<ConnectionCheck> => {
  const stderrChunks: string[] = [];
  const transport = new StdioClientTransport({
    command,
    args,
    stderr: 'pipe',
    env: { ...(process.env as Record<string, string>), ...env }
  });
  transport.stderr?.on('data', (chunk) => stderrChunks.push(String(chunk)));
  const client = new Client(
    { name: 'stacktape-mcp-add-check', version: '1.0.0' },
    { versionNegotiation: { mode: 'legacy' }, capabilities: {} }
  );
  const stderrTail = () => stderrChunks.join('').trim().slice(-STDERR_TAIL_CHARS) || undefined;

  try {
    await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });
    const { tools } = await client.listTools(undefined, { timeout: CONNECT_TIMEOUT_MS });
    return { ok: true, protocolVersion: client.getNegotiatedProtocolVersion() ?? 'unknown', toolCount: tools.length };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error), stderrTail: stderrTail() };
  } finally {
    await client.close().catch(() => {});
  }
};
