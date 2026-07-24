import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';

export const run = (
  command: string,
  args: readonly string[],
  options: Readonly<{ cwd: string; capture?: boolean }>
): string => {
  const isWindowsPnpm = process.platform === 'win32' && command === 'pnpm';
  if (isWindowsPnpm && args.join(' ') !== 'install --frozen-lockfile') {
    throw new Error('The Windows pnpm wrapper accepts only the fixed frozen-install operation.');
  }

  const executable = isWindowsPnpm ? (process.env.ComSpec ?? 'cmd.exe') : command;
  const executableArgs = isWindowsPnpm ? ['/d', '/s', '/c', 'pnpm install --frozen-lockfile'] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });

  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr.trim()}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}.${detail}`);
  }

  return options.capture ? result.stdout.trim() : '';
};

export const repositoryRoot = (): string =>
  realpathSync(run('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), capture: true }));

export const validateSliceId = (sliceId: string | undefined): string => {
  if (!sliceId || !/^[a-z0-9][a-z0-9-]{1,49}$/.test(sliceId)) {
    throw new Error('Slice ID must be 2-50 lowercase letters, digits, or hyphens and start with a letter or digit.');
  }

  return sliceId;
};

export const assertInside = (parent: string, candidate: string): void => {
  const relative = path.relative(parent, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe path outside ${parent}: ${candidate}`);
  }
};
