import { describe, expect, test } from 'bun:test';
import {
  assertCommandPermissions,
  assertPermission,
  assertScopedProjectAccess,
  getRequiredDeletePermission,
  isProductionStage
} from '../permission-guards';

const expectGuardThrowHint = ({ fn, hintPattern }: { fn: () => void; hintPattern: RegExp }) => {
  try {
    fn();
    expect.unreachable('Expected function to throw');
  } catch (error: any) {
    expect(String(error?.hint || '')).toMatch(hintPattern);
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
    expectGuardThrowHint({
      fn: () =>
        assertPermission({
          permission: 'deployments:deploy',
          reason: 'deploy operation is not allowed for your role.',
          permissions: ['projects:view'],
          role: 'VIEWER'
        }),
      hintPattern: /Required permission: deployments:deploy/
    });
  });

  test('falls back to UNKNOWN role when role is missing', () => {
    expectGuardThrowHint({
      fn: () =>
        assertPermission({
          permission: 'deployments:deploy',
          reason: 'deploy operation is not allowed for your role.',
          permissions: []
        }),
      hintPattern: /Current role: UNKNOWN/
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
    expect(() =>
      assertScopedProjectAccess({
        role: 'DEVELOPER',
        projectName: 'ai-tests',
        projects: [{ name: 'web-store' }]
      })
    ).toThrow(/You do not have access to project "ai-tests"/);
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
    expect(() =>
      assertScopedProjectAccess({
        role: 'DEVELOPER',
        projectName: 'Web-Store',
        projects: [{ name: 'web-store' }]
      })
    ).toThrow(/You do not have access to project "Web-Store"/);
  });
});

describe('assertCommandPermissions', () => {
  test('allows unrelated commands', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'projects:list',
        role: 'VIEWER',
        permissions: [],
        projects: []
      })
    ).not.toThrow();
  });

  test('deploy requires deployments:deploy permission', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'deploy',
          role: 'VIEWER',
          permissions: ['projects:view'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:deploy/
    });
  });

  test('deploy enforces scoped project access after permission check', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'deploy',
        role: 'DEVELOPER',
        permissions: ['deployments:deploy'],
        projectName: 'ai-tests',
        projects: [{ name: 'web-store' }]
      })
    ).toThrow(/You do not have access to project "ai-tests"/);
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

  test('codebuild:deploy follows same permission guard as deploy', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'codebuild:deploy',
          role: 'VIEWER',
          permissions: ['projects:view'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:deploy/
    });
  });

  test('delete on prod requires deployments:delete-production', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: 'prod',
          role: 'DEVELOPER',
          permissions: ['deployments:delete-non-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:delete-production/
    });
  });

  test('delete on production (case/whitespace) requires production permission', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: '  PRODUCTION ',
          role: 'DEVELOPER',
          permissions: ['deployments:delete-non-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:delete-production/
    });
  });

  test('delete on non-production requires deployments:delete-non-production', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          stage: 'dev',
          role: 'VIEWER',
          permissions: ['deployments:delete-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:delete-non-production/
    });
  });

  test('delete defaults to non-production permission when stage missing', () => {
    expectGuardThrowHint({
      fn: () =>
        assertCommandPermissions({
          command: 'delete',
          role: 'VIEWER',
          permissions: ['deployments:delete-production'],
          projectName: 'web-store',
          projects: [{ name: 'web-store' }]
        }),
      hintPattern: /Required permission: deployments:delete-non-production/
    });
  });

  test('delete with right permission still enforces scoped project access', () => {
    expect(() =>
      assertCommandPermissions({
        command: 'delete',
        stage: 'dev',
        role: 'DEVELOPER',
        permissions: ['deployments:delete-non-production'],
        projectName: 'ai-tests',
        projects: [{ name: 'web-store' }]
      })
    ).toThrow(/You do not have access to project "ai-tests"/);
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
