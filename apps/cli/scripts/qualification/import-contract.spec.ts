import { describe, expect, test } from 'bun:test';
import type { QualificationCaseManifest } from './contracts';
import { acceptsResourceCount, deployabilityFailure, validateServiceEnvironment } from './import-contract';

const entry = {
  id: 'edge-runtime',
  title: 'Edge runtime',
  why: 'Proves that unsupported platform APIs produce an honest gap.',
  source: { kind: 'git', repository: 'https://example.com/project.git', commit: 'a'.repeat(40), license: 'MIT' },
  origin: 'official-example',
  tags: ['edge'],
  lanes: ['import']
} satisfies QualificationCaseManifest;

describe('import resource presence contract', () => {
  test('fails closed by default and accepts only an explicit negative-project expectation', () => {
    expect(acceptsResourceCount(entry, 0)).toBeFalse();
    expect(acceptsResourceCount(entry, 1)).toBeTrue();
    expect(
      acceptsResourceCount(
        {
          ...entry,
          expect: {
            resourceTypes: {},
            serviceCount: 0,
            httpServiceCount: 0,
            allowNoResources: true
          }
        },
        0
      )
    ).toBeTrue();
  });

  test('fails when the importer unlocks deployment against an explicit blocking contract', () => {
    expect(deployabilityFailure(false, true)).toBe('deployable: expected false; got true.');
    expect(deployabilityFailure(false, false)).toBeUndefined();
    expect(deployabilityFailure(undefined, true)).toBeUndefined();
  });
});

describe('saved per-resource environment contract', () => {
  const expected = [
    { resource: 'api', name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" },
    { resource: 'worker', name: 'REDIS_URL', value: "$ResourceParam('cache', 'connectionString')" }
  ];
  const saved = (apiEntries: unknown[], workerEntries: unknown[]) =>
    JSON.stringify({
      resources: {
        worker: { properties: { environment: workerEntries } },
        api: { properties: { environment: apiEntries } }
      }
    });
  const connection = { name: 'REDIS_URL', value: expected[0]!.value };

  test('checks each owner independently and ignores resource/environment ordering', () => {
    expect(
      validateServiceEnvironment(expected, saved([{ name: 'PORT', value: 3000 }, connection], [connection]))
    ).toEqual([]);
    expect(validateServiceEnvironment(expected, saved([], [connection]))).toEqual([
      'environment api.REDIS_URL: expected exactly one entry; got 0.'
    ]);
    expect(validateServiceEnvironment(expected, saved([connection], []))).toEqual([
      'environment worker.REDIS_URL: expected exactly one entry; got 0.'
    ]);
  });

  test('rejects duplicates and mismatched values without echoing them', () => {
    expect(validateServiceEnvironment(expected, saved([connection, connection], [connection]))).toEqual([
      'environment api.REDIS_URL: expected exactly one entry; got 2.'
    ]);
    const failures = validateServiceEnvironment(
      expected,
      saved([{ name: 'REDIS_URL', value: 'private-marker' }], [connection])
    );
    expect(failures).toEqual(['environment api.REDIS_URL: value does not match.']);
    expect(failures.join()).not.toContain('private-marker');
  });

  test('fails closed for missing resources, malformed entries and invalid YAML', () => {
    expect(validateServiceEnvironment(expected, 'resources: {}')).toHaveLength(2);
    expect(validateServiceEnvironment(expected, saved([null, 'REDIS_URL'], [connection]))).toHaveLength(1);
    expect(validateServiceEnvironment(expected, 'resources: [')).toEqual([
      'Cannot check per-resource environment entries because the saved YAML is invalid.'
    ]);
  });
});
