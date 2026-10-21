// Real-task suite for the Stacktape MCP server: runs the tasks in real-tasks/tasks.ts with Claude Code or Codex against
// a deployed project, the way a developer would ask, and records whether the agent found Stacktape's tools, what it
// used instead, and whether the task got done.
//
// Nothing tells the agent to use Stacktape. In the `crowded` setup the agent also has the MCP servers developers
// commonly install (recorded tool lists replayed by replay-mcp.ts), so Stacktape's tools have to win tool search.
//
// Setup (once): bash real-tasks/prepare.sh, bash real-tasks/stack.sh deploy, bash real-tasks/stack.sh seed
// Run:          bun scripts/e2e-mcp/run-real-tasks.ts
// Options (env): RT_CLIENT=claude|codex, RT_SETUP=crowded|alone, RT_MODEL, RT_ONLY=id,id, RT_REPEAT, RT_CONCURRENCY,
//                RT_TIMEOUT_MS, MCP_BENCH_DIR
// Results:      $MCP_BENCH_DIR/runs/<timestamp>/ (summary.md, results.json, one folder per run)

import { spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS, type Task } from './real-tasks/tasks';

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const REAL_TASKS_DIR = join(E2E_DIR, 'real-tasks');
const BENCH_DIR = process.env.MCP_BENCH_DIR || join(homedir(), '.cache', 'stacktape-mcp-bench');
const CLIENT = (process.env.RT_CLIENT || 'claude') as 'claude' | 'codex';
const SETUP = (process.env.RT_SETUP || 'crowded') as 'crowded' | 'alone';
const MODEL = process.env.RT_MODEL || (CLIENT === 'claude' ? 'sonnet' : undefined);
const ONLY = process.env.RT_ONLY?.split(',').filter(Boolean);
const REPEAT = Math.max(1, Number(process.env.RT_REPEAT || 1));
const CONCURRENCY = Math.max(1, Number(process.env.RT_CONCURRENCY || 3));
const TIMEOUT_MS = Number(process.env.RT_TIMEOUT_MS || 15 * 60 * 1000);

// Server names as a developer would register them; each replays a catalog recorded by capture-catalogs.ts.
const COMPETING_SERVERS = ['github', 'aws-api', 'aws-cloudwatch', 'aws-knowledge', 'context7', 'playwright', 'sentry'];

type ToolCall = {
  kind: 'stacktape' | 'other-mcp' | 'tool-search' | 'shell' | 'builtin';
  name: string;
  input: unknown;
};

type RunResult = {
  runId: string;
  task: string;
  category: Task['category'];
  client: string;
  setup: string;
  model?: string;
  pass: boolean;
  problems: string[];
  usedStacktapeMcp: boolean;
  firstDomainCall?: string;
  stacktapeMcpCalls: number;
  otherMcpCalls: string[];
  shellStacktapeCalls: string[];
  shellAwsCalls: string[];
  toolSearches: string[];
  stacktapeCommands: string[];
  turns?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  finalText: string;
  timedOut: boolean;
};

const AWS_SHELL_RE = /(^|[\s;&|(])aws\s+[a-z]/;
const STACKTAPE_SHELL_RE = /(^|[\s;&|(/])stacktape(\.exe)?\s+[a-z]/;

const readLines = (path: string) =>
  existsSync(path)
    ? readFileSync(path, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        })
    : [];

const prepareProject = (runDir: string) => {
  const projectDir = join(runDir, 'project');
  spawnSync('cp', ['-a', join(BENCH_DIR, 'template'), projectDir], { stdio: 'inherit' });
  // A developer's project is a Git repository; agents look at it with git status and diff.
  writeFileSync(join(projectDir, '.gitignore'), 'node_modules\n.stacktape\n');
  for (const args of [
    ['init', '-q', '-b', 'main'],
    ['add', '-A'],
    ['-c', 'user.name=dev', '-c', 'user.email=dev@example.com', 'commit', '-qm', 'Initial commit']
  ]) {
    spawnSync('git', args, { cwd: projectDir });
  }
  return projectDir;
};

const stacktapeServer = () => ({ command: join(REAL_TASKS_DIR, 'stacktape-mcp.sh'), args: [] as string[] });
const replayServer = (name: string) => ({ command: 'bun', args: [join(E2E_DIR, 'replay-mcp.ts'), name] });
const serversFor = () => ({
  stacktape: stacktapeServer(),
  ...(SETUP === 'crowded' ? Object.fromEntries(COMPETING_SERVERS.map((name) => [name, replayServer(name)])) : {})
});

const tomlString = (value: string) => JSON.stringify(value);

// Codex reads ~/.codex/AGENTS.md and config.toml; a separate CODEX_HOME keeps the owner's instructions out of the run.
// The login is linked, and copied back afterwards if Codex refreshed it during the run.
const prepareCodexHome = (runDir: string, env: Record<string, string>) => {
  const codexHome = join(runDir, 'codex-home');
  mkdirSync(codexHome, { recursive: true });
  symlinkSync(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json'));
  const servers = Object.entries(serversFor())
    .map(
      ([name, server]) =>
        `[mcp_servers.${tomlString(name)}]\ncommand = ${tomlString(server.command)}\nargs = [${server.args.map(tomlString).join(', ')}]\nstartup_timeout_sec = 60\ntool_timeout_sec = 900\n` +
        `env = { ${['E2E_REPLAY_LOG', 'MCP_BENCH_DIR', 'E2E_SHIM_LOG'].map((key) => `${key} = ${tomlString(env[key])}`).join(', ')} }\n`
    )
    .join('\n');
  writeFileSync(join(codexHome, 'config.toml'), `${MODEL ? `model = ${tomlString(MODEL)}\n` : ''}${servers}`);
  return codexHome;
};

const restoreCodexLogin = (codexHome: string) => {
  const linked = join(codexHome, 'auth.json');
  if (existsSync(linked) && !lstatSync(linked).isSymbolicLink()) {
    copyFileSync(linked, join(homedir(), '.codex', 'auth.json'));
  }
};

const runAgent = ({
  prompt,
  runDir,
  projectDir,
  env
}: {
  prompt: string;
  runDir: string;
  projectDir: string;
  env: Record<string, string>;
}): Promise<{ timedOut: boolean; durationMs: number }> => {
  let command: string;
  let args: string[];
  const childEnv: Record<string, string> = { ...(process.env as Record<string, string>), ...env };
  if (CLIENT === 'claude') {
    const configPath = join(runDir, 'mcp-config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: Object.fromEntries(
          Object.entries(serversFor()).map(([name, server]) => [name, { type: 'stdio', ...server }])
        )
      })
    );
    command = 'claude';
    args = [
      '-p',
      ...(MODEL ? ['--model', MODEL] : []),
      '--output-format',
      'stream-json',
      '--verbose',
      '--mcp-config',
      configPath,
      '--strict-mcp-config',
      '--setting-sources',
      'project',
      '--permission-mode',
      'bypassPermissions',
      prompt
    ];
    // The owner's CLAUDE.md files and memory describe this machine, not a Stacktape user's.
    childEnv.CLAUDE_CODE_DISABLE_CLAUDE_MDS = '1';
    childEnv.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
    childEnv.MCP_CONNECTION_NONBLOCKING = 'false';
  } else {
    childEnv.CODEX_HOME = prepareCodexHome(runDir, env);
    command = 'codex';
    args = [
      'exec',
      '--json',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-C',
      projectDir,
      prompt
    ];
  }

  const started = Date.now();
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd: projectDir, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, TIMEOUT_MS);
    const events: string[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => events.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', () => {
      clearTimeout(timer);
      writeFileSync(join(runDir, 'events.jsonl'), events.join(''));
      writeFileSync(join(runDir, 'stderr.log'), stderr);
      if (CLIENT === 'codex') restoreCodexLogin(childEnv.CODEX_HOME);
      resolveRun({ timedOut, durationMs: Date.now() - started });
    });
  });
};

const classify = (name: string): ToolCall['kind'] => {
  if (name.startsWith('mcp__stacktape__') || name.startsWith('stacktape.')) return 'stacktape';
  if (name.startsWith('mcp__') || name.includes('.')) return 'other-mcp';
  if (name === 'ToolSearch' || name === 'tool_search') return 'tool-search';
  if (name === 'Bash' || name === 'shell') return 'shell';
  return 'builtin';
};

const parseClaude = (events: any[]) => {
  const calls: ToolCall[] = [];
  const texts: string[] = [];
  let usage: Partial<RunResult> = {};
  for (const event of events) {
    if (event.type === 'assistant') {
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_use') {
          calls.push({ kind: classify(block.name), name: block.name, input: block.input });
        } else if (block.type === 'text') {
          texts.push(block.text);
        }
      }
    }
    if (event.type === 'result') {
      if (typeof event.result === 'string') texts.push(event.result);
      usage = {
        turns: event.num_turns,
        costUsd: event.total_cost_usd,
        inputTokens:
          (event.usage?.input_tokens ?? 0) +
          (event.usage?.cache_read_input_tokens ?? 0) +
          (event.usage?.cache_creation_input_tokens ?? 0),
        outputTokens: event.usage?.output_tokens
      };
    }
  }
  return { calls, finalText: texts.join('\n'), usage };
};

const parseCodex = (events: any[]) => {
  const calls: ToolCall[] = [];
  const texts: string[] = [];
  const usage = { turns: 0, inputTokens: 0, outputTokens: 0 };
  for (const event of events) {
    const item = event.item;
    if (event.type === 'item.completed' && item) {
      if (item.type === 'mcp_tool_call') {
        const name = `${item.server}.${item.tool}`;
        calls.push({ kind: classify(name), name, input: item.arguments });
      } else if (item.type === 'command_execution') {
        calls.push({ kind: 'shell', name: 'shell', input: { command: item.command } });
      } else if (item.type === 'agent_message') {
        texts.push(item.text);
      } else if (item.type !== 'reasoning') {
        calls.push({ kind: /search/i.test(item.type) ? 'tool-search' : 'builtin', name: item.type, input: item });
      }
    }
    if (event.type === 'turn.completed') {
      usage.turns += 1;
      usage.inputTokens += event.usage?.input_tokens ?? 0;
      usage.outputTokens += event.usage?.output_tokens ?? 0;
    }
  }
  return { calls, finalText: texts.join('\n'), usage };
};

const shellCommand = (call: ToolCall) => String((call.input as { command?: unknown })?.command ?? '');

const stacktapeCommandsFrom = (calls: ToolCall[], shimCalls: { args: string[] }[]) => {
  const commands: string[] = [];
  for (const call of calls) {
    if (call.kind !== 'stacktape') continue;
    const input = (call.input ?? {}) as { action?: string; command?: string };
    if (/stacktape_cli$/.test(call.name) && input.action === 'run' && input.command) commands.push(input.command);
    if (/stacktape_dev$/.test(call.name) && input.action) commands.push(`dev:${input.action}`);
  }
  for (const shim of shimCalls) if (shim.args[0]) commands.push(shim.args[0]);
  return commands;
};

const isDomainCall = (call: ToolCall) =>
  call.kind === 'stacktape' ||
  call.kind === 'other-mcp' ||
  (call.kind === 'shell' && (AWS_SHELL_RE.test(shellCommand(call)) || STACKTAPE_SHELL_RE.test(shellCommand(call))));

const describeCall = (call: ToolCall) => {
  if (call.kind === 'shell') return `shell: ${shellCommand(call).slice(0, 80)}`;
  const input = call.input as { action?: string; command?: string };
  return [call.name, input?.action, input?.command].filter(Boolean).join(' ');
};

const runOne = async (
  task: Task,
  iteration: number,
  outDir: string,
  values: { apiUrl: string; legacyOrderId: string }
) => {
  const runId = `${task.id}${REPEAT > 1 ? `-r${iteration}` : ''}`;
  const runDir = join(outDir, runId);
  mkdirSync(runDir, { recursive: true });
  const projectDir = prepareProject(runDir);
  const env = {
    PATH: `${join(REAL_TASKS_DIR, 'bin')}:${process.env.PATH}`,
    MCP_BENCH_DIR: BENCH_DIR,
    E2E_SHIM_LOG: join(runDir, 'shell-stacktape.jsonl'),
    E2E_REPLAY_LOG: join(runDir, 'other-mcp-calls.jsonl'),
    // A developer's shell has AWS credentials; here they are hidden so no command can reach another account.
    AWS_CONFIG_FILE: join(BENCH_DIR, 'no-aws-config'),
    AWS_SHARED_CREDENTIALS_FILE: join(BENCH_DIR, 'no-aws-credentials'),
    AWS_EC2_METADATA_DISABLED: 'true'
  };
  const prompt = task.prompt(values);
  writeFileSync(join(runDir, 'prompt.txt'), prompt);
  const { timedOut, durationMs } = await runAgent({ prompt, runDir, projectDir, env });

  const events = readLines(join(runDir, 'events.jsonl'));
  const { calls, finalText, usage } = CLIENT === 'claude' ? parseClaude(events) : parseCodex(events);
  const shimCalls = readLines(env.E2E_SHIM_LOG) as { args: string[] }[];
  const stacktapeCommands = stacktapeCommandsFrom(calls, shimCalls);
  let problems: string[];
  try {
    problems = await task.check({ finalText, projectDir, stacktapeCommands, ...values });
  } catch (error) {
    problems = [`check failed: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (timedOut) problems.push('timed out');
  const firstDomain = calls.find(isDomainCall);
  const result: RunResult = {
    runId,
    task: task.id,
    category: task.category,
    client: CLIENT,
    setup: SETUP,
    model: MODEL,
    pass: problems.length === 0,
    problems,
    usedStacktapeMcp: calls.some((call) => call.kind === 'stacktape'),
    firstDomainCall: firstDomain ? describeCall(firstDomain) : undefined,
    stacktapeMcpCalls: calls.filter((call) => call.kind === 'stacktape').length,
    otherMcpCalls: calls.filter((call) => call.kind === 'other-mcp').map(describeCall),
    shellStacktapeCalls: shimCalls.map((call) => call.args.join(' ')),
    shellAwsCalls: calls
      .filter((call) => call.kind === 'shell' && AWS_SHELL_RE.test(shellCommand(call)))
      .map(shellCommand),
    toolSearches: calls
      .filter((call) => call.kind === 'tool-search')
      .map((call) => JSON.stringify(call.input).slice(0, 160)),
    stacktapeCommands,
    ...usage,
    durationMs,
    finalText,
    timedOut
  };
  writeFileSync(join(runDir, 'calls.json'), JSON.stringify(calls, null, 2));
  writeFileSync(join(runDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(
    `${result.pass ? 'PASS' : 'FAIL'} ${runId} stacktape=${result.stacktapeMcpCalls} other=${result.otherMcpCalls.length} ` +
      `shell(stacktape)=${result.shellStacktapeCalls.length} shell(aws)=${result.shellAwsCalls.length} ` +
      `${(durationMs / 1000).toFixed(0)}s${result.problems.length ? ` — ${result.problems.join('; ')}` : ''}`
  );
  return result;
};

const resetStack = () => {
  console.log('Redeploying the original project...');
  const deploy = spawnSync('bash', [join(REAL_TASKS_DIR, 'stack.sh'), 'deploy'], { encoding: 'utf-8' });
  if (deploy.status !== 0 || !/"ok":true/.test(deploy.stdout))
    throw new Error(`Reset deploy failed: ${deploy.stdout.slice(-500)}`);
};

const renderSummary = (results: RunResult[]) => {
  const count = (predicate: (result: RunResult) => boolean) => results.filter(predicate).length;
  const lines = [
    `# Real-task run: ${CLIENT}${MODEL ? ` (${MODEL})` : ''}, ${SETUP}`,
    '',
    `- Tasks done: ${count((r) => r.pass)}/${results.length}`,
    `- Used Stacktape MCP: ${count((r) => r.usedStacktapeMcp)}/${results.length}`,
    `- First domain call was Stacktape MCP: ${count((r) => r.firstDomainCall?.startsWith('mcp__stacktape') || r.firstDomainCall?.startsWith('stacktape.') || false)}/${results.length}`,
    `- Called another MCP server: ${count((r) => r.otherMcpCalls.length > 0)}`,
    `- Ran stacktape in the shell: ${count((r) => r.shellStacktapeCalls.length > 0)}`,
    `- Ran aws in the shell: ${count((r) => r.shellAwsCalls.length > 0)}`,
    '',
    '| task | done | Stacktape MCP calls | first domain call | other MCP | shell stacktape | shell aws | turns | time | problems |',
    '|---|---|---:|---|---|---:|---:|---:|---:|---|'
  ];
  for (const r of results) {
    lines.push(
      `| ${r.runId} | ${r.pass ? 'yes' : 'no'} | ${r.stacktapeMcpCalls} | ${r.firstDomainCall ?? '—'} | ${r.otherMcpCalls.join('<br>') || '—'} | ${r.shellStacktapeCalls.length} | ${r.shellAwsCalls.length} | ${r.turns ?? '—'} | ${(r.durationMs / 1000).toFixed(0)}s | ${r.problems.join('<br>') || '—'} |`
    );
  }
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const apiUrl = readFileSync(join(BENCH_DIR, 'api-url'), 'utf-8').trim();
  const legacyOrderId = readFileSync(join(BENCH_DIR, 'legacy-order-id'), 'utf-8').trim();
  const outDir = join(BENCH_DIR, 'runs', `${new Date().toISOString().replace(/[:.]/g, '-')}-${CLIENT}-${SETUP}`);
  mkdirSync(outDir, { recursive: true });
  const selected = ONLY ? TASKS.filter((task) => ONLY.includes(task.id)) : TASKS;
  const jobs = selected.flatMap((task) =>
    Array.from({ length: REPEAT }, (_, index) => ({ task, iteration: index + 1 }))
  );
  console.log(`${jobs.length} run(s): client=${CLIENT} setup=${SETUP} model=${MODEL ?? 'default'} → ${outDir}`);

  const results: RunResult[] = [];
  const parallelJobs = jobs.filter((job) => !job.task.changesStack);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, parallelJobs.length) }, async () => {
      while (next < parallelJobs.length) {
        const job = parallelJobs[next++];
        results.push(await runOne(job.task, job.iteration, outDir, { apiUrl, legacyOrderId }));
      }
    })
  );
  // Tasks that change the deployed stack run alone, each followed by a redeploy of the original project.
  for (const job of jobs.filter((job) => job.task.changesStack)) {
    results.push(await runOne(job.task, job.iteration, outDir, { apiUrl, legacyOrderId }));
    resetStack();
  }

  results.sort((a, b) => a.runId.localeCompare(b.runId));
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  writeFileSync(join(outDir, 'summary.md'), renderSummary(results));
  console.log(`\n${renderSummary(results)}\nResults: ${outDir}`);
  if (readdirSync(outDir).length === 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
