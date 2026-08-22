import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  commands,
  env,
  ShellExecution,
  Task,
  TaskPanelKind,
  TaskRevealKind,
  TaskScope,
  tasks,
  Uri,
  window,
  workspace
} from 'vscode';
import type { ExtensionContext } from 'vscode';
import { isStacktapeConfigPath } from '../stacktape-files';

const resolveCliExecutable = (configPath: string): string => {
  let directory = dirname(configPath);
  for (;;) {
    for (const executable of process.platform === 'win32' ? ['stacktape.cmd', 'stacktape'] : ['stacktape']) {
      const candidate = join(directory, 'node_modules', '.bin', executable);
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return 'stacktape';
    }
    directory = parent;
  }
};

const promptValue = async (
  context: ExtensionContext,
  stateKey: string,
  settingKey: string,
  title: string,
  prompt: string
): Promise<string | undefined> => {
  const configured = workspace.getConfiguration('stacktape').get<string>(settingKey);
  const previous = context.workspaceState.get<string>(stateKey);
  const value = await window.showInputBox({
    title,
    prompt,
    value: configured || previous || '',
    ignoreFocusOut: true
  });

  if (value) {
    await context.workspaceState.update(stateKey, value);
  }
  return value;
};

const runStacktape = async (
  context: ExtensionContext,
  subcommand: 'deploy' | 'diff' | 'validate',
  options: { confirm?: boolean } = {}
): Promise<void> => {
  const configPath = window.activeTextEditor?.document.uri.fsPath;
  if (!isStacktapeConfigPath(configPath)) {
    await window.showWarningMessage(
      'Open a Stacktape config file, such as stacktape.yml or stacktape.ts, before running this command.'
    );
    return;
  }

  if (options.confirm) {
    const choice = await window.showWarningMessage(
      `Run "stacktape ${subcommand}" for ${basename(configPath)}?`,
      { modal: true },
      'Run'
    );
    if (choice !== 'Run') {
      return;
    }
  }

  const stage = await promptValue(
    context,
    'stacktape.lastStage',
    'defaultStage',
    'Stacktape stage',
    'Stage to target, such as dev, staging, or production'
  );
  if (!stage) {
    return;
  }

  const region = await promptValue(
    context,
    'stacktape.lastRegion',
    'defaultRegion',
    'AWS region',
    'AWS region to target, such as eu-west-1 or us-east-1'
  );
  if (!region) {
    return;
  }

  const args = [subcommand, '--stage', stage, '--region', region, '--configPath', configPath];
  const profile = workspace.getConfiguration('stacktape').get<string>('profile');
  if (profile) {
    args.push('--profile', profile);
  }

  const task = new Task(
    { type: 'stacktape', command: subcommand },
    TaskScope.Workspace,
    `${subcommand} ${basename(configPath)}`,
    'Stacktape',
    new ShellExecution(resolveCliExecutable(configPath), args)
  );
  task.presentationOptions = {
    clear: true,
    panel: TaskPanelKind.Dedicated,
    reveal: TaskRevealKind.Always
  };
  await tasks.executeTask(task);
};

export const registerStacktapeCommands = (context: ExtensionContext): void => {
  context.subscriptions.push(
    commands.registerCommand('stacktape.validate', () => runStacktape(context, 'validate')),
    commands.registerCommand('stacktape.preview', () => runStacktape(context, 'diff')),
    commands.registerCommand('stacktape.deploy', () => runStacktape(context, 'deploy', { confirm: true })),
    commands.registerCommand('stacktape.openExternal', async (url: string) => env.openExternal(Uri.parse(url)))
  );
};
