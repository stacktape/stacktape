import { describe, expect, test } from 'bun:test';
import { selectAwsCredentialProfile } from './credential-source';

describe('selectAwsCredentialProfile', () => {
  test('lets short-lived environment credentials override a remembered profile', () => {
    expect(
      selectAwsCredentialProfile({
        persistedProfile: 'default',
        environment: { AWS_ACCESS_KEY_ID: 'temporary-id', AWS_SECRET_ACCESS_KEY: 'temporary-secret' }
      })
    ).toBeUndefined();
  });

  test('keeps an explicitly requested profile', () => {
    expect(
      selectAwsCredentialProfile({
        requestedProfile: 'operator',
        persistedProfile: 'default',
        environment: { AWS_ACCESS_KEY_ID: 'temporary-id', AWS_SECRET_ACCESS_KEY: 'temporary-secret' }
      })
    ).toBe('operator');
  });

  test('uses a remembered profile when no environment credential source exists', () => {
    expect(selectAwsCredentialProfile({ persistedProfile: 'default', environment: {} })).toBe('default');
  });

  test('does not override workload identity credentials with a remembered profile', () => {
    expect(
      selectAwsCredentialProfile({
        persistedProfile: 'default',
        environment: { AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/example' }
      })
    ).toBeUndefined();
  });
});
