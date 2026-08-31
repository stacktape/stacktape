import assert from 'node:assert/strict';
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
      '--currentWorkingDirectory',
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
    [
      'script:run',
      '--scn',
      'print spend',
      '--stage',
      'dev',
      '--ui',
      'stream',
      '--currentWorkingDirectory',
      '/console/api'
    ]
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
