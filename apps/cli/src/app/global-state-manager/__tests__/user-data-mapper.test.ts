import { describe, expect, test } from 'bun:test';
import { normalizeCurrentUserAndOrgData } from '../user-data-mapper';

describe('normalizeCurrentUserAndOrgData', () => {
  test('keeps user and organization as-is', () => {
    const user = { id: 'u1', name: 'User' };
    const organization = { id: 'o1', name: 'Org' };
    const result = normalizeCurrentUserAndOrgData({ user, organization });

    expect(result.userData).toBe(user);
    expect(result.organizationData).toBe(organization);
  });

  test('defaults optional arrays to empty arrays', () => {
    const result = normalizeCurrentUserAndOrgData({
      user: { id: 'u1' },
      organization: { id: 'o1' }
    });

    expect(result.connectedAwsAccounts).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.permissions).toEqual([]);
  });

  test('preserves provided arrays', () => {
    const connectedAwsAccounts = [{ id: 'a1' }];
    const projects = [{ id: 'p1', name: 'web-store' }];
    const permissions = ['deployments:deploy'];
    const result = normalizeCurrentUserAndOrgData({
      user: { id: 'u1' },
      organization: { id: 'o1' },
      connectedAwsAccounts,
      projects,
      permissions
    });

    expect(result.connectedAwsAccounts).toBe(connectedAwsAccounts);
    expect(result.projects).toBe(projects);
    expect(result.permissions).toBe(permissions);
  });

  test('normalizes isProjectScoped to strict boolean', () => {
    expect(
      normalizeCurrentUserAndOrgData({ user: { id: 'u1' }, organization: { id: 'o1' }, isProjectScoped: true })
        .isProjectScoped
    ).toBe(true);
    expect(
      normalizeCurrentUserAndOrgData({ user: { id: 'u1' }, organization: { id: 'o1' }, isProjectScoped: false })
        .isProjectScoped
    ).toBe(false);
    expect(
      normalizeCurrentUserAndOrgData({ user: { id: 'u1' }, organization: { id: 'o1' }, isProjectScoped: undefined })
        .isProjectScoped
    ).toBe(false);
  });
});
