import { describe, expect, test } from 'bun:test';
import type { UptimeCheckManifestEntry } from './manifest';
import { normalizeUptimeManifestEntry } from './manifest';

describe('normalizeUptimeManifestEntry', () => {
  // Exactly what CloudFormation delivers to the custom resource: every leaf scalar stringified.
  const cloudformationStringified = {
    v: '1',
    revision: 'e5339205f6d6d39226168be7',
    project: 'obsmoke-0827',
    stage: 'dev',
    stackName: 'obsmoke-0827-dev',
    checkName: 'homeUptime',
    enabled: 'true',
    url: 'https://example.com',
    method: 'GET',
    intervalSeconds: '60',
    timeoutSeconds: '10',
    followRedirects: 'true',
    assertions: [{ type: 'status-code', properties: { accepted: ['200', '301'] } }]
  } as unknown as UptimeCheckManifestEntry;

  test('restores the scalar types CloudFormation stringified', () => {
    const normalized = normalizeUptimeManifestEntry(cloudformationStringified);
    expect(normalized).toEqual({
      v: 1,
      revision: 'e5339205f6d6d39226168be7',
      project: 'obsmoke-0827',
      stage: 'dev',
      stackName: 'obsmoke-0827-dev',
      checkName: 'homeUptime',
      enabled: true,
      url: 'https://example.com',
      method: 'GET',
      intervalSeconds: 60,
      timeoutSeconds: 10,
      followRedirects: true,
      assertions: [{ type: 'status-code', properties: { accepted: [200, 301] } }]
    });
    // The prober's manifest guard and status matching depend on these exact types.
    expect(normalized.v).toBe(1);
    expect(normalized.assertions![0].type === 'status-code' && normalized.assertions![0].properties.accepted[0]).toBe(
      200
    );
  });

  test('keeps already-typed entries, disabled flags and body assertions intact', () => {
    const typed: UptimeCheckManifestEntry = {
      v: 1,
      revision: 'r',
      project: 'p',
      stage: 's',
      stackName: 'p-s',
      checkName: 'c',
      enabled: false,
      url: 'https://example.com',
      method: 'HEAD',
      intervalSeconds: 30,
      timeoutSeconds: 5,
      followRedirects: false,
      assertions: [{ type: 'body-contains', properties: { value: 'ok' } }]
    };
    expect(normalizeUptimeManifestEntry(typed)).toEqual(typed);
    expect(normalizeUptimeManifestEntry({ ...typed, enabled: 'false' as unknown as boolean }).enabled).toBe(false);
  });
});
