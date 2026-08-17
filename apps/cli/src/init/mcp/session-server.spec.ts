import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import type { AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import {
  INIT_MCP_PROTOCOL_VERSION,
  createInitMcpServer,
  initSessionEnvVars,
  readInitSessionStateFromEnv
} from './session-server';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stp-init-mcp-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src', 'index.ts'), 'app.listen(4000);', 'utf8');
  await writeFile(join(root, '.env'), 'SECRET_TOKEN=hunter2\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const openClients: Array<{ client: Client; close: () => Promise<void> }> = [];

/**
 * Drive the server through the real protocol rather than by calling handlers directly.
 *
 * The registry and the transport are the thing under test here — the tool implementations already
 * have their own suite — so a test that bypassed MCP would not tell us what we want to know.
 */
const connect = async (options: Parameters<typeof createInitMcpServer>[1] = {}): Promise<Client> => {
  const handler = createMcpHandler(() => createInitMcpServer(state(), options), { legacy: 'reject' });
  const transport = new StreamableHTTPClientTransport(new URL('http://stacktape-init.test/mcp'), {
    fetch: (input, init) => handler.fetch(new Request(input instanceof URL ? input.toString() : input, init))
  });
  const client = new Client(
    { name: 'init-test', version: '1.0.0' },
    {
      supportedProtocolVersions: [INIT_MCP_PROTOCOL_VERSION],
      versionNegotiation: { mode: { pin: INIT_MCP_PROTOCOL_VERSION } },
      capabilities: {}
    }
  );
  await client.connect(transport);
  openClients.push({ client, close: () => handler.close() });
  return client;
};

const callJson = async (client: Client, name: string, args: Record<string, unknown>) => {
  const result = await client.callTool({ name, arguments: args });
  const parts = result.content as Array<{ type: string; text?: string }>;
  return JSON.parse(parts.find((part) => part.type === 'text')?.text ?? '{}');
};

afterEach(async () => {
  while (openClients.length > 0) {
    const entry = openClients.pop()!;
    await entry.client.close().catch(() => {});
    await entry.close().catch(() => {});
  }
});

const state = () => ({
  root,
  files: ['.env', 'src/index.ts'],
  brief: projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION }),
  submissionFile: join(root, 'submission.json')
});

describe('the init MCP registry is fail-closed', () => {
  it('exposes only the analysis tools, and nothing that can deploy', async () => {
    const client = await connect();
    const names = (await client.listTools()).tools.map((tool) => tool.name).sort();

    expect(names).toEqual(['get_project_brief', 'glob', 'grep', 'list_dir', 'read_file', 'submit_facts']);
    // The point of a separate registry: no route to the CLI runner, which can deploy.
    expect(names.some((name) => name.includes('cli') || name.includes('dev') || name.includes('secret'))).toBe(false);
  });
});

describe('tools run for real in the child rather than being acknowledged', () => {
  it('returns real file contents, not a recorded placeholder', async () => {
    const result = await callJson(await connect(), 'read_file', { path: 'src/index.ts' });

    expect(result.content).toContain('app.listen(4000)');
  });

  it('keeps the file-access policy in the child', async () => {
    const client = await connect();

    const env = await callJson(client, 'read_file', { path: '.env' });
    expect(env.environmentVariableNames).toEqual(['SECRET_TOKEN']);
    expect(JSON.stringify(env)).not.toContain('hunter2');

    const escape = await callJson(client, 'read_file', { path: '../outside.txt' });
    expect(escape.reason).toBe('escapes-repository');
  });

  it('validates a submission in-session so the model can repair it', async () => {
    const submissions: AgentSubmission[] = [];
    const client = await connect({ onSubmit: (submission) => void submissions.push(submission) });

    const rejected = await callJson(client, 'submit_facts', {
      schemaVersion: 1,
      services: [{ name: 'x', path: '../escape', language: 'js', exposesHttp: true, executionModel: 'long-running' }]
    });

    // Real repair errors, while the model is still running. A submission that only fails after the
    // session ends is just a wasted run.
    expect(rejected.accepted).toBe(false);
    expect(JSON.stringify(rejected.problems)).toContain('path');
    expect(submissions).toHaveLength(0);

    const accepted = await callJson(client, 'submit_facts', {
      schemaVersion: 1,
      services: [
        {
          name: 'api',
          path: '.',
          language: 'javascript',
          exposesHttp: true,
          executionModel: 'long-running',
          containerEntrypoint: 'src/index.ts',
          evidence: [{ file: 'src/index.ts', line: 1, quote: 'app.listen(4000);' }]
        }
      ]
    });

    expect(accepted).toEqual({ accepted: true });
    expect(submissions).toHaveLength(1);
  });
});

describe('session state crosses the process boundary as data', () => {
  it('rebuilds from the environment', async () => {
    const filesFile = join(root, 'files.json');
    const briefFile = join(root, 'brief.json');
    await writeFile(filesFile, JSON.stringify(['src/index.ts']), 'utf8');
    await writeFile(briefFile, JSON.stringify(projectFactsSchema.parse({ schemaVersion: 1 })), 'utf8');

    const rebuilt = await readInitSessionStateFromEnv({
      [initSessionEnvVars.root]: root,
      [initSessionEnvVars.filesFile]: filesFile,
      [initSessionEnvVars.briefFile]: briefFile,
      [initSessionEnvVars.submissionFile]: join(root, 'submission.json')
    } as NodeJS.ProcessEnv);

    expect(rebuilt.root).toBe(root);
    expect(rebuilt.files).toEqual(['src/index.ts']);
  });

  it('refuses to start without its session environment', async () => {
    await expect(readInitSessionStateFromEnv({} as NodeJS.ProcessEnv)).rejects.toThrow('session environment');
  });
});
