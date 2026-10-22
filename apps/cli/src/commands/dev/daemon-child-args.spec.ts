import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { parseCliInput } from '@utils/cli';
import { buildDaemonChildArgs, getCustomArgsSuffix } from './agent-daemon';

describe('the dev agent daemon command line', () => {
  test('the child parses the same arguments with absolute paths, internal flags before -- and the custom suffix intact', () => {
    const parent = parseCliInput([
      'dev',
      '--stage',
      'dev',
      '--config',
      'infra/stacktape.ts',
      '--resources',
      'api',
      'worker',
      '--no-tunnel',
      '--agent',
      '--agent-port',
      '7400',
      '--',
      '--featureFlag',
      'beta',
      '--verbose'
    ]);
    const customArgs = getCustomArgsSuffix(['dev', '--stage', 'dev', '--', '--featureFlag', 'beta', '--verbose']);
    const childArgs = buildDaemonChildArgs({
      explicitArgs: parent.options,
      customArgs,
      agentPort: 7400,
      cwd: '/work/shop'
    });

    expect(childArgs.indexOf('--agentChild')).toBeLessThan(childArgs.indexOf('--'));
    const child = parseCliInput(childArgs);
    expect(child.commands).toEqual(['dev']);
    expect(child.options).toEqual({
      stage: 'dev',
      configPath: resolve('/work/shop/infra/stacktape.ts'),
      resources: ['api', 'worker'],
      noTunnel: true,
      agentChild: true,
      agentPort: 7400
    });
    expect(child.additionalArgs).toEqual(parent.additionalArgs);
    expect(child.additionalArgs).toEqual({ featureFlag: 'beta', verbose: true });
  });

  test('--cwd becomes absolute and config paths resolve against it', () => {
    const childArgs = buildDaemonChildArgs({
      explicitArgs: { stage: 'dev', currentWorkingDirectory: 'services/api', configPath: 'stacktape.yml' },
      customArgs: [],
      agentPort: 7331,
      cwd: '/work/shop'
    });

    expect(parseCliInput(childArgs).options).toMatchObject({
      currentWorkingDirectory: resolve('/work/shop/services/api'),
      configPath: resolve('/work/shop/services/api/stacktape.yml')
    });
    expect(childArgs).not.toContain('--');
  });

  test('a child started elsewhere receives the project directory', () => {
    const childArgs = buildDaemonChildArgs({
      explicitArgs: { stage: 'dev' },
      customArgs: [],
      agentPort: 7331,
      cwd: '/work/shop',
      workingDir: '/work/shop'
    });
    expect(parseCliInput(childArgs).options.currentWorkingDirectory).toBe('/work/shop');
  });
});
