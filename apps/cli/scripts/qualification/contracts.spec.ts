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

  test('accepts NOASSERTION license and per-service expectations', () => {
    const caseWithServices = {
      ...validCase,
      source: {
        ...validCase.source,
        license: 'NOASSERTION'
      },
      expect: {
        resourceTypes: { 'web-service': 1 },
        serviceCount: 1,
        httpServiceCount: 1,
        services: [
          {
            name: 'app',
            framework: 'react-router',
            exposesHttp: true,
            port: 8000,
            startCommand: 'npm run start',
            buildCommand: 'npm run build',
            dockerfile: 'Dockerfile'
          }
        ]
      }
    };
    const parsed = qualificationManifestSchema.parse({ schemaVersion: 1, cases: [caseWithServices] });
    expect(parsed.cases[0]?.source.license).toBe('NOASSERTION');
    expect(parsed.cases[0]?.expect?.services).toHaveLength(1);
    expect(parsed.cases[0]?.expect?.services?.[0]).toMatchObject({
      name: 'app',
      framework: 'react-router',
      exposesHttp: true,
      port: 8000,
      startCommand: 'npm run start',
      buildCommand: 'npm run build',
      dockerfile: 'Dockerfile'
    });
  });

  test('requires unique service names for order-independent expectations', () => {
    const expectedBase = {
      resourceTypes: { 'web-service': 2 },
      serviceCount: 2,
      httpServiceCount: 2
    };
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [
          {
            ...validCase,
            expect: { ...expectedBase, services: [{ framework: 'react-router' }] }
          }
        ]
      })
    ).toThrow();
    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [
          {
            ...validCase,
            expect: {
              ...expectedBase,
              services: [
                { name: 'app', framework: 'react-router' },
                { name: 'app', framework: 'express' }
              ]
            }
          }
        ]
      })
    ).toThrow('Duplicate expected service name app');
  });

  test('allows an explicit no-resource contract only for a zero-resource result', () => {
    const noResourceCase = {
      ...validCase,
      lanes: ['import'] as const,
      expect: {
        resourceTypes: {},
        serviceCount: 0,
        httpServiceCount: 0,
        allowNoResources: true,
        requiredGapPatterns: ['unsupported runtime']
      }
    };
    const parsed = qualificationManifestSchema.parse({ schemaVersion: 1, cases: [noResourceCase] });
    expect(parsed.cases[0]?.expect?.allowNoResources).toBeTrue();

    expect(() =>
      qualificationManifestSchema.parse({
        schemaVersion: 1,
        cases: [
          {
            ...noResourceCase,
            expect: { ...noResourceCase.expect, resourceTypes: { 'web-service': 1 } }
          }
        ]
      })
    ).toThrow('zero expected resources');
  });

  test('describes import-only and package-qualified projects accurately', () => {
    const importOnly = BUILT_IN_CASES.find((entry) => entry.id === 'react-router-default');
    const packaged = BUILT_IN_CASES.find((entry) => entry.id === 'fly-epic-stack');
    expect(importOnly?.lanes).toEqual(['import']);
    expect(importOnly?.deployment?.reason).toContain('import only');
    expect(packaged?.lanes).toContain('package');
    expect(packaged?.deployment?.reason).toContain('import and packaging');
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
    steps: [
      { name: 'acquire' as const, status: 'passed' as const, durationMs: 1, summary: 'Acquired.' },
      {
        name: 'import' as const,
        status: 'passed' as const,
        durationMs: 9,
        summary: 'Imported.',
        details: { semanticContract: 'verified' }
      }
    ]
  };
  const report = {
    schemaVersion: 4,
    runId: 'qualification-test',
    generatedAt: '2026-08-25T00:00:00.000Z',
    productCommit: 'c'.repeat(40),
    productFingerprint: 'd'.repeat(64),
    lanes: ['import'] as const,
    awsScenarios: [],
    environment: { platform: 'win32', architecture: 'x64', bun: '1.3.14', node: '24.0.0' },
    summary: { passed: 1, failed: 0, skipped: 0, discovery: 0, durationMs: 10 },
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
    expect(() =>
      qualificationReportSchema.parse({ ...report, cases: [{ ...validResult, execution: 'reused' }] })
    ).toThrow('must identify its source report');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [
          {
            ...validResult,
            resumedFrom: { reportPath: 'previous/qualification-report.json', runId: 'previous-run' }
          }
        ]
      })
    ).toThrow('executed evidence must not');
  });

  test('counts run-wide steps in the report summary', () => {
    expect(
      qualificationReportSchema.parse({
        ...report,
        lanes: ['runtime'],
        cases: [],
        globalSteps: [{ name: 'runtime', status: 'passed', durationMs: 10, summary: 'Runtime passed.' }]
      }).summary
    ).toEqual({ passed: 1, failed: 0, skipped: 0, discovery: 0, durationMs: 10 });

    const discoveryResult = {
      ...validResult,
      status: 'discovery' as const,
      steps: [
        validResult.steps[0],
        {
          ...validResult.steps[1],
          summary: 'Generated a configuration for review.',
          details: { semanticContract: 'absent' }
        },
        {
          name: 'package' as const,
          status: 'skipped' as const,
          durationMs: 0,
          summary: 'Packaging awaits a semantic contract.'
        }
      ]
    };
    expect(
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        cases: [discoveryResult],
        summary: { ...report.summary, passed: 0, discovery: 1 }
      }).cases[0]?.status
    ).toBe('discovery');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        cases: [{ ...discoveryResult, status: 'passed' }],
        summary: report.summary
      })
    ).toThrow('Case status must be discovery');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        cases: [
          {
            ...discoveryResult,
            status: 'passed',
            steps: [
              discoveryResult.steps[0],
              discoveryResult.steps[1],
              { ...discoveryResult.steps[2], status: 'passed' }
            ]
          }
        ],
        summary: report.summary
      })
    ).toThrow('Packaging cannot pass before the importer has a reviewed semantic contract');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['runtime'],
        cases: [],
        globalSteps: [{ name: 'runtime', status: 'passed', durationMs: 10, summary: 'Runtime passed.' }],
        summary: { ...report.summary, passed: 0 }
      })
    ).toThrow('Summary passed count must equal 1');
  });

  test('requires exact global-lane evidence with structured failures and AWS scenario identity', () => {
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['runtime'],
        cases: [],
        summary: { ...report.summary, passed: 0 },
        globalSteps: []
      })
    ).toThrow('exactly match requested global lanes');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        summary: { ...report.summary, passed: 2 },
        globalSteps: [{ name: 'runtime', status: 'passed', durationMs: 1, summary: 'Unrequested.' }]
      })
    ).toThrow('exactly match requested global lanes');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['runtime'],
        cases: [],
        summary: { ...report.summary, passed: 0, failed: 1 },
        globalSteps: [{ name: 'runtime', status: 'failed', durationMs: 1, summary: 'Failed.' }]
      })
    ).toThrow('structured failure evidence');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['runtime'],
        cases: [],
        summary: { ...report.summary, passed: 0, skipped: 1 },
        globalSteps: [{ name: 'runtime', status: 'skipped', durationMs: 0, summary: 'Skipped.' }]
      })
    ).toThrow('cannot be reported as skipped');

    const awsStep = (scenario: string) => ({
      name: 'aws' as const,
      status: 'passed' as const,
      durationMs: 1,
      summary: `${scenario} passed.`,
      details: { scenario }
    });
    expect(
      qualificationReportSchema.parse({
        ...report,
        lanes: ['aws'],
        awsScenarios: ['lambda-api', 'container-api'],
        cases: [],
        summary: { ...report.summary, passed: 2 },
        globalSteps: [awsStep('lambda-api'), awsStep('container-api')]
      }).globalSteps
    ).toHaveLength(2);
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['aws'],
        awsScenarios: ['lambda-api', 'container-api'],
        cases: [],
        summary: { ...report.summary, passed: 2 },
        globalSteps: [awsStep('container-api'), awsStep('lambda-api')]
      })
    ).toThrow('must identify its requested scenario');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['aws'],
        awsScenarios: ['lambda-api', 'lambda-api'],
        cases: [],
        summary: { ...report.summary, passed: 2 },
        globalSteps: [awsStep('lambda-api'), awsStep('lambda-api')]
      })
    ).toThrow('AWS scenarios must be unique');
  });

  test('requires non-empty evidence for project lanes', () => {
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [],
        summary: { ...report.summary, passed: 0 }
      })
    ).toThrow('at least one selected project case');
  });

  test('rejects a report that claims no qualification lanes or evidence', () => {
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: [],
        awsScenarios: [],
        cases: [],
        summary: { ...report.summary, passed: 0 },
        globalSteps: []
      })
    ).toThrow('at least one lane');
  });

  test('requires unique ordered requested project steps', () => {
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [
          {
            ...validResult,
            steps: [...validResult.steps, { ...validResult.steps[1] }]
          }
        ]
      })
    ).toThrow('may only be recorded once');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [{ ...validResult, steps: [validResult.steps[1], validResult.steps[0]] }]
      })
    ).toThrow('out of order');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [{ ...validResult, steps: [validResult.steps[0]] }]
      })
    ).toThrow('missing its requested import step');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        cases: [validResult]
      })
    ).toThrow('missing its requested package step');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        cases: [
          {
            ...validResult,
            steps: [
              validResult.steps[0],
              { name: 'import', status: 'skipped', durationMs: 0, summary: 'Skipped without fail-fast.' }
            ]
          }
        ]
      })
    ).toThrow('whole project is a fail-fast skip');
  });

  test('accepts terminal acquisition failures and fully structured fail-fast skips', () => {
    const acquisitionFailure = {
      ...validResult,
      status: 'failed' as const,
      steps: [
        {
          name: 'acquire' as const,
          status: 'failed' as const,
          durationMs: 1,
          summary: 'Acquisition failed.',
          failure: { code: 'ACQUIRE_FAILED', message: 'Missing source.' }
        }
      ]
    };
    expect(
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        summary: { ...report.summary, passed: 0, failed: 1 },
        cases: [acquisitionFailure]
      }).cases[0]?.status
    ).toBe('failed');

    const failFastSkip = {
      ...validResult,
      id: 'skipped-project',
      status: 'skipped' as const,
      steps: (['acquire', 'import', 'package'] as const).map((name) => ({
        name,
        status: 'skipped' as const,
        durationMs: 0,
        summary: 'Stopped by fail-fast.',
        details: { stoppedAfter: acquisitionFailure.id }
      }))
    };
    expect(
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        summary: { ...report.summary, passed: 0, failed: 1, skipped: 1 },
        cases: [acquisitionFailure, failFastSkip]
      }).cases[1]?.status
    ).toBe('skipped');
    expect(() =>
      qualificationReportSchema.parse({
        ...report,
        lanes: ['import', 'package'],
        summary: { ...report.summary, passed: 0, skipped: 1 },
        cases: [failFastSkip]
      })
    ).toThrow('earlier failed case');
  });
});
