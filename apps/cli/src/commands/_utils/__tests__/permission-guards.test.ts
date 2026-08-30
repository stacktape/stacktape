import { describe, expect, test } from 'bun:test';
import {
  assertCommandPermissions,
  assertPermission,
  assertScopedProjectAccess,
  getRequiredDeletePermission,
  isProductionStage
} from '../permission-guards';
import { CliError } from '@utils/errors';

const expectGuardError = ({
  fn,
  code,
  messageIncludes,
  hintIncludes
}: {
  fn: () => void;
  code: string;
  messageIncludes?: string;
  hintIncludes?: string;
}) => {
  try {
    fn();
    expect.unreachable('Expected function to throw');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CliError);
    if (!(error instanceof CliError)) throw error;

    expect(error.code).toBe(code);
    if (messageIncludes) expect(error.message).toContain(messageIncludes);
    if (hintIncludes) expect(error.hints.join('\n')).toContain(hintIncludes);
  }
};

describe('isProductionStage', () => {
  test('returns true for prod', () => {
    expect(isProductionStage('prod')).toBe(true);
  });

  test('returns true for production', () => {
    expect(isProductionStage('production')).toBe(true);
  });

  test('handles uppercase and whitespace', () => {
    expect(isProductionStage('  PRODUCTION  ')).toBe(true);
    expect(isProductionStage('  ProD ')).toBe(true);
  });

  test('returns false for non-production stages', () => {
    expect(isProductionStage('dev')).toBe(false);
    expect(isProductionStage('staging')).toBe(false);
    expect(isProductionStage(undefined)).toBe(false);
  });

  test('recognizes the shared classifier variants', () => {
    expect(isProductionStage('prd')).toBe(true);
    expect(isProductionStage('live')).toBe(true);
    expect(isProductionStage('prod-eu')).toBe(true);
    expect(isProductionStage('client-a-prod')).toBe(true);
    expect(isProductionStage('pre-prod')).toBe(false);
    expect(isProductionStage('prod-test')).toBe(false);
  });
});

describe('getRequiredDeletePermission', () => {
  test('returns production delete permission for production-like stages', () => {
    expect(getRequiredDeletePermission({ stage: 'prod' })).toBe('deployments:delete-production');
    expect(getRequiredDeletePermission({ stage: 'production' })).toBe('deployments:delete-production');
  });

  test('returns non-production delete permission for other stages', () => {
    expect(getRequiredDeletePermission({ stage: 'dev' })).toBe('deployments:delete-non-production');
    expect(getRequiredDeletePermission({ stage: undefined })).toBe('deployments:delete-non-production');
  });
});

describe('assertPermission', () => {
  test('does not throw when permission is present', () => {
    expect(() =>
      assertPermission({
        permission: 'deployments:deploy',
        reason: 'deploy operation is not allowed for your role.',
        permissions: ['deployments:deploy'],
        role: 'DEVELOPER'
      })
    ).not.toThrow();
  });

  test('throws with required permission in hint when missing', () => {
    expectGuardError({
      fn: () =>
        assertPermission({
          permission: 'deployments:deploy',
          reason: 'deploy operation is not allowed for your role.',
          permissions: ['projects:view'],
          role: 'VIEWER'
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:deploy'
    });
  });

  test('falls back to UNKNOWN role when role is missing', () => {
    expectGuardError({
      fn: () =>
        assertPermission({
          permission: 'deployments:deploy',
          reason: 'deploy operation is not allowed for your role.',
          permissions: []
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'UNKNOWN'
    });
  });
});

describe('assertScopedProjectAccess', () => {
  test('does not throw for owner regardless of project scope', () => {
    expect(() =>
      assertScopedProjectAccess({
        role: 'OWNER',
        projectName: 'secret-project',
        projects: []
      })
    ).not.toThrow();
  });

  test('does not throw for admin regardless of project scope', () => {
    expect(() =>
      assertScopedProjectAccess({
        role: 'ADMIN',
        projectName: 'secret-project',
        projects: []
      })
    ).not.toThrow();
  });

  test('does not throw when role is missing', () => {
    expect(() =>
      assertScopedProjectAccess({
        projectName: 'some-project',
        projects: []
      })
    ).not.toThrow();
  });

  test('does not throw when project name is missing', () => {
    expect(() =>
      assertScopedProjectAccess({
        role: 'DEVELOPER',
        projects: [{ name: 'web-store' }]
      })
    ).not.toThrow();
  });

  test('throws for scoped role without access', () => {
    expectGuardError({
      fn: () =>
        assertScopedProjectAccess({
          role: 'DEVELOPER',
          projectName: 'ai-tests',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PROJECT_ACCESS_DENIED',
      messageIncludes: 'ai-tests'
    });
  });

  test('does not throw for scoped role with exact access', () => {
    expect(() =>
      assertScopedProjectAccess({
        role: 'DEVELOPER',
        projectName: 'web-store',
        projects: [{ name: 'web-store' }, { name: 'aws-sdk-test' }]
      })
    ).not.toThrow();
  });

  test('uses exact case-sensitive project name matching', () => {
    expectGuardError({
      fn: () =>
        assertScopedProjectAccess({
          role: 'DEVELOPER',
          projectName: 'Web-Store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PROJECT_ACCESS_DENIED',
      messageIncludes: 'Web-Store'
    });
  });
});

describe('assertCommandPermissions', () => {
  test('allows unrelated commands', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'project:list',
        role: 'VIEWER',
        permissions: [],
        projects: []
      })
    ).not.toThrow();
  });

  test('deploy requires deployments:deploy permission', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'deploy',
          role: 'VIEWER',
          permissions: ['projects:view'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:deploy'
    });
  });

  test('deploy enforces scoped project access after permission check', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'deploy',
          role: 'DEVELOPER',
          permissions: ['deployments:deploy'],
          projectName: 'ai-tests',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PROJECT_ACCESS_DENIED',
      messageIncludes: 'ai-tests'
    });
  });

  test('deploy passes for scoped project with access', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'deploy',
        role: 'DEVELOPER',
        permissions: ['deployments:deploy'],
        projectName: 'web-store',
        projects: [{ name: 'web-store' }]
      })
    ).not.toThrow();
  });

  test('delete on prod requires deployments:delete-production', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: 'prod',
          role: 'DEVELOPER',
          permissions: ['deployments:delete-non-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:delete-production'
    });
  });

  test('delete on production (case/whitespace) requires production permission', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: '  PRODUCTION ',
          role: 'DEVELOPER',
          permissions: ['deployments:delete-non-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:delete-production'
    });
  });

  test('delete on non-production requires deployments:delete-non-production', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: 'dev',
          role: 'VIEWER',
          permissions: ['deployments:delete-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:delete-non-production'
    });
  });

  test('delete defaults to non-production permission when stage missing', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          role: 'VIEWER',
          permissions: ['deployments:delete-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PERMISSION_DENIED',
      hintIncludes: 'deployments:delete-non-production'
    });
  });

  test('delete with right permission still enforces scoped project access', () => {
    expectGuardError({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: 'dev',
          role: 'DEVELOPER',
          permissions: ['deployments:delete-non-production'],
          projectName: 'ai-tests',
          projects: [{ name: 'web-store' }]
        }),
      code: 'CLI_PROJECT_ACCESS_DENIED',
      messageIncludes: 'ai-tests'
    });
  });

  test('delete passes for developer with non-production permission and project access', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'delete',
        stage: 'dev',
        role: 'DEVELOPER',
        permissions: ['deployments:delete-non-production'],
        projectName: 'web-store',
        projects: [{ name: 'web-store' }]
      })
    ).not.toThrow();
  });

  test('delete passes for admin even without scoped project list', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'delete',
        stage: 'dev',
        role: 'ADMIN',
        permissions: ['deployments:delete-non-production'],
        projectName: 'secret-project',
        projects: []
      })
    ).not.toThrow();
  });
});
