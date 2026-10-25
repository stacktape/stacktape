import { describe, expect, it } from 'bun:test';
import { isDeploymentPreferenceChange, profileForPreferences } from './preferences';

describe('deployment preferences', () => {
  it('accepts only a matching key and value from the closed public vocabulary', () => {
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'performance' })).toBe(true);
    expect(isDeploymentPreferenceChange({ key: 'databaseAccess', value: 'private' })).toBe(true);
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'private' })).toBe(false);
    expect(isDeploymentPreferenceChange({ key: 'notifications', value: 'everything' })).toBe(false);
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'balanced', extra: true })).toBe(false);
  });

  it('keeps protection independent from cost and availability', () => {
    expect(
      profileForPreferences({
        capacity: 'economical',
        availability: 'single',
        dataProtection: 'lean',
        databaseAccess: 'public'
      })
    ).toMatchObject({
      container: { cpu: 0.25, memory: 512 },
      scaling: { minInstances: 1, maxInstances: 1 },
      database: { multiAz: false, deletionProtection: true, backupRetentionDays: 1 },
      bucket: { versioning: false }
    });

    expect(
      profileForPreferences({
        capacity: 'performance',
        availability: 'redundant',
        dataProtection: 'protected',
        databaseAccess: 'private'
      })
    ).toMatchObject({
      container: { cpu: 1, memory: 2048 },
      scaling: { minInstances: 2, maxInstances: 10 },
      database: { multiAz: true, deletionProtection: true, backupRetentionDays: 7 },
      bucket: { versioning: true }
    });
  });
});
