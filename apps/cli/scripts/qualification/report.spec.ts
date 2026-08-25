import { describe, expect, test } from 'bun:test';
import type { QualificationReport } from './contracts';
import { renderQualificationReport } from './report';

describe('qualification report', () => {
  test('puts the failure, output tail, and exact reproduction command in the human report', () => {
    const report: QualificationReport = {
      schemaVersion: 2,
      runId: 'qualification-test',
      generatedAt: '2026-08-24T12:00:00.000Z',
      productCommit: 'abc123',
      productFingerprint: 'tree-fingerprint',
      lanes: ['import', 'package'],
      environment: { platform: 'win32', architecture: 'x64', bun: '1.3.14', node: '24.0.0' },
      summary: { passed: 0, failed: 1, skipped: 0, durationMs: 1234 },
      globalSteps: [
        {
          name: 'runtime',
          status: 'failed',
          durationMs: 4,
          summary: 'runtime failed',
          reproductionCommand: 'pnpm test:packaging-e2e',
          failure: { code: 'RUNTIME_FAILED', message: 'container did not become healthy', outputTail: 'docker log' }
        }
      ],
      cases: [
        {
          id: 'broken-project',
          title: 'Broken project',
          fingerprint: 'fingerprint',
          sourceFingerprint: 'source-fingerprint',
          execution: 'executed',
          status: 'failed',
          durationMs: 1234,
          source: { kind: 'local', path: 'fixtures/broken', license: 'Synthetic fixture' },
          tags: ['node'],
          steps: [
            {
              name: 'package',
              status: 'failed',
              durationMs: 1000,
              summary: 'Packaging failed.',
              reproductionCommand: 'pnpm qualify:projects -- --case=broken-project --lanes=import,package',
              failure: { code: 'PACKAGE_FAILED', message: 'Missing entrypoint.', outputTail: 'diagnostic output' }
            }
          ]
        }
      ]
    };
    const markdown = renderQualificationReport(report);
    expect(markdown).toContain('Missing entrypoint.');
    expect(markdown).toContain('diagnostic output');
    expect(markdown).toContain('pnpm qualify:projects -- --case=broken-project --lanes=import,package');
    expect(markdown).toContain('pnpm test:packaging-e2e');
    expect(markdown).toContain('container did not become healthy');
  });
});
