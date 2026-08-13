/**
 * Development entry point for the init-session MCP server.
 *
 * Deliberately tiny. The obvious approach — re-invoke `dev.ts` with a trigger — makes the agent's
 * MCP child load the entire build toolchain before it can answer a handshake, and Claude Code moves
 * on without it: the model takes its first turn with no tools at all, answers from nothing, and the
 * run ends with no submission and no error anywhere. Importing only the server keeps startup to what
 * the server itself costs.
 */
import { runInitMcpServer } from '../src/init/mcp/bin';

// Not top-level `await`: this file is part of the CLI's own TypeScript project, whose target predates
// it. The failure would surface as an agent run with no tools rather than as a build error.
void runInitMcpServer();
