import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findProjectEntries, getCodingAgent } from './agents';
import { removeCodingAgents } from './setup';

// Every agent location is derived from these at call time, so a temporary home isolates the real one.
const ISOLATED_VARIABLES = ['USERPROFILE', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'COPILOT_HOME'];
let home: string;
let saved: Record<string, string | undefined>;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'stacktape-agent-home-'));
  saved = Object.fromEntries(ISOLATED_VARIABLES.map((name) => [name, process.env[name]]));
  for (const name of ISOLATED_VARIABLES) delete process.env[name];
  process.env.USERPROFILE = home;
});

afterEach(async () => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await rm(home, { recursive: true, force: true });
});

describe('removing Stacktape from an agent whose config cannot be read', () => {
  test('reports the failure and leaves the file alone', async () => {
    const original = '{ "mcpServers": { "stacktape": { "command": "stacktape" } }, oops }';
    await mkdir(join(home, '.cursor'), { recursive: true });
    await writeFile(join(home, '.cursor', 'mcp.json'), original);

    const result = await removeCodingAgents({ agents: [getCodingAgent('cursor')], cwd: home });

    expect(result.agents).toMatchObject([{ agent: 'cursor', ok: false }]);
    expect(await readFile(join(home, '.cursor', 'mcp.json'), 'utf-8')).toBe(original);
  });
});

describe('agents that merge several user config files', () => {
  test('updates and removes the OpenCode entry in every global file, so no older one stays active', async () => {
    const directory = join(home, '.config', 'opencode');
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, 'opencode.json'),
      JSON.stringify({ mcp: { stacktape: { type: 'local', command: ['old'] } } })
    );
    await writeFile(join(directory, 'opencode.jsonc'), '{ // mine\n  "theme": "dark"\n}\n');
    const opencode = getCodingAgent('opencode');

    await opencode.install({ command: 'stacktape', args: ['mcp'] });
    expect(JSON.parse(await readFile(join(directory, 'opencode.json'), 'utf-8')).mcp.stacktape.command).toEqual([
      'stacktape',
      'mcp'
    ]);
    expect(await readFile(join(directory, 'opencode.jsonc'), 'utf-8')).not.toContain('stacktape');

    const result = await removeCodingAgents({ agents: [opencode], cwd: home });
    expect(result.agents).toMatchObject([{ agent: 'opencode', ok: true, server: { change: 'removed' } }]);
    expect(await opencode.isConfigured()).toBe(false);
  });
});

describe('removing Stacktape from Codex when the codex command fails', () => {
  test.skipIf(process.platform === 'win32')('reports the failure instead of "not set up"', async () => {
    const tools = join(home, 'tools');
    await mkdir(tools, { recursive: true });
    await writeFile(
      join(tools, 'codex'),
      '#!/bin/sh\necho "Error: failed to load bootstrap configuration" >&2\nexit 1\n',
      {
        mode: 0o755
      }
    );
    const savedPath = process.env.PATH;
    process.env.PATH = tools;
    try {
      const result = await removeCodingAgents({ agents: [getCodingAgent('codex')], cwd: home });
      expect(result.agents).toMatchObject([{ agent: 'codex', ok: false, error: expect.stringContaining('bootstrap') }]);
    } finally {
      process.env.PATH = savedPath;
    }
  });
});

describe('entries that override the user-level one', () => {
  test('attributes a project .mcp.json to every agent that reads it', async () => {
    const project = join(home, 'project');
    await mkdir(join(project, '.github'), { recursive: true });
    await writeFile(
      join(project, '.mcp.json'),
      JSON.stringify({ mcpServers: { stacktape: { command: 'stacktape' } } })
    );
    await writeFile(join(project, '.github', 'mcp.json'), JSON.stringify({ mcpServers: { other: {} } }));

    const entries = await findProjectEntries(project);

    expect(entries.map((entry) => entry.agent.id).sort()).toEqual(['claude-code', 'copilot', 'vscode']);
    expect(entries.every((entry) => entry.shared && entry.location === join(project, '.mcp.json'))).toBe(true);
  });

  test("finds Copilot's top-level entry in a parent folder up to the repository root", async () => {
    const repository = join(home, 'repo');
    await mkdir(join(repository, '.git'), { recursive: true });
    await mkdir(join(repository, '.github'), { recursive: true });
    await mkdir(join(repository, 'packages', 'api'), { recursive: true });
    await writeFile(join(repository, '.github', 'mcp.json'), JSON.stringify({ stacktape: { command: 'stacktape' } }));

    expect(await findProjectEntries(join(repository, 'packages', 'api'))).toMatchObject([
      { agent: { id: 'copilot' }, location: join(repository, '.github', 'mcp.json') }
    ]);
  });

  test("reports Claude Code's local-scope entry for this folder", async () => {
    const project = join(home, 'project');
    await writeFile(
      join(home, '.claude.json'),
      JSON.stringify({ projects: { [project]: { mcpServers: { stacktape: { command: 'old-stacktape' } } } } })
    );

    expect(await findProjectEntries(project)).toMatchObject([
      { agent: { id: 'claude-code' }, shared: false, removeCommand: 'claude mcp remove --scope local stacktape' }
    ]);
    expect(await findProjectEntries(join(home, 'other'))).toEqual([]);
  });
});
