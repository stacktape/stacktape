import { describe, expect, test } from 'bun:test';
import type { StpUptimeCheck } from '@domain-services/config-manager/resolved-types/uptime-checks';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import { resolveUptimeCheckRegions, validateUptimeCheck } from './uptime-checks';

const baseCheck = (
  overrides: Partial<StpUptimeCheck & { regions: SupportedAWSRegion[] }> = {}
): StpUptimeCheck & { regions: SupportedAWSRegion[] } => ({
  name: 'apiHealth',
  type: 'uptime-check',
  configParentResourceType: 'uptime-check',
  nameChain: ['apiHealth'],
  url: 'https://api.example.com/health',
  method: 'GET',
  intervalSeconds: 60,
  timeoutSeconds: 10,
  followRedirects: true,
  enabled: true,
  regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1'],
  ...overrides
});

describe('resolveUptimeCheckRegions', () => {
  test('keeps explicitly configured regions', () => {
    expect(resolveUptimeCheckRegions({ configuredRegions: ['eu-central-1'], stackRegion: 'eu-west-1' })).toEqual([
      'eu-central-1'
    ]);
  });

  test('defaults to the stack region plus two distant regions', () => {
    expect(resolveUptimeCheckRegions({ configuredRegions: undefined, stackRegion: 'eu-central-1' })).toEqual([
      'eu-central-1',
      'us-east-1',
      'eu-west-1'
    ]);
  });

  test('does not duplicate the stack region when it is a distant-region candidate', () => {
    expect(resolveUptimeCheckRegions({ configuredRegions: undefined, stackRegion: 'us-east-1' })).toEqual([
      'us-east-1',
      'eu-west-1',
      'ap-southeast-1'
    ]);
  });
});

describe('validateUptimeCheck', () => {
  test('accepts a plain https check', () => {
    expect(() => validateUptimeCheck({ check: baseCheck() })).not.toThrow();
  });

  test('accepts a url that still contains an unresolved directive', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ url: "$ResourceParam('api', 'url')" }) })).not.toThrow();
  });

  test('rejects a literal url without an http scheme', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ url: 'api.example.com' }) })).toThrow(
      /must be an `http:\/\/` or `https:\/\/` URL/
    );
  });

  test('rejects body-contains assertions on HEAD checks', () => {
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({
          method: 'HEAD',
          assertions: [{ type: 'body-contains', properties: { value: 'ok' } }]
        })
      })
    ).toThrow(/has no body to match/);
  });

  test('rejects out-of-range timeout and evaluation values', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ timeoutSeconds: 31 }) })).toThrow(/between 1 and 30/);
    expect(() => validateUptimeCheck({ check: baseCheck({ evaluation: { consecutiveFailures: 0 } }) })).toThrow(
      /between 1 and 10/
    );
    expect(() => validateUptimeCheck({ check: baseCheck({ timeoutSeconds: 2.5 }) })).toThrow(/between 1 and 30/);
    expect(() => validateUptimeCheck({ check: baseCheck({ intervalSeconds: 30, timeoutSeconds: 30 }) })).not.toThrow();
    expect(() => validateUptimeCheck({ check: baseCheck({ intervalSeconds: 30, timeoutSeconds: 31 }) })).toThrow(
      /between 1 and 30/
    );
  });

  test('rejects malformed assertions', () => {
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'status-code', properties: { accepted: [] } }] })
      })
    ).toThrow(/at least one entry/);
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'status-code', properties: { accepted: [42] } }] })
      })
    ).toThrow(/between 100 and 599/);
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({ assertions: [{ type: 'body-contains', properties: { value: '   ' } }] })
      })
    ).toThrow(/non-empty/);
  });

  test('treats only real directive syntax as deferred validation', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ url: 'price$100.example' }) })).toThrow(
      /must be an `http:\/\/` or `https:\/\/` URL/
    );
  });

  test('rejects duplicate and excessive probe regions', () => {
    expect(() => validateUptimeCheck({ check: baseCheck({ regions: ['eu-west-1', 'eu-west-1'] }) })).toThrow(
      /duplicate entries/
    );
    expect(() =>
      validateUptimeCheck({
        check: baseCheck({
          regions: ['eu-west-1', 'us-east-1', 'ap-southeast-1', 'eu-central-1', 'us-west-2', 'ca-central-1']
        })
      })
    ).toThrow(/at most 5 probe regions/);
  });
});
