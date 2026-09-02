import { describe, expect, test } from 'bun:test';
import { resolveEc2RunnerConfigPath } from './ec2-runner-config-path';

describe('EC2 runner config path', () => {
  test('keeps root and nested POSIX config paths relative to the checked-out repository', () => {
    expect(resolveEc2RunnerConfigPath({ repositoryRoot: '/repo', configPath: '/repo/stacktape.ts' })).toBe(
      'stacktape.ts'
    );
    expect(
      resolveEc2RunnerConfigPath({
        repositoryRoot: '/repo',
        configPath: '/repo/apps/cli/_test-stacks/packaging-smoke/stacktape.ts'
      })
    ).toBe('apps/cli/_test-stacks/packaging-smoke/stacktape.ts');
  });

  test('normalizes a nested Windows config path for the Linux runner', () => {
    expect(
      resolveEc2RunnerConfigPath({
        repositoryRoot: 'C:\\repo',
        configPath: 'C:\\repo\\apps\\api\\stacktape.ts'
      })
    ).toBe('apps/api/stacktape.ts');
  });

  test('rejects configs outside the repository instead of sending an unusable path', () => {
    expect(() =>
      resolveEc2RunnerConfigPath({ repositoryRoot: '/repo', configPath: '/repo-other/stacktape.ts' })
    ).toThrow('outside the Git repository');
    expect(() => resolveEc2RunnerConfigPath({ repositoryRoot: '/repo', configPath: '/stacktape.ts' })).toThrow(
      'outside the Git repository'
    );
    expect(() => resolveEc2RunnerConfigPath({ repositoryRoot: 'C:\\repo', configPath: 'D:\\stacktape.ts' })).toThrow(
      'outside the Git repository'
    );
  });
});
