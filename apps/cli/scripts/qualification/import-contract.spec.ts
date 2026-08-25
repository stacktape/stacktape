import { describe, expect, test } from 'bun:test';
import type { QualificationCaseManifest } from './contracts';
import { acceptsResourceCount, deployabilityFailure } from './import-contract';

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
