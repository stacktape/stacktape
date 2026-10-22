import { afterEach, describe, expect, test } from 'bun:test';
import { lstat, mkdtemp, readFile, rm, stat, symlink, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeCodexServer, removeJsonEntry, upsertCodexServer, upsertJsonEntry } from './config-files';

const directories: string[] = [];
const tempFile = async (name: string, content?: string) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-add-'));
  directories.push(directory);
  const path = join(directory, name);
  if (content !== undefined) await writeFile(path, content);
  return path;
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const server = { command: 'stacktape', args: ['mcp'] };

describe('JSON and JSONC agent configs', () => {
  test('adds the entry without disturbing comments, other servers or indentation', async () => {
    const path = await tempFile(
      'mcp.json',
      [
        '{',
        '    // my servers',
        '    "mcpServers": {',
        '        "github": { "command": "gh-mcp" }, // keep me',
        '    },',
        '}',
        ''
      ].join('\n')
    );

    const result = await upsertJsonEntry({ path, keyPath: ['mcpServers', 'stacktape'], value: server });

    expect(result.change).toBe('updated');
    expect(result.backupPath).toBeDefined();
    const text = await readFile(path, 'utf-8');
    expect(text).toContain('// my servers');
    expect(text).toContain('        "github": { "command": "gh-mcp" },');
    expect(text).toContain('// keep me');
    expect(text).toContain('        "stacktape": {');
    expect(text).toContain('"args": [');
  });

  test('creates a missing file and its directory', async () => {
    const path = join(await tempFile('unused'), '..', 'nested', 'mcp.json');

    expect((await upsertJsonEntry({ path, keyPath: ['servers', 'stacktape'], value: server })).change).toBe('created');
    expect(JSON.parse(await readFile(path, 'utf-8'))).toEqual({ servers: { stacktape: server } });
  });

  test('removes only the Stacktape entry', async () => {
    const path = await tempFile(
      'mcp.json',
      '{\n  // keep\n  "mcpServers": {\n    "github": {},\n    "stacktape": { "command": "stacktape" }\n  }\n}\n'
    );

    expect((await removeJsonEntry({ path, keyPath: ['mcpServers', 'stacktape'] })).change).toBe('removed');
    expect(await readFile(path, 'utf-8')).toBe('{\n  // keep\n  "mcpServers": {\n    "github": {}\n  }\n}\n');
    expect((await removeJsonEntry({ path, keyPath: ['mcpServers', 'stacktape'] })).change).toBe('absent');
  });
});

describe('writing agent configs', () => {
  test.skipIf(process.platform === 'win32')(
    'keeps a private file private and creates new files for the owner only',
    async () => {
      const path = await tempFile('mcp.json', '{ "mcpServers": { "github": { "env": { "TOKEN": "x" } } } }');
      await chmod(path, 0o600);

      await upsertJsonEntry({ path, keyPath: ['mcpServers', 'stacktape'], value: server });
      expect((await stat(path)).mode & 0o777).toBe(0o600);

      const created = join(path, '..', 'new.json');
      await upsertJsonEntry({ path: created, keyPath: ['mcpServers', 'stacktape'], value: server });
      expect((await stat(created)).mode & 0o777).toBe(0o600);
    }
  );

  test.skipIf(process.platform === 'win32')('updates a symlinked config at its target and keeps the link', async () => {
    const target = await tempFile('dotfiles-mcp.json', '{}');
    const link = join(target, '..', 'mcp.json');
    await symlink(target, link);

    await upsertJsonEntry({ path: link, keyPath: ['mcpServers', 'stacktape'], value: server });

    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(JSON.parse(await readFile(target, 'utf-8'))).toEqual({ mcpServers: { stacktape: server } });
  });
});

describe('Codex config.toml', () => {
  const original = [
    '# my codex config',
    'model = "gpt-6.1-sol"',
    '',
    '[mcp_servers.github]',
    'command = "gh-mcp"',
    '',
    '[profiles.fast]',
    'model = "gpt-6-luna"',
    ''
  ].join('\n');

  test('adds, updates in place and removes the stacktape table, keeping everything else byte for byte', async () => {
    const path = await tempFile('config.toml', original);
    const env = { STACKTAPE_MCP_CLIENT_NAME: 'codex' };

    expect(
      (await upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env })).change
    ).toBe('updated');
    const added = await readFile(path, 'utf-8');
    expect(added.startsWith(original.trimEnd())).toBe(true);
    expect(added).toContain(
      '[mcp_servers.stacktape]\ncommand = "stacktape"\nargs = ["mcp"]\n\n[mcp_servers.stacktape.env]'
    );

    expect(
      (await upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env })).change
    ).toBe('unchanged');

    expect(
      (await upsertCodexServer({ path, name: 'stacktape', command: '/opt/stacktape', args: ['mcp'], env })).change
    ).toBe('updated');
    const updated = await readFile(path, 'utf-8');
    expect(updated).toContain('command = "/opt/stacktape"');
    expect(updated.match(/\[mcp_servers\.stacktape\]/g)).toHaveLength(1);

    expect((await removeCodexServer({ path, name: 'stacktape' })).change).toBe('removed');
    expect(await readFile(path, 'utf-8')).toBe(original);
  });

  test('removes a stacktape table that sits between other tables', async () => {
    const path = await tempFile(
      'config.toml',
      '[mcp_servers.stacktape]\ncommand = "stacktape"\n\n[mcp_servers.stacktape.env]\nA = "1"\n\n[profiles.fast]\nmodel = "x"\n'
    );

    expect((await removeCodexServer({ path, name: 'stacktape' })).change).toBe('removed');
    expect(await readFile(path, 'utf-8')).toBe('[profiles.fast]\nmodel = "x"\n');
  });

  test('handles a quoted table name and an env table that is not next to its server', async () => {
    const env = { STACKTAPE_MCP_CLIENT_NAME: 'codex' };
    const path = await tempFile(
      'config.toml',
      [
        '[mcp_servers."stacktape"]',
        'command = "old"',
        '',
        '[mcp_servers.github]',
        'command = "gh"',
        '',
        '[mcp_servers.stacktape.env]',
        'OLD = "1"',
        ''
      ].join('\n')
    );

    expect(
      (await upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env })).change
    ).toBe('updated');
    const parsed = Bun.TOML.parse(await readFile(path, 'utf-8')) as { mcp_servers: Record<string, unknown> };
    expect(parsed.mcp_servers).toEqual({
      stacktape: { command: 'stacktape', args: ['mcp'], env },
      github: { command: 'gh' }
    });

    expect((await removeCodexServer({ path, name: 'stacktape' })).change).toBe('removed');
    expect(await readFile(path, 'utf-8')).toBe('[mcp_servers.github]\ncommand = "gh"\n');
  });

  test('refuses to rewrite a server defined as an inline table', async () => {
    const original = 'mcp_servers = { stacktape = { command = "old" } }\n';
    const path = await tempFile('config.toml', original);

    await expect(
      upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env: {} })
    ).rejects.toThrow('does not edit automatically');
    expect(await readFile(path, 'utf-8')).toBe(original);
  });

  test('leaves table-like text inside multi-line strings alone', async () => {
    const env = { STACKTAPE_MCP_CLIENT_NAME: 'codex' };
    const instructions = [
      '[profiles.work]',
      'developer_instructions = """',
      'Example:',
      '[mcp_servers.stacktape]',
      'command = "x"',
      '',
      '[other]',
      '"""'
    ];
    const original = [...instructions, '', '[mcp_servers.stacktape]', 'command = "old"', ''].join('\n');
    const path = await tempFile('config.toml', original);

    await upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env });
    const updated = await readFile(path, 'utf-8');
    expect(updated.startsWith(instructions.join('\n'))).toBe(true);
    expect((Bun.TOML.parse(updated) as { mcp_servers: unknown }).mcp_servers).toEqual({
      stacktape: { command: 'stacktape', args: ['mcp'], env }
    });

    await removeCodexServer({ path, name: 'stacktape' });
    expect(await readFile(path, 'utf-8')).toBe(`${instructions.join('\n')}\n`);
  });

  test('turns a disabled Stacktape server back on', async () => {
    const path = await tempFile(
      'config.toml',
      '[mcp_servers.stacktape]\ncommand = "stacktape"\nargs = ["mcp"]\nenabled = false\n'
    );

    expect(
      (await upsertCodexServer({ path, name: 'stacktape', command: 'stacktape', args: ['mcp'], env: {} })).change
    ).toBe('updated');
    expect(await readFile(path, 'utf-8')).not.toContain('enabled = false');
  });
});
