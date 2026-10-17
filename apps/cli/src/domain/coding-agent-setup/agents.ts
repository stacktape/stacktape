import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { checkExecutableInPath } from '@utils/bin-executable';
import { execa } from 'execa';
import { isDeepStrictEqual } from 'node:util';
import {
  codexServerConfigured,
  readJsonEntry,
  removeCodexServer,
  removeJsonEntry,
  upsertCodexServer,
  upsertJsonEntry,
  type FileChange
} from './config-files';

export const SERVER_NAME = 'stacktape';

export const CODING_AGENT_IDS = [
  'claude-code',
  'codex',
  'cursor',
  'vscode',
  'copilot',
  'windsurf',
  'opencode'
] as const;
export type CodingAgentId = (typeof CODING_AGENT_IDS)[number];

/** The command an agent runs to start the server, as it will be written into the agent's config. */
export type ServerCommand = { command: string; args: string[] };

export type AgentChange = {
  change: FileChange;
  /** The file that holds the entry, or the agent command that manages it. */
  location: string;
  backupPath?: string;
};

export type CodingAgent = {
  id: CodingAgentId;
  label: string;
  /** Why we believe it is installed, or undefined when nothing points to it. */
  detect: () => string | undefined;
  install: (server: ServerCommand) => Promise<AgentChange>;
  remove: () => Promise<AgentChange>;
  isConfigured: () => Promise<boolean>;
  /** What a person types or edits to add the server by hand. */
  manualSetup: (server: ServerCommand) => string;
  /** Agents that hold their own configuration in GUI state and need a restart or reload to pick up a change. */
  reloadHint: string;
};

const home = () => process.env.USERPROFILE || homedir();
const appData = () => process.env.APPDATA || join(home(), 'AppData', 'Roaming');
const localAppData = () => process.env.LOCALAPPDATA || join(home(), 'AppData', 'Local');

const firstExisting = (paths: string[]) => paths.find((path) => existsSync(path));
const evidence = ({ executables = [], paths = [] }: { executables?: string[]; paths?: string[] }) => {
  for (const executable of executables) {
    if (checkExecutableInPath(executable)) return `\`${executable}\` is on your PATH`;
  }
  const path = firstExisting(paths);
  return path ? `found ${path}` : undefined;
};

const macApps = (...names: string[]) =>
  process.platform === 'darwin'
    ? names.flatMap((name) => [join('/Applications', `${name}.app`), join(home(), 'Applications', `${name}.app`)])
    : [];

const clientEnv = (id: CodingAgentId) => ({ STACKTAPE_MCP_CLIENT_NAME: id });

const quote = (value: string) => (/^[\w./:@=-]+$/.test(value) ? value : JSON.stringify(value));
const commandLine = ({ command, args }: ServerCommand) => [command, ...args].map(quote).join(' ');

const runAgentCli = async (file: string, args: string[]) => {
  const result = await execa(file, args, { reject: false, timeout: 60_000, stdin: 'ignore', env: process.env });
  if (result.exitCode !== 0) {
    const output = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
    throw new Error(
      `\`${file} ${args.join(' ')}\` failed${output ? `: ${output.split('\n').slice(-3).join(' ')}` : ''}`
    );
  }
  return result.stdout;
};

const filesWithEntry = async (paths: string[], keyPath: string[]) => {
  const found: string[] = [];
  for (const path of paths) if ((await readJsonEntry({ path, keyPath })) !== undefined) found.push(path);
  return found;
};

// One change summary for an edit that touched several files: the most significant change, all locations.
const combineChanges = (results: Array<{ path: string; change: FileChange; backupPath?: string }>): AgentChange => {
  const changed = results.filter((result) => result.change !== 'unchanged' && result.change !== 'absent');
  const primary = changed[0] ?? results[0];
  return {
    change: primary.change,
    location: results.map((result) => result.path).join(', '),
    ...(primary.backupPath ? { backupPath: primary.backupPath } : {})
  };
};

const jsonFileAgent = ({
  id,
  label,
  configPath,
  keyPath,
  entry,
  detect,
  reloadHint,
  manualNote,
  mergedConfigPaths
}: {
  id: CodingAgentId;
  label: string;
  /** The file a new entry goes into. */
  configPath: () => string;
  /** Every user-level file the agent merges, when there are several; an entry in any of them is active. */
  mergedConfigPaths?: () => string[];
  keyPath: string[];
  entry: (server: ServerCommand) => Record<string, unknown>;
  detect: () => string | undefined;
  reloadHint: string;
  manualNote?: string;
}): CodingAgent => ({
  id,
  label,
  detect,
  reloadHint,
  install: async (server) => {
    // Update every merged file that already has an entry, so an older one cannot win; otherwise add it to configPath.
    const existing = await filesWithEntry(mergedConfigPaths?.() ?? [configPath()], keyPath);
    const results = [];
    for (const path of existing.length > 0 ? existing : [configPath()]) {
      results.push({ path, ...(await upsertJsonEntry({ path, keyPath, value: entry(server) })) });
    }
    return combineChanges(results);
  },
  remove: async () => {
    const existing = await filesWithEntry(mergedConfigPaths?.() ?? [configPath()], keyPath);
    if (existing.length === 0) return { change: 'absent', location: configPath() };
    const results = [];
    for (const path of existing) results.push({ path, ...(await removeJsonEntry({ path, keyPath })) });
    return combineChanges(results);
  },
  isConfigured: async () => (await filesWithEntry(mergedConfigPaths?.() ?? [configPath()], keyPath)).length > 0,
  manualSetup: (server) =>
    `${manualNote ? `${manualNote} ` : ''}Add to ${configPath()} under "${keyPath.slice(0, -1).join('.')}":\n` +
    JSON.stringify({ [SERVER_NAME]: entry(server) }, null, 2)
});

// Claude Code keeps MCP servers inside ~/.claude.json, its whole state file, so only its own CLI writes there.
const claudeStatePath = () => join(process.env.CLAUDE_CONFIG_DIR || home(), '.claude.json');
const claudeEntry = (server: ServerCommand) => ({
  type: 'stdio',
  command: server.command,
  args: server.args,
  env: clientEnv('claude-code')
});
const claudeUserEntry = () => readJsonEntry({ path: claudeStatePath(), keyPath: ['mcpServers', SERVER_NAME] });
const claudeAddCommand = (server: ServerCommand) =>
  `claude mcp add --scope user ${SERVER_NAME} -e STACKTAPE_MCP_CLIENT_NAME=claude-code -- ${commandLine(server)}`;
const requireClaude = () => {
  const claude = checkExecutableInPath('claude');
  if (!claude) throw new Error('The `claude` command is not on your PATH, so Claude Code cannot be configured.');
  return claude;
};

const claudeCode: CodingAgent = {
  id: 'claude-code',
  label: 'Claude Code',
  detect: () => evidence({ executables: ['claude'], paths: [join(home(), '.claude')] }),
  reloadHint: 'start a new Claude Code session',
  install: async (server) => {
    const claude = requireClaude();
    const existing = await claudeUserEntry();
    if (isDeepStrictEqual(existing, claudeEntry(server))) return { change: 'unchanged', location: 'claude mcp' };
    if (existing !== undefined) await runAgentCli(claude, ['mcp', 'remove', '--scope', 'user', SERVER_NAME]);
    await runAgentCli(claude, [
      'mcp',
      'add',
      '--scope',
      'user',
      SERVER_NAME,
      '-e',
      'STACKTAPE_MCP_CLIENT_NAME=claude-code',
      '--',
      server.command,
      ...server.args
    ]);
    return { change: existing === undefined ? 'created' : 'updated', location: 'claude mcp (user scope)' };
  },
  remove: async () => {
    if ((await claudeUserEntry()) === undefined) return { change: 'absent', location: 'claude mcp' };
    await runAgentCli(requireClaude(), ['mcp', 'remove', '--scope', 'user', SERVER_NAME]);
    return { change: 'removed', location: 'claude mcp (user scope)' };
  },
  isConfigured: async () => (await claudeUserEntry()) !== undefined,
  manualSetup: (server) => `Run: ${claudeAddCommand(server)}`
};

const codexHome = () => process.env.CODEX_HOME || join(home(), '.codex');
const codexConfigPath = () => join(codexHome(), 'config.toml');

const readCodexEntry = async (codex: string) => {
  const result = await execa(codex, ['mcp', 'get', SERVER_NAME, '--json'], {
    reject: false,
    timeout: 30_000,
    stdin: 'ignore'
  });
  if (result.exitCode !== 0) {
    // Only Codex's own "not found" answer means absent; anything else (a broken config.toml) must not look like it.
    if (/No MCP server named/i.test(`${result.stderr}\n${result.stdout}`)) return undefined;
    throw new Error(
      `\`codex mcp get ${SERVER_NAME}\` failed: ${(result.stderr || result.stdout).trim().split('\n').slice(-2).join(' ')}`
    );
  }
  const parsed = JSON.parse(result.stdout) as {
    enabled?: boolean;
    transport?: { command?: string; args?: string[]; env?: unknown };
  };
  return { enabled: parsed.enabled !== false, ...parsed.transport };
};

// Codex's own `codex mcp add` keeps the rest of config.toml intact. Without the CLI (the IDE extension alone), the
// table is written the same way Codex writes it.
const codex: CodingAgent = {
  id: 'codex',
  label: 'Codex',
  detect: () => evidence({ executables: ['codex'], paths: [codexHome()] }),
  reloadHint: 'start a new Codex session',
  install: async (server) => {
    const env = clientEnv('codex');
    const codexCli = checkExecutableInPath('codex');
    if (!codexCli) {
      const result = await upsertCodexServer({ path: codexConfigPath(), name: SERVER_NAME, ...server, env });
      return { change: result.change, location: codexConfigPath(), backupPath: result.backupPath };
    }
    const existing = await readCodexEntry(codexCli);
    // `codex mcp add` replaces the whole entry, which also turns a disabled one back on.
    if (
      existing?.enabled &&
      existing.command === server.command &&
      isDeepStrictEqual(existing.args, server.args) &&
      isDeepStrictEqual(existing.env, env)
    ) {
      return { change: 'unchanged', location: codexConfigPath() };
    }
    await runAgentCli(codexCli, [
      'mcp',
      'add',
      SERVER_NAME,
      '--env',
      `STACKTAPE_MCP_CLIENT_NAME=${env.STACKTAPE_MCP_CLIENT_NAME}`,
      '--',
      server.command,
      ...server.args
    ]);
    return { change: existing ? 'updated' : 'created', location: codexConfigPath() };
  },
  remove: async () => {
    const codexCli = checkExecutableInPath('codex');
    if (!codexCli) {
      const result = await removeCodexServer({ path: codexConfigPath(), name: SERVER_NAME });
      return { change: result.change, location: codexConfigPath(), backupPath: result.backupPath };
    }
    if (!(await readCodexEntry(codexCli))) return { change: 'absent', location: codexConfigPath() };
    await runAgentCli(codexCli, ['mcp', 'remove', SERVER_NAME]);
    return { change: 'removed', location: codexConfigPath() };
  },
  isConfigured: () => codexServerConfigured({ path: codexConfigPath(), name: SERVER_NAME }),
  manualSetup: (server) =>
    `Run: codex mcp add ${SERVER_NAME} --env STACKTAPE_MCP_CLIENT_NAME=codex -- ${commandLine(server)}`
};

const stdioEntry = (id: CodingAgentId) => (server: ServerCommand) => ({
  type: 'stdio',
  command: server.command,
  args: server.args,
  env: clientEnv(id)
});

const cursor = jsonFileAgent({
  id: 'cursor',
  label: 'Cursor',
  configPath: () => join(home(), '.cursor', 'mcp.json'),
  keyPath: ['mcpServers', SERVER_NAME],
  entry: stdioEntry('cursor'),
  detect: () =>
    evidence({
      executables: ['cursor'],
      paths: [join(home(), '.cursor'), ...macApps('Cursor'), join(localAppData(), 'Programs', 'cursor')]
    }),
  reloadHint: 'reload the Cursor window'
});

const vscodeUserDirectory = () =>
  process.platform === 'win32'
    ? join(appData(), 'Code', 'User')
    : process.platform === 'darwin'
      ? join(home(), 'Library', 'Application Support', 'Code', 'User')
      : join(process.env.XDG_CONFIG_HOME || join(home(), '.config'), 'Code', 'User');

const vscode = jsonFileAgent({
  id: 'vscode',
  label: 'VS Code (GitHub Copilot)',
  configPath: () => join(vscodeUserDirectory(), 'mcp.json'),
  keyPath: ['servers', SERVER_NAME],
  entry: stdioEntry('vscode'),
  detect: () =>
    evidence({
      executables: ['code'],
      paths: [
        vscodeUserDirectory(),
        ...macApps('Visual Studio Code'),
        join(localAppData(), 'Programs', 'Microsoft VS Code')
      ]
    }),
  reloadHint: 'reload the VS Code window'
});

const copilotHome = () => process.env.COPILOT_HOME || join(home(), '.copilot');

// Only the `copilot` command counts: VS Code also creates ~/.copilot, and an entry written there for a CLI that is
// not installed would show up in VS Code a second time.
const copilot = jsonFileAgent({
  id: 'copilot',
  label: 'GitHub Copilot CLI',
  configPath: () => join(copilotHome(), 'mcp-config.json'),
  keyPath: ['mcpServers', SERVER_NAME],
  entry: (server) => ({
    type: 'local',
    command: server.command,
    args: server.args,
    env: clientEnv('copilot'),
    tools: ['*']
  }),
  detect: () => evidence({ executables: ['copilot'] }),
  reloadHint: 'start a new Copilot CLI session'
});

// Windsurf became Devin Desktop; its docs disagree on where the MCP file now lives, so an existing file wins.
const windsurfConfigCandidates = () => [
  join(home(), '.codeium', 'windsurf', 'mcp_config.json'),
  join(process.env.XDG_CONFIG_HOME || join(home(), '.config'), 'devin', 'mcp_config.json'),
  join(appData(), 'devin', 'mcp_config.json'),
  join(home(), '.codeium', 'mcp_config.json')
];
const windsurfConfigPath = () => {
  const existing = firstExisting(windsurfConfigCandidates());
  if (existing) return existing;
  const devinDirectory = join(process.env.XDG_CONFIG_HOME || join(home(), '.config'), 'devin');
  if (process.platform !== 'win32' && existsSync(devinDirectory)) return join(devinDirectory, 'mcp_config.json');
  if (process.platform === 'win32' && existsSync(join(appData(), 'devin')))
    return join(appData(), 'devin', 'mcp_config.json');
  return windsurfConfigCandidates()[0];
};

const windsurf = jsonFileAgent({
  id: 'windsurf',
  label: 'Windsurf (Devin Desktop)',
  configPath: windsurfConfigPath,
  keyPath: ['mcpServers', SERVER_NAME],
  entry: (server) => ({ command: server.command, args: server.args, env: clientEnv('windsurf') }),
  detect: () =>
    evidence({
      executables: ['devin-desktop', 'windsurf'],
      paths: [
        join(home(), '.codeium', 'windsurf'),
        join(process.env.XDG_CONFIG_HOME || join(home(), '.config'), 'devin'),
        ...macApps('Windsurf', 'Devin')
      ]
    }),
  reloadHint: 'refresh MCP servers in Cascade or restart the app'
});

const opencodeDirectory = () => join(process.env.XDG_CONFIG_HOME || join(home(), '.config'), 'opencode');
const opencodeConfigPath = () =>
  firstExisting([join(opencodeDirectory(), 'opencode.jsonc'), join(opencodeDirectory(), 'opencode.json')]) ||
  join(opencodeDirectory(), 'opencode.json');

const opencode = jsonFileAgent({
  id: 'opencode',
  label: 'OpenCode',
  configPath: opencodeConfigPath,
  // OpenCode merges all three global files.
  mergedConfigPaths: () =>
    ['config.json', 'opencode.json', 'opencode.jsonc'].map((name) => join(opencodeDirectory(), name)),
  keyPath: ['mcp', SERVER_NAME],
  entry: (server) => ({
    type: 'local',
    command: [server.command, ...server.args],
    enabled: true,
    environment: clientEnv('opencode')
  }),
  detect: () => evidence({ executables: ['opencode'], paths: [opencodeDirectory()] }),
  reloadHint: 'start a new OpenCode session'
});

export const CODING_AGENTS: CodingAgent[] = [claudeCode, codex, cursor, vscode, copilot, windsurf, opencode];

export const getCodingAgent = (id: CodingAgentId) => CODING_AGENTS.find((agent) => agent.id === id)!;

// Project files each agent reads, where a Stacktape entry (often from an older `mcp:add`) wins over the user-level
// one inside that project. Each shape lists the agents that read it, because the same file means different things to
// different agents (Copilot also accepts servers at the top level).
const PROJECT_FILES: Array<{
  path: string;
  shapes?: Array<{ keyPath: string[]; readers: CodingAgentId[] }>;
  toml?: { readers: CodingAgentId[] };
}> = [
  {
    path: '.mcp.json',
    shapes: [
      { keyPath: ['mcpServers'], readers: ['claude-code', 'vscode', 'copilot'] },
      { keyPath: ['servers'], readers: ['vscode'] },
      { keyPath: [], readers: ['copilot'] }
    ]
  },
  {
    path: join('.github', 'mcp.json'),
    shapes: [
      { keyPath: ['mcpServers'], readers: ['copilot'] },
      { keyPath: [], readers: ['copilot'] }
    ]
  },
  { path: join('.vscode', 'mcp.json'), shapes: [{ keyPath: ['servers'], readers: ['vscode'] }] },
  { path: join('.cursor', 'mcp.json'), shapes: [{ keyPath: ['mcpServers'], readers: ['cursor'] }] },
  { path: join('.codex', 'config.toml'), toml: { readers: ['codex'] } },
  { path: 'opencode.json', shapes: [{ keyPath: ['mcp'], readers: ['opencode'] }] },
  { path: 'opencode.jsonc', shapes: [{ keyPath: ['mcp'], readers: ['opencode'] }] },
  { path: join('.opencode', 'opencode.json'), shapes: [{ keyPath: ['mcp'], readers: ['opencode'] }] },
  { path: join('.opencode', 'opencode.jsonc'), shapes: [{ keyPath: ['mcp'], readers: ['opencode'] }] },
  // Written into projects by older versions of `mcp:add`.
  { path: join('.opencode', 'config.json'), shapes: [{ keyPath: ['mcp'], readers: ['opencode'] }] }
];

// The folders whose project files can apply here: this one and its parents up to the repository root (agents such
// as Copilot look that far). Outside a repository, only this folder.
const projectFolders = (cwd: string): string[] => {
  const folders: string[] = [];
  for (let folder = resolve(cwd); ; folder = dirname(folder)) {
    folders.push(folder);
    if (existsSync(join(folder, '.git'))) return folders;
    if (dirname(folder) === folder) return [resolve(cwd)];
  }
};

export type ProjectEntry = {
  agent: CodingAgent;
  /** The file, or a description of the agent setting, that holds the entry. */
  location: string;
  /** A committed project file shared with the team, as opposed to a setting of this user only. */
  shared: boolean;
  /** How to remove it, for entries that are this user's own. */
  removeCommand?: string;
};

/** Entries that take precedence over the user-level one in this project, usually left by an older `mcp:add`. */
export const findProjectEntries = async (cwd: string): Promise<ProjectEntry[]> => {
  const found: ProjectEntry[] = [];
  // A file that cannot be parsed is the agent's problem to report, not a reason to fail this warning.
  const hasEntry = (read: () => Promise<unknown>) =>
    read().then(
      (entry) => Boolean(entry),
      () => false
    );
  // `claude mcp add --scope local` keeps the entry in Claude Code's state file, keyed by the project directory.
  if (
    await hasEntry(() =>
      readJsonEntry({ path: claudeStatePath(), keyPath: ['projects', cwd, 'mcpServers', SERVER_NAME] })
    )
  ) {
    found.push({
      agent: claudeCode,
      location: "Claude Code's local settings for this folder",
      shared: false,
      removeCommand: `claude mcp remove --scope local ${SERVER_NAME}`
    });
  }
  for (const folder of projectFolders(cwd)) {
    for (const file of PROJECT_FILES) {
      const path = join(folder, file.path);
      if (!existsSync(path)) continue;
      const readers = new Set<CodingAgentId>();
      if (file.toml && (await hasEntry(() => codexServerConfigured({ path, name: SERVER_NAME })))) {
        file.toml.readers.forEach((reader) => readers.add(reader));
      }
      for (const shape of file.shapes ?? []) {
        if (await hasEntry(() => readJsonEntry({ path, keyPath: [...shape.keyPath, SERVER_NAME] }))) {
          shape.readers.forEach((reader) => readers.add(reader));
        }
      }
      for (const reader of readers) found.push({ agent: getCodingAgent(reader), location: path, shared: true });
    }
  }
  return found;
};
