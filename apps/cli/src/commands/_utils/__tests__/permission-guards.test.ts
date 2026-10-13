import { expect, test } from 'bun:test';
import { assertCommandPermissions } from '../permission-guards';
import { CliError } from '@utils/errors';

// These are CLI admission rules. Console HTTP scenarios enforce server authorization but cannot catch a
// CLI choosing the wrong deletion permission, skipping project admission, or losing its actionable error.
const checkError = (call: () => void, code: string, detail: string) => {
  try {
    call();
    expect.unreachable('Expected the command to be denied');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CliError);
    if (!(error instanceof CliError)) throw error;
    expect(error.code).toBe(code);
    expect(`${error.message}\n${error.hints.join('\n')}`).toContain(detail);
  }
};
const base = { role: 'DEVELOPER', projectName: 'shop', projects: [{ name: 'shop' }] };

test('delete chooses the permission for the actual stage, including production aliases and missing stages', () => {
  for (const [stage, production] of [
    ['prod', true],
    ['production', true],
    ['  PRODUCTION  ', true],
    ['prd', true],
    ['live', true],
    ['prod-eu', true],
    ['client-a-prod', true],
    ['pre-prod', false],
    ['prod-test', false],
    ['dev', false],
    [undefined, false]
  ] as const) {
    const required = production ? 'deployments:delete-production' : 'deployments:delete-non-production';
    const wrong = production ? 'deployments:delete-non-production' : 'deployments:delete-production';
    checkError(
      () => assertCommandPermissions({ ...base, command: 'delete', stage, permissions: [wrong] }),
      'CLI_PERMISSION_DENIED',
      required
    );
    expect(() =>
      assertCommandPermissions({ ...base, command: 'delete', stage, permissions: [required] })
    ).not.toThrow();
  }
});

test('deploy and delete require permission before admitting a scoped project', () => {
  for (const [command, permission] of [
    ['deploy', 'deployments:deploy'],
    ['delete', 'deployments:delete-non-production']
  ] as const) {
    checkError(
      () => assertCommandPermissions({ ...base, command, stage: 'dev', permissions: [], projects: [] }),
      'CLI_PERMISSION_DENIED',
      permission
    );
    for (const projectName of ['billing', 'Shop']) {
      checkError(
        () => assertCommandPermissions({ ...base, command, stage: 'dev', projectName, permissions: [permission] }),
        'CLI_PROJECT_ACCESS_DENIED',
        projectName
      );
    }
    expect(() => assertCommandPermissions({ ...base, command, stage: 'dev', permissions: [permission] })).not.toThrow();
  }
});

test('owners and admins are unscoped, and incomplete admission context preserves its existing fallback', () => {
  for (const role of ['OWNER', 'ADMIN', undefined]) {
    expect(() =>
      assertCommandPermissions({
        command: 'deploy',
        role,
        projectName: 'billing',
        projects: [],
        permissions: ['deployments:deploy']
      })
    ).not.toThrow();
  }
  expect(() =>
    assertCommandPermissions({
      command: 'deploy',
      role: 'DEVELOPER',
      projects: [],
      permissions: ['deployments:deploy']
    })
  ).not.toThrow();
  checkError(() => assertCommandPermissions({ command: 'deploy' }), 'CLI_PERMISSION_DENIED', 'UNKNOWN');
});

test('commands with no deployment permission requirement remain usable', () => {
  expect(() =>
    assertCommandPermissions({ command: 'project:list', role: 'VIEWER', permissions: [], projects: [] })
  ).not.toThrow();
});
