/**
 * Entry point for the init-session MCP server, spawned as a child of a vendor CLI.
 *
 * Kept to almost nothing on purpose: everything worth testing lives in `session-server.ts`, and a
 * process entry point is the one thing a unit test cannot exercise. Anything written to stdout here
 * that is not MCP traffic corrupts the protocol, so diagnostics go to stderr without exception.
 */

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createInitMcpServer, readInitSessionStateFromEnv } from './session-server';

export const runInitMcpServer = async (): Promise<void> => {
  const state = await readInitSessionStateFromEnv();

  const stdioServer = serveStdio(() => createInitMcpServer(state), {
    // `serve`, not `reject`. The other Stacktape MCP server rejects the 2025-era protocol, and
    // copying that here cost us a live run: Claude Code negotiates the legacy era, the server turned
    // it away, and the agent started with no tools at all — no error, just an empty toolbox and a
    // session that ended without submitting anything. We do not choose our clients here, so we serve
    // whatever era they speak.
    legacy: 'serve',
    onerror: (error) => console.error(`[stacktape-init-mcp] ${error.message}`)
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
