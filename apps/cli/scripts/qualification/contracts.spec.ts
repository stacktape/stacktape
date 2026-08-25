import { describe, expect, test } from 'bun:test';
import { BUILT_IN_CASES, SMOKE_CASE_IDS } from './catalog';
import { qualificationManifestSchema } from './contracts';

const validCase = {
  id: 'express-postgres',
  title: 'Express and PostgreSQL',
  why: 'Exercises a common web-service and relational database project.',
  source: {
    kind: 'git' as const,
    repository: 'https://github.com/example/project.git',
    commit: 'a'.repeat(40),
    license: 'MIT',
    licenseUrl: 'https://github.com/example/project/blob/main/LICENSE'
  },
  origin: 'real-application' as const,
  tags: ['node', 'postgres'],
  lanes: ['import', 'package'] as const
};

describe('qualification manifests', () => {
  test('accepts every built-in pinned project and keeps ids unique', () => {
    const manifest = qualificationManifestSchema.parse({ schemaVersion: 1, cases: BUILT_IN_CASES });
    expect(new Set(manifest.cases.map((entry) => entry.id)).size).toBe(manifest.cases.length);
    expect(SMOKE_CASE_IDS.every((id) => manifest.cases.some((entry) => entry.id === id))).toBeTrue();
    expect(
      SMOKE_CASE_IDS.every((id) => manifest.cases.find((entry) => entry.id === id)?.lanes.includes('package'))
    ).toBeTrue();
  });

  test('requires a full commit, license, and path confined to the declared source', () => {
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [{ ...validCase, source: { ...validCase.source, commit: 'abc123' } }]
      })
    ).toThrow('40-character');
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [{ ...validCase, source: { ...validCase.source, license: '' } }]
      })
    ).toThrow();
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [
          {
            ...validCase,
            source: { kind: 'local', path: '../outside', license: 'Proprietary synthetic fixture' }
          }
        ]
      })
    ).toThrow('inside');
    for (const path of ['nested/..', 'nested/deeper/../..', 'C:\\projects\\fixture']) {
      expect(() =>
        qualificationManifestSchema.parse({
          schemaVersion: 1,
          cases: [{ ...validCase, source: { kind: 'local', path, license: 'Synthetic fixture' } }]
        })
      ).toThrow('inside');
    }
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [
          {
            ...validCase,
            source: { ...validCase.source, repository: 'https://token@example.com/project.git' }
          }
        ]
      })
    ).toThrow('credentials');
  });

  test('rejects duplicate case ids', () => {
    expect(() => qualificationManifestSchema.parse({ schemaVersion: 1, cases: [validCase, { ...validCase }] })).toThrow(
      'Duplicate case id'
    );
  });
});
