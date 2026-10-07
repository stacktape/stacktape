import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { getPlatform } from '@utils/bin-executable';
import { withPersistedApiKey } from '../src/app/global-state-manager/api-key-storage';
import type { PersistedState } from '../src/app/global-state-manager/types';
import { buildBinaryFile, copyMcpDocs } from './release/build-cli-sources';
import packageJson from '../package.json';

type Envelope = { schemaVersion: string; ok: boolean; code: string; data?: Record<string, unknown> };

const envelope = (result: Awaited<ReturnType<Client['callTool']>>): Envelope => {
  assert('content' in result, 'Expected a tool result');
  const text = (result.content as Array<{ type: string; text?: string }>).find((item) => item.type === 'text')?.text;
  assert(text, 'Expected JSON text');
  const parsed = JSON.parse(text) as Envelope;
  assert.equal(parsed.schemaVersion, 'stacktape.mcp.tool-result.v1');
  assert.deepEqual(result.structuredContent, parsed, 'Text and structured output must agree');
  assert.equal(result.isError, !parsed.ok);
  return parsed;
};

const deadline = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 10_000);
      })
    ]);
  } finally {
    clearTimeout(timer!);
  }
};

const verify = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-j12-mcp-'));
  const home = join(directory, 'home');
  const project = join(directory, 'project');
  const apiKey = 'j12-loopback-only-key';
  const fakeModelKey = ['sk', 'ant', 'api03', 'J12SyntheticKey'.repeat(6)].join('-');
  const handoff = `# J12 incident\n\nDiagnostic evidence using ${fakeModelKey}\npostgresql://test:synthetic-password@localhost/db`;
  const requests: Array<{ procedure: string; input: Record<string, unknown>; authenticated: boolean }> = [];
  let started: () => void = () => {};
  let disconnected: () => void = () => {};
  let holdRequest = false;
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const procedure = url.pathname.replace(/^\/stacktape-api\//, '');
    const input = (JSON.parse(url.searchParams.get('input') ?? '{}') as Record<string, Record<string, unknown>>)['0'];
    const authenticated = request.headers.stp_api_key === apiKey;
    requests.push({ procedure, input, authenticated });
    if (holdRequest) {
      response.on('close', () => disconnected());
      started();
      return;
    }
    response.writeHead(authenticated ? 200 : 401, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify([
        authenticated && procedure === 'incidentHandoffFromCli'
          ? { result: { data: { markdown: handoff } } }
          : { error: { message: 'Unexpected request', code: -32001, data: { code: 'UNAUTHORIZED', httpStatus: 401 } } }
      ])
    );
  });
  let client: Client | undefined;
  let transport: StdioClientTransport | undefined;
  let cliChildPids: number[] = [];
  let stderr = '';
  try {
    await mkdir(home);
    await mkdir(project);
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ name: 'j12-fixture', dependencies: { stacktape: '*' } })
    );
    await writeFile(
      join(project, 'stacktape.ts'),
      "import { defineConfig, Bucket } from 'stacktape';\nexport default defineConfig(() => ({ resources: { assets: new Bucket({}) } }));\n"
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/stacktape-api`;
    await mkdir(join(home, '.stacktape'));
    await writeFile(
      join(home, '.stacktape', 'persisted-state.json'),
      JSON.stringify(
        withPersistedApiKey({
          persistedState: { systemId: 'j12', cliArgsDefaults: {}, otherDefaults: {} } as PersistedState,
          apiKey,
          endpoint
        })
      )
    );
    const platform = getPlatform();
    // The same builder and compressed corpus used by release archives; never the source MCP shortcut in dev.ts.
    const install = await buildBinaryFile({ distFolderPath: directory, platform, version: packageJson.version });
    await copyMcpDocs({ distFolderPath: install });
    await cp(join(process.cwd(), '__stacktape-dist/dev/helper-lambdas'), join(install, 'helper-lambdas'), {
      recursive: true
    });
    const binary = join(install, platform === 'win' ? 'stacktape.exe' : 'stacktape');
    const env = {
      PATH: process.env.PATH ?? '',
      ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
      HOME: home,
      USERPROFILE: home,
      APPDATA: join(home, 'AppData'),
      STP_DISABLE_TELEMETRY: '1',
      STP_CUSTOM_TRPC_API_ENDPOINT: endpoint,
      AWS_EC2_METADATA_DISABLED: 'true',
      AWS_CONFIG_FILE: join(home, 'absent-config'),
      AWS_SHARED_CREDENTIALS_FILE: join(home, 'absent-credentials')
    };
    client = new Client(
      { name: 'j12-executable-client', version: '1.0.0' },
      {
        supportedProtocolVersions: ['2026-07-28'],
        versionNegotiation: { mode: { pin: '2026-07-28' } },
        capabilities: {}
      }
    );
    transport = new StdioClientTransport({ command: binary, args: ['mcp'], cwd: project, env, stderr: 'pipe' });
    transport.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    await client.connect(transport, { timeout: 30_000 });
    assert.equal(client.getProtocolEra(), 'modern');
    assert.deepEqual(client.getDiscoverResult()?.supportedVersions, ['2026-07-28']);
    assert.deepEqual((await client.listTools()).tools.map(({ name }) => name).sort(), [
      'stacktape_cli',
      'stacktape_dev',
      'stacktape_docs',
      'stacktape_incident',
      'stacktape_project'
    ]);
    // Documentation is offered as tools. Do not advertise resources that clients cannot list/read.
    assert.equal(client.getServerCapabilities()?.resources, undefined);
    assert.deepEqual(await client.listResources(), { resources: [] });
    await assert.rejects(client.readResource({ uri: 'stacktape://docs' }), /resources|support|method/i);
    console.info('PASS executable MCP discovery and resource capability contract');

    const call = async (name: string, args: Record<string, unknown>) =>
      envelope(await client!.callTool({ name, arguments: args }, { timeout: 30_000 }));
    const search = await call('stacktape_docs', {
      action: 'search',
      query: 'lambda timeout property',
      mode: 'reference',
      maxItems: 1
    });
    assert.equal(search.ok, true);
    const references = search.data?.references as Array<{ route: string; headingPath: string[] }>;
    assert.equal(references.length, 1);
    const docs = await call('stacktape_docs', { action: 'get', route: references[0].route, propertyName: 'timeout' });
    assert.equal(docs.ok, true);
    assert.match(String(docs.data?.content), /timeout\?: number/);
    const scan = await call('stacktape_project', { action: 'scan' });
    assert.equal(scan.ok, true);
    assert.deepEqual(scan.data?.suggestedDefaults, { configPath: 'stacktape.ts', currentWorkingDirectory: '.' });
    assert.equal((await call('stacktape_cli', { action: 'describe', command: 'deploy' })).data?.safety, 'mutating');
    assert.equal(
      (await call('stacktape_cli', { action: 'run', command: 'deploy', args: { stage: 'j12', region: 'eu-west-1' } }))
        .code,
      'CONFIRMATION_REQUIRED'
    );
    console.info('PASS executable MCP docs corpus, project scan and command policy');

    await assert.rejects(
      client.callTool({ name: 'j12_unknown_tool', arguments: {} }),
      /unknown|not found|not registered/i
    );
    const invalidAction = await client.callTool({
      name: 'stacktape_docs',
      arguments: { action: 'j12_invalid_action' }
    });
    assert.equal(invalidAction.isError, true);
    assert.match(JSON.stringify(invalidAction.content), /invalid|validation/i);
    assert.equal((await call('stacktape_docs', { action: 'search' })).code, 'VALIDATION_ERROR');
    assert.equal(
      (
        await call('stacktape_cli', {
          action: 'run',
          command: 'diff',
          args: { stage: 'j12', region: 'eu-west-1', badArg: true }
        })
      ).code,
      'VALIDATION_ERROR'
    );
    assert.equal(requests.length, 0, 'Rejected requests must not reach the control plane');
    const incident = await call('stacktape_incident', { action: 'show', incidentId: 'inc_j12' });
    assert.equal(incident.ok, true);
    assert.deepEqual(requests, [
      { procedure: 'incidentHandoffFromCli', input: { incidentId: 'inc_j12' }, authenticated: true }
    ]);
    assert.match(String(incident.data?.content), /# J12 incident/);
    assert.match(String(incident.data?.content), /REDACTED/);
    assert(!JSON.stringify(incident).includes(fakeModelKey), 'Model key leaked through MCP');
    assert(!JSON.stringify(incident).includes('synthetic-password'), 'Database password leaked through MCP');
    console.info('PASS executable MCP invalid requests, real CLI child and sensitive output');

    holdRequest = true;
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const requestClosed = new Promise<void>((resolve) => {
      disconnected = resolve;
    });
    const abort = new AbortController();
    const pending = client.callTool(
      { name: 'stacktape_incident', arguments: { action: 'show', incidentId: 'inc_j12_cancel' } },
      { signal: abort.signal, timeout: 30_000 }
    );
    // Attach the rejection handler before aborting; cancel only after the real child has reached HTTP.
    const rejected = assert.rejects(pending, /abort|cancel/i);
    await deadline(requestStarted, 'CLI child request started');
    if (process.platform === 'linux') {
      cliChildPids = (await readFile(`/proc/${transport.pid}/task/${transport.pid}/children`, 'utf8'))
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(Number);
      assert(cliChildPids.length > 0, 'The HTTP request must come from a real CLI subprocess');
    }
    abort.abort();
    await rejected;
    await deadline(requestClosed, 'cancelled CLI child closed its HTTP connection');
    for (const pid of cliChildPids) await waitForExit(pid);
    holdRequest = false;
    assert.equal((await call('stacktape_incident', { action: 'show', incidentId: 'inc_j12_after_cancel' })).ok, true);
    console.info('PASS executable MCP cancellation reaps CLI child and permits the next call');

    await client.close();
    client = undefined;
    assert(
      !stderr.includes(fakeModelKey) && !stderr.includes('synthetic-password'),
      'Sensitive output leaked to server stderr'
    );
    await verifyClientConfigs(binary, project, env);
  } finally {
    await client?.close();
    await transport?.close();
    // Fault checks can deliberately break cancellation. Dispose only the children observed under our own server.
    for (const pid of cliChildPids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* Already exited. */
      }
      await waitForExit(pid);
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
};

const waitForExit = async (pid: number) => {
  const expires = Date.now() + 10_000;
  while (Date.now() < expires) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`CLI child ${pid} did not exit`);
};

const verifyClientConfigs = async (binary: string, project: string, env: Record<string, string>) => {
  const run = async (overrides: Record<string, string> = {}, cwd = project) => {
    const process = Bun.spawn({
      cmd: [binary, 'mcp:add', '--agent'],
      cwd,
      env: { ...env, ...overrides },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited
    ]);
    assert.equal(status, 0, `mcp:add failed: ${stderr}`);
    const result = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; data?: { result?: { result?: Record<string, unknown> } } })
      .find(({ type }) => type === 'result');
    assert(result, 'mcp:add must emit a final agent result');
    return result.data?.result?.result;
  };
  assert.equal((await run())?.created, 6);
  const targets = [
    ['.mcp.json', 'mcpServers', 'claude-code'],
    ['.cursor/mcp.json', 'mcpServers', 'cursor'],
    ['.vscode/mcp.json', 'servers', 'vscode'],
    ['opencode.jsonc', 'mcp', 'opencode'],
    ['.codeium/windsurf/mcp_config.json', 'mcpServers', 'windsurf']
  ];
  for (const [path, rootKey, name] of targets) {
    const config = JSON.parse(await readFile(join(project, path), 'utf8')) as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    const expected =
      name === 'opencode'
        ? {
            type: 'local',
            command: ['node_modules/.bin/stacktape', 'mcp'],
            enabled: true,
            environment: { STACKTAPE_MCP_CLIENT_NAME: name }
          }
        : {
            ...(name === 'windsurf' ? {} : { type: 'stdio' }),
            command: 'node_modules/.bin/stacktape',
            args: ['mcp'],
            env: { STACKTAPE_MCP_CLIENT_NAME: name }
          };
    assert.deepEqual(config[rootKey].stacktape, expected, `${name} MCP launch configuration`);
    // Preserve another server and unrelated client options, and keep an exact backup before replacing the config.
    config[rootKey].other = { command: 'j12-other' };
    config.theme = { name: { value: 'dark' } };
    const original = `${JSON.stringify(config)}\n`;
    await writeFile(join(project, path), original);
  }
  const codexPath = join(project, '.codex/config.toml');
  const codex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as {
    mcp_servers: { stacktape: Record<string, unknown> };
  };
  assert.deepEqual(codex.mcp_servers.stacktape, {
    command: 'node_modules/.bin/stacktape',
    args: ['mcp'],
    enabled: true,
    env: { STACKTAPE_MCP_CLIENT_NAME: 'codex' }
  });
  await writeFile(
    codexPath,
    '[mcp_servers.stacktape]\ncommand = "old"\n\n[mcp_servers.other]\ncommand = "j12-other"\n\n[mcp_servers.stacktape.env]\nSTALE = "remove-me"\n'
  );
  assert.equal((await run())?.updated, 6);
  const updatedCodex = Bun.TOML.parse(await readFile(codexPath, 'utf8')) as {
    mcp_servers: { stacktape: Record<string, unknown>; other: Record<string, unknown> };
  };
  assert.deepEqual(updatedCodex.mcp_servers.stacktape, codex.mcp_servers.stacktape);
  assert.equal(updatedCodex.mcp_servers.other.command, 'j12-other');
  for (const [path, rootKey] of targets) {
    const config = JSON.parse(await readFile(join(project, path), 'utf8'));
    assert.equal(config[rootKey].other.command, 'j12-other');
    assert.equal(config.theme.name.value, 'dark');
    const backups = (await readdir(join(project, path, '..'))).filter((name) =>
      name.startsWith(path.split('/').at(-1)! + '.bak.')
    );
    assert.equal(backups.length, 1);
    const backup = JSON.parse(await readFile(join(project, path, '..', backups[0]), 'utf8'));
    assert.equal(backup[rootKey].other.command, 'j12-other');
  }
  assert.equal((await run())?.unchanged, 6, 'Repeated installation should not rewrite configs');
  const invalidPath = join(project, '.cursor/mcp.json');
  await writeFile(invalidPath, '{ invalid json');
  assert.equal((await run())?.failed, 1);
  assert.equal(await readFile(invalidPath, 'utf8'), '{ invalid json', 'Invalid config must remain intact');
  await writeFile(codexPath, '[invalid TOML');
  assert.equal((await run())?.failed, 2);
  assert.equal(await readFile(codexPath, 'utf8'), '[invalid TOML', 'Invalid TOML must remain intact');

  const globalHome = `${project}-home`;
  const otherProject = join(project, 'other-project');
  await mkdir(globalHome);
  await mkdir(otherProject);
  await writeFile(join(globalHome, '.claude.json'), '{"mcpServers":{"other":{"command":"j12-other"}}}');
  // The home shares the project path's prefix but is outside it. A user config must use the global executable.
  await rm(join(project, '.mcp.json'));
  const globalResult = await run({ HOME: globalHome, USERPROFILE: globalHome }, project);
  assert.equal(globalResult?.failed, 2);
  const globalConfig = JSON.parse(await readFile(join(globalHome, '.claude.json'), 'utf8'));
  assert.equal(globalConfig.mcpServers.stacktape.command, 'stacktape');
  // With no local dependency, a project config also uses the executable found on PATH.
  assert.equal((await run({ HOME: globalHome, USERPROFILE: globalHome }, otherProject))?.unchanged, 1);
  console.info('PASS executable mcp:add client formats, preservation, backups, idempotence and invalid input');
};

verify().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
