import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { copy, ensureDir, pathExists, readFile, writeFile } from 'fs-extra';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import JSON5 from 'json5';

type ClientInstallerTarget = {
  id: 'claude-code' | 'codex' | 'cursor' | 'vscode' | 'opencode' | 'windsurf';
  label: string;
  description: string;
  kind: 'json' | 'toml';
  rootKey?: string;
  paths: string[];
  serverConfig?: Record<string, unknown>;
};

type InstallStatus = 'created' | 'updated' | 'unchanged' | 'failed';

type InstallResult = {
  client: string;
  configPath: string;
  status: InstallStatus;
  backupPath?: string;
  error?: string;
};

const getAppDataPath = (): string => {
  if (process.env.APPDATA) return process.env.APPDATA;
  return join(homedir(), 'AppData', 'Roaming');
};

const getHomePath = (): string => {
  if (process.env.USERPROFILE) return process.env.USERPROFILE;
  return homedir();
};

const resolveLocalStacktapeCommand = (): string => {
  const cwd = process.cwd();
  const packageJsonPath = join(cwd, 'package.json');

  if (!existsSync(packageJsonPath)) return 'stacktape';

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    const hasStacktapeDependency =
      Boolean(packageJson.dependencies?.stacktape) ||
      Boolean(packageJson.devDependencies?.stacktape) ||
      Boolean(packageJson.optionalDependencies?.stacktape) ||
      Boolean(packageJson.peerDependencies?.stacktape);

    if (hasStacktapeDependency) {
      return 'node_modules/.bin/stacktape';
    }
  } catch {
    return 'stacktape';
  }

  return 'stacktape';
};

const getTargets = ({ stacktapeCommand }: { stacktapeCommand: string }): ClientInstallerTarget[] => {
  const home = getHomePath();
  const appData = getAppDataPath();
  const cwd = process.cwd();
  const isWindows = process.platform === 'win32';

  return [
    {
      id: 'claude-code',
      label: 'Claude Code',
      description: 'User MCP config (~/.claude.json)',
      kind: 'json',
      rootKey: 'mcpServers',
      paths: [join(cwd, '.mcp.json'), join(home, '.claude.json')],
      serverConfig: {
        type: 'stdio',
        command: stacktapeCommand,
        args: ['mcp']
      }
    },
    {
      id: 'codex',
      label: 'OpenAI Codex',
      description: 'Codex TOML config (~/.codex/config.toml)',
      kind: 'toml',
      paths: [join(cwd, '.codex', 'config.toml'), join(home, '.codex', 'config.toml')]
    },
    {
      id: 'cursor',
      label: 'Cursor',
      description: 'Cursor MCP config (~/.cursor/mcp.json)',
      kind: 'json',
      rootKey: 'mcpServers',
      paths: [join(cwd, '.cursor', 'mcp.json'), join(home, '.cursor', 'mcp.json')],
      serverConfig: {
        type: 'stdio',
        command: stacktapeCommand,
        args: ['mcp']
      }
    },
    {
      id: 'vscode',
      label: 'VS Code / Copilot',
      description: 'VS Code MCP config (User/mcp.json)',
      kind: 'json',
      rootKey: 'servers',
      paths: [
        join(cwd, '.vscode', 'mcp.json'),
        isWindows
          ? join(appData, 'Code', 'User', 'mcp.json')
          : process.platform === 'darwin'
            ? join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json')
            : join(home, '.config', 'Code', 'User', 'mcp.json')
      ],
      serverConfig: {
        type: 'stdio',
        command: stacktapeCommand,
        args: ['mcp']
      }
    },
    {
      id: 'opencode',
      label: 'OpenCode',
      description: 'OpenCode config (JSON/JSONC)',
      kind: 'json',
      rootKey: 'mcp',
      paths: isWindows
        ? [
            join(cwd, 'opencode.jsonc'),
            join(cwd, '.opencode', 'config.json'),
            join(appData, 'opencode', 'opencode.jsonc'),
            join(appData, 'opencode', 'config.json')
          ]
        : [
            join(cwd, 'opencode.jsonc'),
            join(cwd, '.opencode', 'config.json'),
            join(home, '.config', 'opencode', 'opencode.jsonc'),
            join(home, '.config', 'opencode', 'config.json'),
            join(home, '.opencode', 'config.json')
          ],
      serverConfig: {
        type: 'local',
        command: [stacktapeCommand, 'mcp'],
        enabled: true
      }
    },
    {
      id: 'windsurf',
      label: 'Windsurf',
      description: 'Windsurf MCP config',
      kind: 'json',
      rootKey: 'mcpServers',
      paths: [
        join(cwd, '.codeium', 'windsurf', 'mcp_config.json'),
        isWindows
          ? join(home, '.codeium', 'windsurf', 'mcp_config.json')
          : join(home, '.codeium', 'windsurf', 'mcp_config.json')
      ],
      serverConfig: {
        command: stacktapeCommand,
        args: ['mcp'],
        env: {}
      }
    }
  ];
};

const resolveTargetPath = async ({ paths }: { paths: string[] }): Promise<string> => {
  for (const candidatePath of paths) {
    if (await pathExists(candidatePath)) return candidatePath;
  }
  return paths[0];
};

const detectTarget = async ({ paths }: { paths: string[] }): Promise<boolean> => {
  for (const candidatePath of paths) {
    if (await pathExists(candidatePath)) return true;
  }
  return false;
};

const createBackupPath = (filePath: string): string => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${filePath}.bak.${ts}`;
};

const sortObjectKeys = (input: Record<string, unknown>): Record<string, unknown> => {
  return Object.keys(input)
    .sort((a, b) => a.localeCompare(b))
    .reduce(
      (acc, key) => {
        acc[key] = input[key];
        return acc;
      },
      {} as Record<string, unknown>
    );
};

const installJsonTarget = async ({
  configPath,
  rootKey,
  serverConfig,
  client
}: {
  configPath: string;
  rootKey: string;
  serverConfig: Record<string, unknown>;
  client: string;
}): Promise<InstallResult> => {
  try {
    const exists = await pathExists(configPath);
    const currentRaw = exists ? await readFile(configPath, 'utf-8') : '';

    let currentConfig: Record<string, unknown> = {};
    if (currentRaw.trim().length > 0) {
      try {
        currentConfig = JSON5.parse(currentRaw) as Record<string, unknown>;
      } catch (error) {
        return {
          client,
          configPath,
          status: 'failed',
          error: `Invalid JSON/JSONC in file: ${(error as Error).message}`
        };
      }
    }

    if (!currentConfig || typeof currentConfig !== 'object' || Array.isArray(currentConfig)) {
      currentConfig = {};
    }

    const root = currentConfig[rootKey];
    const rootObject: Record<string, unknown> =
      root && typeof root === 'object' && !Array.isArray(root)
        ? ({ ...(root as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    rootObject.stacktape = serverConfig;
    currentConfig[rootKey] = sortObjectKeys(rootObject);

    const nextRaw = `${JSON.stringify(currentConfig, null, 2)}\n`;
    if (exists && currentRaw.trim() === nextRaw.trim()) {
      return {
        client,
        configPath,
        status: 'unchanged'
      };
    }

    let backupPath: string | undefined;
    if (exists) {
      backupPath = createBackupPath(configPath);
      await copy(configPath, backupPath);
    }

    await ensureDir(dirname(configPath));
    await writeFile(configPath, nextRaw, 'utf-8');

    return {
      client,
      configPath,
      status: exists ? 'updated' : 'created',
      ...(backupPath ? { backupPath } : {})
    };
  } catch (error) {
    return {
      client,
      configPath,
      status: 'failed',
      error: (error as Error).message
    };
  }
};

const renderCodexBlock = ({ stacktapeCommand }: { stacktapeCommand: string }): string[] => {
  return [
    '[mcp_servers.stacktape]',
    `command = ${JSON.stringify(stacktapeCommand)}`,
    'args = ["mcp"]',
    'enabled = true'
  ];
};

const installCodexTarget = async ({
  configPath,
  client,
  stacktapeCommand
}: {
  configPath: string;
  client: string;
  stacktapeCommand: string;
}): Promise<InstallResult> => {
  try {
    const exists = await pathExists(configPath);
    const currentRaw = exists ? await readFile(configPath, 'utf-8') : '';
    const blockLines = renderCodexBlock({ stacktapeCommand });

    const lines = currentRaw.length > 0 ? currentRaw.split(/\r?\n/) : [];
    const sectionHeader = '[mcp_servers.stacktape]';
    const startIndex = lines.findIndex((line) => line.trim() === sectionHeader);

    let nextLines: string[];
    if (startIndex === -1) {
      nextLines =
        lines.length > 0
          ? [...lines.filter((line, idx) => !(idx === lines.length - 1 && line === '')), '', ...blockLines]
          : [...blockLines];
    } else {
      let endIndex = startIndex + 1;
      while (endIndex < lines.length) {
        const trimmed = lines[endIndex].trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) break;
        endIndex += 1;
      }
      nextLines = [...lines.slice(0, startIndex), ...blockLines, ...lines.slice(endIndex)];
    }

    const nextRaw = `${nextLines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
    if (exists && currentRaw.trim() === nextRaw.trim()) {
      return {
        client,
        configPath,
        status: 'unchanged'
      };
    }

    let backupPath: string | undefined;
    if (exists) {
      backupPath = createBackupPath(configPath);
      await copy(configPath, backupPath);
    }

    await ensureDir(dirname(configPath));
    await writeFile(configPath, nextRaw, 'utf-8');

    return {
      client,
      configPath,
      status: exists ? 'updated' : 'created',
      ...(backupPath ? { backupPath } : {})
    };
  } catch (error) {
    return {
      client,
      configPath,
      status: 'failed',
      error: (error as Error).message
    };
  }
};

const getDefaults = ({
  detectedTargets,
  allTargets
}: {
  detectedTargets: string[];
  allTargets: string[];
}): string[] => {
  if (detectedTargets.length > 0) return detectedTargets;
  return allTargets;
};

export const commandMcpAdd = async () => {
  const agentMode = isAgentMode();
  const autoConfirm = Boolean(globalStateManager.args.autoConfirmOperation);

  const globalStacktapeCommand = 'stacktape';
  const localStacktapeCommand = resolveLocalStacktapeCommand();
  const targets = getTargets({ stacktapeCommand: globalStacktapeCommand });
  const detectionMap = new Map<string, boolean>();

  for (const target of targets) {
    detectionMap.set(target.id, await detectTarget({ paths: target.paths }));
  }

  const detectedTargets = targets.filter((target) => detectionMap.get(target.id)).map((target) => target.id);
  const allTargetIds = targets.map((target) => target.id);

  let selectedTargetIds = getDefaults({ detectedTargets, allTargets: allTargetIds });

  const canPrompt = !agentMode && !autoConfirm;
  if (canPrompt) {
    tuiManager.start();
    try {
      selectedTargetIds = await tuiManager.promptMultiSelect({
        message: 'Select clients to install Stacktape MCP into:',
        options: targets.map((target) => ({
          value: target.id,
          label: `${target.label}${detectionMap.get(target.id) ? ' (detected)' : ''}`,
          description: `${target.description} -> ${target.paths[0]}`
        })),
        defaultValues: selectedTargetIds
      });

      if (selectedTargetIds.length === 0) {
        tuiManager.warn('No clients selected. Nothing to do.');
        return { result: { selectedClients: [], updated: 0, created: 0, unchanged: 0, failed: 0 } };
      }

      const confirmed = await tuiManager.promptConfirm({
        message: `Install Stacktape MCP to ${selectedTargetIds.length} config(s)?`,
        defaultValue: true
      });
      if (!confirmed) {
        tuiManager.info('Cancelled by user.');
        return {
          result: {
            selectedClients: selectedTargetIds,
            updated: 0,
            created: 0,
            unchanged: 0,
            failed: 0,
            cancelled: true
          }
        };
      }
    } finally {
      await tuiManager.stop();
    }
  }

  const chosenTargets = targets.filter((target) => selectedTargetIds.includes(target.id));
  const results: InstallResult[] = [];
  const cwd = process.cwd();

  for (const target of chosenTargets) {
    const configPath = await resolveTargetPath({ paths: target.paths });
    const isLocalConfig = configPath.toLowerCase().startsWith(cwd.toLowerCase());
    const effectiveStacktapeCommand = isLocalConfig ? localStacktapeCommand : globalStacktapeCommand;

    if (target.kind === 'json') {
      let effectiveServerConfig = target.serverConfig!;
      if (effectiveStacktapeCommand !== globalStacktapeCommand) {
        if (Array.isArray(effectiveServerConfig.command)) {
          effectiveServerConfig = {
            ...effectiveServerConfig,
            command: [effectiveStacktapeCommand, ...(effectiveServerConfig.command as unknown[]).slice(1)]
          };
        } else if (typeof effectiveServerConfig.command === 'string') {
          effectiveServerConfig = {
            ...effectiveServerConfig,
            command: effectiveStacktapeCommand
          };
        }
      }

      results.push(
        await installJsonTarget({
          configPath,
          rootKey: target.rootKey!,
          serverConfig: effectiveServerConfig,
          client: target.label
        })
      );
      continue;
    }

    results.push(
      await installCodexTarget({ configPath, client: target.label, stacktapeCommand: effectiveStacktapeCommand })
    );
  }

  const created = results.filter((result) => result.status === 'created').length;
  const updated = results.filter((result) => result.status === 'updated').length;
  const unchanged = results.filter((result) => result.status === 'unchanged').length;
  const failed = results.filter((result) => result.status === 'failed').length;

  for (const result of results) {
    if (result.status === 'failed') {
      tuiManager.warn(`${result.client}: FAILED (${result.error})`);
      continue;
    }

    const backupNote = result.backupPath ? ` (backup: ${result.backupPath})` : '';
    tuiManager.info(`${result.client}: ${result.status.toUpperCase()} -> ${result.configPath}${backupNote}`);
  }

  const message = `MCP install complete. created=${created}, updated=${updated}, unchanged=${unchanged}, failed=${failed}.`;
  if (failed > 0) tuiManager.warn(message);
  else tuiManager.success(message);

  return {
    result: {
      selectedClients: chosenTargets.map((target) => target.id),
      created,
      updated,
      unchanged,
      failed,
      results
    }
  };
};
