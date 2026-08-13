/**
 * Running one analysis session against a vendor CLI.
 *
 * The shape is the same for every provider: hand the session's state to a child MCP server as files,
 * spawn the CLI pointed at it, watch the transcript, then collect whatever `submit_facts` accepted.
 * What differs per provider is only the argument list and the transcript format, which is why those
 * live in `transports/` as pure functions.
 *
 * The result never comes from the model's final text. It comes from a tool call, which is what lets
 * a provider with no structured transcript at all still work.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { agentSubmissionSchema, type AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { initSessionEnvVars } from '../mcp/session-server';
import {
  TransportError,
  type AgentEvent,
  type AgentProviderId,
  type SessionHooks,
  type SessionOutcome,
  type SessionRunInput
} from './transport';
import {
  buildClaudeArgs,
  buildClaudeStdin,
  buildMcpConfig,
  interpretClaudeRun,
  spawnProcess,
  type Spawner
} from './transports/claude-cli';
import { buildCodexArgs, combineCodexPrompt, parseCodexStream } from './transports/codex-cli';

/**
 * How to re-invoke ourselves as the MCP server the vendor CLI talks to.
 *
 * The CLI ships as a compiled binary in release and as a script under `bun`/`node` in development,
 * so the command that starts a child copy is not a constant. Mirrors the resolution the existing
 * MCP runner uses rather than inventing a second answer.
 */
export const resolveInitMcpCommand = (): { command: string; args: string[] } => {
  const override = process.env.STACKTAPE_INIT_MCP_COMMAND;
  if (override) {
    // Arguments travel as JSON rather than as a space-separated string: a Windows path with a space
    // in it would otherwise split into two arguments, which fails in a way that looks like the
    // server is missing rather than like the command was mangled.
    const rawArgs = process.env.STACKTAPE_INIT_MCP_ARGS;
    let args: string[] = [];
    if (rawArgs) {
      try {
        const parsed: unknown = JSON.parse(rawArgs);
        args = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        args = [];
      }
    }
    return { command: override, args };
  }

  // In a development checkout, point at the dedicated minimal entry rather than at the dev harness.
  // Startup latency is not a nicety here: the agent's first turn happens whether or not the MCP
  // server has finished connecting, and a server that is slow to answer produces a run where the
  // model has no tools, invents nothing, submits nothing, and reports no error.
  const script = process.argv[1] ? resolve(process.argv[1]) : undefined;
  if (script && /\.(mjs|cjs|js|ts)$/.test(script) && existsSync(script)) {
    const minimalEntry = resolve(dirname(script), 'init-mcp.ts');
    return { command: process.execPath, args: [existsSync(minimalEntry) ? minimalEntry : script] };
  }

  const executableName = basename(process.execPath || '').toLowerCase();
  if (executableName.startsWith('bun') || executableName.startsWith('node')) {
    return { command: 'stacktape', args: [] };
  }
  return { command: process.execPath, args: [] };
};

type SessionPaths = {
  directory: string;
  filesFile: string;
  briefFile: string;
  submissionFile: string;
  mcpConfigPath: string;
  /**
   * A disposable working directory for the child process.
   *
   * Codex cannot disable `apply_patch`, so it runs here: a stray patch lands somewhere we delete
   * rather than in the user's repository. Our tools address the project by absolute root, so nothing
   * legitimate depends on the working directory being the project.
   */
  scratchDirectory: string;
};

const prepareSession = async (input: SessionRunInput): Promise<SessionPaths> => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-init-'));
  const scratchDirectory = join(directory, 'scratch');
  await mkdir(scratchDirectory, { recursive: true });

  const paths: SessionPaths = {
    directory,
    scratchDirectory,
    filesFile: join(directory, 'files.json'),
    briefFile: join(directory, 'brief.json'),
    submissionFile: join(directory, 'submission.json'),
    mcpConfigPath: join(directory, 'mcp.json')
  };

  await writeFile(paths.filesFile, JSON.stringify(input.files), 'utf8');
  await writeFile(paths.briefFile, JSON.stringify(input.brief), 'utf8');

  const mcp = resolveInitMcpCommand();
  await writeFile(
    paths.mcpConfigPath,
    buildMcpConfig({
      command: mcp.command,
      args: mcp.args,
      env: {
        STACKTAPE_INIT_MCP: '1',
        [initSessionEnvVars.root]: input.repositoryRoot,
        [initSessionEnvVars.filesFile]: paths.filesFile,
        [initSessionEnvVars.briefFile]: paths.briefFile,
        [initSessionEnvVars.submissionFile]: paths.submissionFile
      }
    }),
    'utf8'
  );

  return paths;
};

const collectSubmission = async (submissionFile: string): Promise<AgentSubmission | undefined> => {
  try {
    const parsed = agentSubmissionSchema.safeParse(JSON.parse(await readFile(submissionFile, 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    // No file means the agent never submitted, which the caller reports as `no-submission`.
    return undefined;
  }
};

export type RunSessionOptions = {
  provider: Extract<AgentProviderId, 'claude-code' | 'codex'>;
  executable: string;
  model?: string;
  spawner?: Spawner;
};

/**
 * Run one session and return what it produced.
 *
 * Provider failures are reported, not thrown, except for the retryable ones — the caller decides
 * whether spending more of the user's subscription on a retry is worthwhile.
 */
export const runAgentSession = async (
  input: SessionRunInput,
  hooks: SessionHooks,
  options: RunSessionOptions
): Promise<SessionOutcome> => {
  const spawner = options.spawner ?? spawnProcess;
  const paths = await prepareSession(input);

  try {
    const isClaude = options.provider === 'claude-code';
    const mcp = resolveInitMcpCommand();

    const args = isClaude
      ? buildClaudeArgs({
          systemPrompt: input.systemPrompt,
          maxTurns: input.budget.maxTurns,
          mcpConfigPath: paths.mcpConfigPath,
          ...(options.model === undefined ? {} : { model: options.model })
        })
      : buildCodexArgs({
          mcpServer: {
            command: mcp.command,
            args: mcp.args,
            env: {
              STACKTAPE_INIT_MCP: '1',
              [initSessionEnvVars.root]: input.repositoryRoot,
              [initSessionEnvVars.filesFile]: paths.filesFile,
              [initSessionEnvVars.briefFile]: paths.briefFile,
              [initSessionEnvVars.submissionFile]: paths.submissionFile
            }
          },
          ...(options.model === undefined ? {} : { model: options.model })
        });

    const stdin = isClaude
      ? buildClaudeStdin(input.userPrompt)
      : combineCodexPrompt(input.systemPrompt, input.userPrompt);

    const result = await spawner({
      command: options.executable,
      args,
      // Claude is fully inert so it can run in the project; Codex runs in scratch because its patch
      // tool cannot be removed.
      cwd: isClaude ? input.repositoryRoot : paths.scratchDirectory,
      stdin,
      timeoutMs: input.budget.wallClockMs,
      ...(input.signal === undefined ? {} : { signal: input.signal })
    });

    const emit = (events: readonly AgentEvent[]) => {
      for (const event of events) hooks.onEvent(event);
    };

    if (isClaude) {
      const interpreted = interpretClaudeRun(result);
      if ('failure' in interpreted) {
        throw interpreted.failure;
      }
      emit(interpreted.parsed.events);
      const submission = await collectSubmission(paths.submissionFile);
      return {
        ...(submission === undefined ? {} : { submission }),
        usage: interpreted.parsed.usage,
        stopReason:
          submission === undefined && interpreted.parsed.stopReason === 'complete'
            ? 'no-submission'
            : interpreted.parsed.stopReason,
        ...(interpreted.parsed.errorMessage === undefined ? {} : { errorMessage: interpreted.parsed.errorMessage })
      };
    }

    if (result.timedOut) {
      throw new TransportError({ message: 'Codex timed out.', retryable: true });
    }
    const parsed = parseCodexStream(result.stdout.split(/\r?\n/));
    if (result.exitCode !== 0 && !parsed.sawConclusion) {
      throw new TransportError({ message: `Codex exited with ${result.exitCode}: ${result.stderr.slice(0, 400)}` });
    }
    emit(parsed.events);
    const submission = await collectSubmission(paths.submissionFile);
    return {
      ...(submission === undefined ? {} : { submission }),
      usage: parsed.usage,
      stopReason: submission === undefined && parsed.stopReason === 'complete' ? 'no-submission' : parsed.stopReason,
      ...(parsed.errorMessage === undefined ? {} : { errorMessage: parsed.errorMessage })
    };
  } finally {
    // Always, including on a thrown transport error: the scratch directory may hold whatever Codex
    // decided to patch, and the session files describe the user's project.
    await rm(paths.directory, { recursive: true, force: true });
  }
};

/** Backoff between attempts. Throttling waits longer, because retrying immediately just re-throttles. */
const RETRY_DELAYS_MS = [20_000, 60_000] as const;

export const runAgentSessionWithRetry = async (
  input: SessionRunInput,
  hooks: SessionHooks,
  options: RunSessionOptions & { retryDelaysMs?: readonly number[] }
): Promise<SessionOutcome> => {
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await runAgentSession(input, hooks, options);
    } catch (error) {
      const transportError = error instanceof TransportError ? error : undefined;
      if (transportError === undefined || !transportError.retryable || attempt >= delays.length) {
        return {
          usage: { inputTokens: 0, outputTokens: 0 },
          stopReason: transportError?.rateLimited === true ? 'error' : 'error',
          errorMessage: error instanceof Error ? error.message : String(error)
        };
      }
      const waitMs = delays[attempt]! * (transportError.rateLimited ? 3 : 1);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs));
    }
  }
};
