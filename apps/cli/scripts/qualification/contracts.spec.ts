import { describe, expect, test } from 'bun:test';
import { BUILT_IN_CASES, SMOKE_CASE_IDS } from './catalog';
import { qualificationManifestSchema, qualificationReportSchema } from './contracts';

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

describe('qualification reports', () => {
  const validResult = {
    id: 'express-postgres',
    title: 'Express and PostgreSQL',
    fingerprint: 'a'.repeat(64),
    sourceFingerprint: 'b'.repeat(64),
    execution: 'executed' as const,
    status: 'passed' as const,
    durationMs: 10,
    source: validCase.source,
    tags: validCase.tags,
    steps: [{ name: 'import' as const, status: 'passed' as const, durationMs: 10, summary: 'Imported.' }]
  };
  const report = {
    schemaVersion: 2,
    runId: 'qualification-test',
    generatedAt: '2026-08-25T00:00:00.000Z',
    productCommit: 'c'.repeat(40),
    productFingerprint: 'd'.repeat(64),
    lanes: ['import'] as const,
    environment: { platform: 'win32', architecture: 'x64', bun: '1.3.14', node: '24.0.0' },
    summary: { passed: 1, failed: 0, skipped: 0, durationMs: 10 },
    globalSteps: [],
    cases: [validResult]
  };

  test('rejects empty case evidence and inconsistent status or summary counts', () => {
    expect(() => qualificationReportSchema.parse({ ...report, cases: [{ ...validResult, steps: [] }] })).toThrow(
      'executed evidence'
    );
    expect(() => qualificationReportSchema.parse({ ...report, cases: [{ ...validResult, status: 'failed' }] })).toThrow(
      'Case status must be passed'
    );
    expect(() =>
      qualificationReportSchema.parse({ ...report, summary: { ...report.summary, passed: 0, skipped: 1 } })
    ).toThrow('Summary passed count must equal 1');
    expect(() => qualificationReportSchema.parse({ ...report, cases: [validResult, validResult] })).toThrow(
      'Duplicate case id'
    );
  });
});
