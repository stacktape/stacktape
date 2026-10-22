import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { sourceCliArgsForConsoleScript } from './run-console-cli-script.ts';

test('replaces the package executable while preserving its literal Stacktape arguments', () => {
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape deploy --region eu-west-1 --stage dev --cp stacktape.ts --hs --projectName console-app',
      workingDirectory: '/repo/apps/console/api'
    }),
    [
      'deploy',
      '--region',
      'eu-west-1',
      '--stage',
      'dev',
      '--cp',
      'stacktape.ts',
      '--hs',
      '--projectName',
      'console-app',
      '--cwd',
      '/repo/apps/console/api'
    ]
  );
});

test('appends UI and other overrides after the package script arguments', () => {
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape script:run --scn "print spend" --stage dev',
      overrides: ['--ui', 'stream'],
      workingDirectory: '/console/api'
    }),
    ['script:run', '--scn', 'print spend', '--stage', 'dev', '--ui', 'stream', '--cwd', '/console/api']
  );
});

test('does not replace an explicitly selected working directory', () => {
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape deploy --cwd custom-project',
      workingDirectory: '/console/api'
    }),
    ['deploy', '--cwd', 'custom-project']
  );
});

test('resolves caller-supplied config paths from the invocation directory', () => {
  const invocationDirectory = resolve('workspace-root');
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape script:run --scn printSpend --stage production',
      overrides: ['--cp', './apps/console/api/stacktape.ts', '--', '--month', '08/2026'],
      invocationDirectory,
      workingDirectory: '/console/api'
    }),
    [
      'script:run',
      '--scn',
      'printSpend',
      '--stage',
      'production',
      '--cp',
      resolve(invocationDirectory, 'apps/console/api/stacktape.ts'),
      '--cwd',
      '/console/api',
      '--',
      '--month',
      '08/2026'
    ]
  );
});

test('normalizes equals-form working-directory overrides but leaves script arguments untouched', () => {
  const invocationDirectory = resolve('workspace-root');
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape script:run --scn printSpend',
      overrides: ['--cwd=./apps/console/api', '--', '--cp', 'script-value'],
      invocationDirectory,
      workingDirectory: '/ignored'
    }),
    [
      'script:run',
      '--scn',
      'printSpend',
      `--cwd=${resolve(invocationDirectory, 'apps/console/api')}`,
      '--',
      '--cp',
      'script-value'
    ]
  );
});

test('rejects non-Stacktape and compound shell scripts instead of changing their meaning', () => {
  assert.throws(
    () => sourceCliArgsForConsoleScript({ command: 'tsx scripts/task.ts', workingDirectory: '/console/api' }),
    /must start/
  );
  assert.throws(
    () =>
      sourceCliArgsForConsoleScript({
        command: 'stacktape deploy && echo finished',
        workingDirectory: '/console/api'
      }),
    /Only one literal Stacktape command/
  );
});

test('resolves public config flags while preserving public command paths', () => {
  const invocationDirectory = resolve('workspace-root');
  assert.deepEqual(
    sourceCliArgsForConsoleScript({
      command: 'stacktape script run report',
      overrides: ['--config', './infra/stacktape.ts'],
      invocationDirectory,
      workingDirectory: '/console/api'
    }),
    ['script', 'run', 'report', '--config', resolve(invocationDirectory, 'infra/stacktape.ts'), '--cwd', '/console/api']
  );
});
