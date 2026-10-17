import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { checkExecutableInPath } from '@utils/bin-executable';
import type { ServerCommand } from './agents';

export type ResolvedServerCommand = ServerCommand & {
  /** Set when the command may stop working later, so the person can be told. */
  caveat?: string;
};

const isScriptRuntime = (path: string) => ['bun', 'bun.exe', 'node', 'node.exe'].includes(basename(path).toLowerCase());

/**
 * The command agents run to start `stacktape mcp`.
 *
 * - The install script's binary (`~/.stacktape/bin/stacktape`) stays at one path across upgrades, so it is written as
 *   an absolute path: GUI agents launched from the Dock or Start menu often lack the shell's PATH.
 * - Otherwise, when `stacktape` is on PATH (for example a global npm install), the bare name is written so upgrades
 *   keep working.
 * - Otherwise the running binary is written by its absolute path, with a caveat that it may move.
 */
export const resolveServerCommand = ({
  execPath = process.execPath,
  stacktapeOnPath = checkExecutableInPath('stacktape'),
  installScriptDirectory = join(process.env.USERPROFILE || homedir(), '.stacktape', 'bin')
}: {
  execPath?: string;
  stacktapeOnPath?: string;
  installScriptDirectory?: string;
} = {}): ResolvedServerCommand => {
  const args = ['mcp'];
  const runningBinary = isScriptRuntime(execPath) ? undefined : resolve(execPath);
  const installScriptBinary = join(
    installScriptDirectory,
    process.platform === 'win32' ? 'stacktape.exe' : 'stacktape'
  );

  const installScriptPath = resolve(installScriptBinary);

  if (stacktapeOnPath && resolve(stacktapeOnPath) === installScriptPath) return { command: installScriptPath, args };
  if (stacktapeOnPath) return { command: 'stacktape', args };
  if (runningBinary === installScriptPath) return { command: installScriptPath, args };
  if (runningBinary) {
    return {
      command: runningBinary,
      args,
      caveat: `\`stacktape\` is not on your PATH, so agents run ${runningBinary}. If that file moves (for example after an upgrade), run \`stacktape mcp:add\` again.`
    };
  }
  return {
    command: 'stacktape',
    args,
    caveat: 'Stacktape is running from source and `stacktape` is not on your PATH, so agents will not find it yet.'
  };
};
