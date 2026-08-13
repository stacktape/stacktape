/**
 * The MCP server a vendor CLI talks to during an init session.
 *
 * Deliberately *not* the Stacktape MCP server in `src/commands/mcp`. That one exposes
 * `stacktape_cli`, which can deploy. Switching off an agent's shell accomplishes nothing if the one
 * tool we then hand it can create infrastructure, so the init session gets its own registry built
 * from an empty map: read the project, and submit findings. Nothing else is reachable, and nothing
 * new becomes reachable by someone adding a tool to the other server.
 *
 * ## Why there is no record-and-replay here
 *
 * The usual difficulty with this arrangement is that tool handlers are closures in the parent
 * process and cannot be shipped into the spawned child, so calls have to be recorded and replayed
 * afterwards — which means the model gets a fake acknowledgement instead of a real answer.
 *
 * That does not apply to these tools, because all but one are *pure reads over state the child can
 * rebuild for itself*: a repository root, a file listing and a brief, all of which cross as plain
 * data. So the child runs the real implementations and returns real answers.
 *
 * `submit_facts` is the single exception, and only for its side effect. Its validation is pure and
 * runs in the child — which is the important half, because an invalid submission has to be rejected
 * while the model is still there to fix it. The accepted result is handed to the parent by writing
 * it to a file the parent reads once the session ends.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import type { AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { createInitTools, type InitToolContext } from '../tools';
import { Workspace } from '../tools/workspace';

/** The name the tools appear under to the model, as `mcp__stacktape_init__<tool>`. */
export const INIT_MCP_SERVER_NAME = 'stacktape_init';

/**
 * Pinned to the same version the main Stacktape MCP server speaks.
 *
 * That server is already talking to Claude Code and Codex in production, so this is a version the
 * vendor CLIs are known to negotiate rather than one chosen on paper.
 */
export const INIT_MCP_PROTOCOL_VERSION = '2026-07-28';

/**
 * How the parent hands the session's state to the child.
 *
 * Environment rather than argv: Windows argv limits are what make long prompts crash `codex`, and
 * there is no reason to risk the same class of failure with a file listing.
 */
export const initSessionEnvVars = {
  root: 'STACKTAPE_INIT_ROOT',
  filesFile: 'STACKTAPE_INIT_FILES',
  briefFile: 'STACKTAPE_INIT_BRIEF',
  submissionFile: 'STACKTAPE_INIT_SUBMISSION'
} as const;

export type InitSessionState = {
  root: string;
  files: readonly string[];
  brief: ProjectFacts;
  /** Where an accepted submission is written for the parent to collect. */
  submissionFile: string;
};

export const readInitSessionStateFromEnv = async (env: NodeJS.ProcessEnv = process.env): Promise<InitSessionState> => {
  const root = env[initSessionEnvVars.root];
  const filesFile = env[initSessionEnvVars.filesFile];
  const briefFile = env[initSessionEnvVars.briefFile];
  const submissionFile = env[initSessionEnvVars.submissionFile];

  if (!root || !filesFile || !briefFile || !submissionFile) {
    throw new Error('Init MCP server started without its session environment.');
  }

  return {
    root,
    files: JSON.parse(await readFile(filesFile, 'utf8')) as string[],
    brief: JSON.parse(await readFile(briefFile, 'utf8')) as ProjectFacts,
    submissionFile
  };
};

/**
 * Build the init-session MCP server.
 *
 * `onSubmit` defaults to writing the accepted submission where the parent will look for it. Tests
 * pass their own to observe it directly.
 */
export const createInitMcpServer = (
  state: InitSessionState,
  options: { onSubmit?: (submission: AgentSubmission) => void | Promise<void> } = {}
): McpServer => {
  const server = new McpServer(
    { name: INIT_MCP_SERVER_NAME, version: '1' },
    {
      supportedProtocolVersions: [INIT_MCP_PROTOCOL_VERSION],
      instructions:
        'These are the only tools available. Describe what this repository IS, citing a file and line for every ' +
        'claim, then call submit_facts. Anything you cannot establish from the repository goes in "unknowns" — ' +
        'never guess a value.',
      capabilities: { tools: {} }
    }
  );

  const context: InitToolContext = {
    workspace: new Workspace(state.root),
    files: state.files,
    brief: state.brief,
    onSubmit: (submission) => {
      void (options.onSubmit
        ? options.onSubmit(submission)
        : writeFile(state.submissionFile, JSON.stringify(submission), 'utf8'));
    }
  };

  for (const tool of createInitTools()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: fromJsonSchema<Record<string, unknown>>(tool.inputJsonSchema as never)
      },
      async (args: unknown) => {
        const result = await tool.execute(args, context);
        // MCP carries text; the models read JSON perfectly well and it keeps the transport dumb.
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      }
    );
  }

  return server;
};
