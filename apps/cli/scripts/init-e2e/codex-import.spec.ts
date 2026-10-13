import { existsSync } from 'node:fs';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterEach, expect, test } from 'bun:test';
import { validateConfigYaml } from '../code-generation/validate-config-string';
import { parse as parseYaml } from 'yaml';
import {
  createInitSandbox,
  interruptSourceInitDuringAnalysis,
  runSourceInit,
  runScriptedModelQuality,
  type InitSandbox
} from './harness';
import type { AgentLogEntry, AgentScript } from './recorded-agent-cli';

const sandboxes: InitSandbox[] = [];
afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

const files = () => ({
  'package.json': JSON.stringify({
    name: 'billing',
    private: true,
    scripts: { start: 'node src/server.js' },
    dependencies: { express: '5.1.0' }
  }),
  'src/config.js':
    "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;\nmodule.exports = { port: Number(PORT), token: PAYMENTS_API_TOKEN };\n",
  'src/server.js':
    "const app = require('express')();\nconst config = require('./config');\napp.get('/', (_req, res) => res.send('ok'));\napp.listen(config.port);\n",
  '.env': 'PAYMENTS_API_TOKEN=codex-import-secret-canary\n'
});
const submission = {
  schemaVersion: 1,
  services: [
    {
      name: 'billing',
      path: '.',
      language: 'javascript',
      exposesHttp: true,
      executionModel: 'long-running',
      port: 8080,
      environmentVariables: [
        {
          name: 'PAYMENTS_API_TOKEN',
          role: 'third-party-secret',
          evidence: [
            { file: 'src/config.js', line: 1, quote: "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;" }
          ]
        }
      ],
      evidence: [
        {
          field: 'port',
          file: 'src/config.js',
          line: 1,
          quote: "const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;"
        }
      ]
    }
  ]
};
const newSandbox = async () => {
  const sandbox = await createInitSandbox({ files, provider: 'codex' });
  sandboxes.push(sandbox);
  return sandbox;
};
const toolResults = (log: AgentLogEntry[]) =>
  log.filter((entry): entry is Extract<AgentLogEntry, { type: 'tool-result' }> => entry.type === 'tool-result');
const configPath = (sandbox: InitSandbox) => join(sandbox.project, 'stacktape.yml');

// Exercises discovery, restrictive argv/TOML, stdin, stdio MCP, verification, composition, pricing and disk output.
test('Codex repairs refused facts and completes init with only cited contributions, then removes its scratch writes', async () => {
  const sandbox = await newSandbox();
  const sourceBefore = await readFile(join(sandbox.project, 'src/config.js'), 'utf8');
  const init = await runSourceInit({
    sandbox,
    args: ['--codingAgent', 'codex'],
    agent: {
      behavior: 'run',
      malformedStream: true,
      scratchWrite: true,
      calls: [
        { tool: 'get_project_brief', arguments: {} },
        { tool: 'read_file', arguments: { path: 'src/config.js' } },
        { tool: 'read_file', arguments: { path: '.env' } },
        { tool: 'read_file', arguments: { path: '../home/.aws/credentials' } },
        { tool: 'submit_facts', arguments: { schemaVersion: 99, services: [] } },
        {
          tool: 'submit_facts',
          arguments: {
            ...submission,
            dependencies: [
              {
                name: 'inventedCache',
                kind: 'redis',
                consumedBy: ['billing'],
                evidence: [{ field: 'kind', file: 'src/server.js', line: 1, quote: 'const redis = createClient();' }]
              }
            ]
          }
        },
        { tool: 'submit_facts', arguments: submission }
      ]
    }
  });
  expect(init.exitCode, init.output).toBe(0);
  expect(init.output).not.toContain('could not finish');
  const results = toolResults(init.agentLog);
  expect(results.find((entry) => entry.tool === 'get_project_brief')?.result).toMatchObject({
    brief: { services: [expect.objectContaining({ name: 'billing', path: '.' })] },
    fileCount: 4
  });
  expect(
    results.find((entry) => entry.tool === 'read_file' && entry.arguments.path === 'src/config.js')?.result
  ).toMatchObject({
    path: 'src/config.js',
    content: expect.stringContaining("const { PAYMENTS_API_TOKEN, PORT = '8080' } = process.env;")
  });
  expect(
    results
      .filter((entry) => entry.tool === 'submit_facts')
      .map((entry) => (entry.result as { accepted: boolean }).accepted)
  ).toEqual([false, false, true]);
  expect(results.find((entry) => entry.arguments.path === '../home/.aws/credentials')?.result).toMatchObject({
    reason: 'escapes-repository'
  });
  const config = await readFile(configPath(sandbox), 'utf8');
  expect(validateConfigYaml(config).errors).toEqual([]);
  expect(config).toContain("$Secret('payments_api_token')");
  expect(config).not.toContain('redis');
  const parsed = parseYaml(config) as {
    resources: Record<
      string,
      {
        type: string;
        properties: { environment: Array<{ name: string; value: unknown }>; port: number };
      }
    >;
  };
  expect(parsed.resources.billing?.type).toBe('web-service');
  expect(parsed.resources.billing?.properties.port).toBe(8080);
  expect(init.output).toContain('read_file');
  expect(init.output).toContain('submit_facts');
  expect(init.api.pricedConfigs).toEqual([config]);
  expect(init.api.unexpectedRequests).toEqual([]);
  expect(JSON.stringify(init.agentLog) + init.output + config + init.api.pricedConfigs.join('')).not.toContain(
    'codex-import-secret-canary'
  );
  const invocation = init.agentLog.find(
    (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
  );
  expect(invocation).toBeDefined();
  expect(invocation!.cwd).not.toBe(sandbox.project);
  expect(existsSync(dirname(invocation!.cwd))).toBe(false);
  expect(existsSync(join(sandbox.project, 'agent-patch.txt'))).toBe(false);
  expect(await readFile(join(sandbox.project, 'src/config.js'), 'utf8')).toBe(sourceBefore);
}, 90_000);

test('with Claude Code and Codex both installed, init drives Claude Code, whose built-ins can all be switched off', async () => {
  const sandbox = await newSandbox();
  const shim = process.platform === 'win32' ? ['codex.cmd', 'claude.cmd'] : ['codex', 'claude'];
  await copyFile(join(sandbox.bin, shim[0]!), join(sandbox.bin, shim[1]!));
  const init = await runSourceInit({
    sandbox,
    agent: {
      behavior: 'run',
      calls: [
        { tool: 'read_file', arguments: { path: 'src/config.js' } },
        { tool: 'submit_facts', arguments: submission }
      ]
    }
  });
  expect(init.exitCode, init.output).toBe(0);
  expect(init.output).toContain('Using claude-code (');
  const invocation = init.agentLog.find(
    (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
  );
  expect(invocation?.argv[0]).toBe('-p');
  expect(await readFile(configPath(sandbox), 'utf8')).toContain("$Secret('payments_api_token')");
}, 90_000);

const failures: Array<[string, AgentScript, string]> = [
  [
    'refusal',
    {
      behavior: 'run',
      calls: [],
      result: { subtype: 'error_during_execution', message: 'I cannot analyse this repository.' }
    },
    'I cannot analyse'
  ],
  [
    'no submission',
    { behavior: 'run', calls: [], result: { subtype: 'success', message: JSON.stringify(submission) } },
    ''
  ],
  [
    'malformed facts',
    {
      behavior: 'run',
      calls: [{ tool: 'submit_facts', arguments: { schemaVersion: 99, services: [] } }],
      malformedStream: true
    },
    ''
  ],
  ['provider crash', { behavior: 'fail', exitCode: 1, stderr: 'Invalid API key' }, 'Invalid API key']
];
test.each(failures)(
  'Codex %s leaves a valid scan-only config and explains the degradation',
  async (_name, agent, reason) => {
    const sandbox = await newSandbox();
    const init = await runSourceInit({ sandbox, args: ['--codingAgent', 'codex'], agent });
    expect(init.exitCode, init.output).toBe(0);
    expect(init.output).toContain('The coding agent could not finish, so this result uses file scans only.');
    if (reason) expect(init.output).toContain(reason);
    const config = await readFile(configPath(sandbox), 'utf8');
    expect(validateConfigYaml(config).errors).toEqual([]);
    expect(config).toContain('web-service');
    expect(config).not.toContain('PAYMENTS_API_TOKEN');
    expect(init.api.unexpectedRequests).toEqual([]);
    const invocation = init.agentLog.find(
      (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
    );
    expect(invocation).toBeDefined();
    expect(existsSync(dirname(invocation!.cwd))).toBe(false);
  },
  90_000
);

test.each(['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'] as const)(
  'cancelling Codex with %s stops it and its MCP server without saving config or session state',
  async (signal) => {
    const sandbox = await newSandbox();
    const interrupted = await interruptSourceInitDuringAnalysis({ sandbox, provider: 'codex', signal });
    expect(interrupted.exit, interrupted.output).toBeDefined();
    expect(interrupted.survivors).toEqual([]);
    expect(interrupted.output).toContain(`Received ${signal}`);
    expect(existsSync(configPath(sandbox))).toBe(false);
    expect(existsSync(join(sandbox.project, 'stacktape.generated.yml'))).toBe(false);
    const invocation = (await sandbox.readAgentLog()).find(
      (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
    );
    expect(invocation).toBeDefined();
    expect(existsSync(dirname(invocation!.cwd))).toBe(false);
  },
  90_000
);

test('a hard exit after cancellation stops a provider that ignores SIGTERM and removes session state', async () => {
  const sandbox = await newSandbox();
  const interrupted = await interruptSourceInitDuringAnalysis({ sandbox, provider: 'codex', hardExit: true });
  expect(interrupted.exit?.code, interrupted.output).toBe(0);
  expect(interrupted.survivors).toEqual([]);
  const invocation = (await sandbox.readAgentLog()).find(
    (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
  );
  expect(invocation).toBeDefined();
  expect(existsSync(dirname(invocation!.cwd))).toBe(false);
  expect(existsSync(configPath(sandbox))).toBe(false);
}, 90_000);

test('cancelling standalone model qualification stops the provider tree and does not start the next case', async () => {
  const sandbox = await newSandbox();
  const interrupted = await interruptSourceInitDuringAnalysis({ sandbox, provider: 'codex', evaluation: true });
  expect(interrupted.exit?.code, interrupted.output).toBe(143);
  expect(interrupted.survivors).toEqual([]);
  const log = await sandbox.readAgentLog();
  const invocations = log.filter(
    (entry): entry is Extract<AgentLogEntry, { type: 'invocation' }> => entry.type === 'invocation'
  );
  expect(invocations).toHaveLength(1);
  expect(existsSync(dirname(invocations[0]!.cwd))).toBe(false);
  const report = JSON.parse(await readFile(join(sandbox.root, 'model-quality.json'), 'utf8')) as {
    passed: boolean;
    cancelledSignal: string;
    scores: Array<{ stopReason: string }>;
  };
  expect(report).toMatchObject({ passed: false, cancelledSignal: 'SIGTERM', scores: [{ stopReason: 'cancelled' }] });
}, 90_000);

test('model qualification requires explicit opt-in and scores the scripted provider through both real missions', async () => {
  const sandbox = await newSandbox();
  const agent: AgentScript = {
    behavior: 'run',
    calls: [
      { tool: 'get_project_brief', arguments: {} },
      { tool: 'read_file', arguments: { path: 'src/config.js' } },
      { tool: 'submit_facts', arguments: submission }
    ]
  };
  const refused = await runScriptedModelQuality(sandbox, agent, false);
  expect(refused.exitCode).toBe(1);
  expect(refused.stderr).toContain('requires --live');
  expect(await sandbox.readAgentLog()).toEqual([]);
  const qualified = await runScriptedModelQuality(sandbox, agent);
  expect(qualified.exitCode, qualified.stderr).toBe(0);
  const report = JSON.parse(await readFile(join(sandbox.root, 'model-quality.json'), 'utf8')) as {
    passed: boolean;
    baseline: Array<{ passed: boolean }>;
    scores: Array<{ agentInvoked: boolean; passed: boolean }>;
  };
  expect(report.passed).toBe(true);
  expect(report.baseline.map((score) => score.passed)).toEqual([false, false]);
  expect(report.scores.map((score) => [score.agentInvoked, score.passed])).toEqual([
    [true, true],
    [true, true]
  ]);
}, 90_000);
