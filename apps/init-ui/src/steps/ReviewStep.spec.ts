import { describe, expect, it } from 'bun:test';
import type { WizardState } from '../session';
import { deploymentPreferenceKeysFor, summarise } from './ReviewStep';

const state = ({
  services,
  dependencies = []
}: {
  services: NonNullable<WizardState['facts']>['services'];
  dependencies?: NonNullable<WizardState['facts']>['dependencies'];
}): WizardState => ({
  phase: 'reviewing',
  projectName: 'demo',
  mode: 'standard',
  timeline: [],
  answers: {},
  facts: { services, dependencies, existingDeployments: [], decisions: [] },
  composition: { resources: {}, provenance: {}, gaps: [], deployable: true }
});

const service = (
  overrides: Partial<NonNullable<WizardState['facts']>['services'][number]>
): NonNullable<WizardState['facts']>['services'][number] => ({
  name: 'app',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  executionModel: 'long-running',
  source: 'probe',
  evidence: [],
  ...overrides
});

describe('the review summary', () => {
  it('calls a static frontend a site, not a background worker', () => {
    expect(
      summarise(
        state({
          services: [
            service({ name: 'api', framework: 'fastapi' }),
            service({
              name: 'frontend',
              framework: 'react',
              exposesHttp: false,
              servesStaticAssets: { path: 'dist' }
            })
          ],
          dependencies: [{ name: 'database', kind: 'postgres', consumedBy: ['api'], source: 'probe', evidence: [] }]
        })
      )
    ).toBe('A FastAPI app with a React site, using a Postgres database.');
  });

  it('still names a real long-running non-HTTP process as a worker', () => {
    expect(
      summarise(
        state({
          services: [service({ framework: 'express' }), service({ name: 'jobs', exposesHttp: false })]
        })
      )
    ).toBe('An Express app with a background worker.');
  });

  it('describes a function-only import without pretending it contains services', () => {
    expect(
      summarise(
        state({
          services: [
            service({ name: 'create', exposesHttp: false, executionModel: 'per-request' }),
            service({ name: 'list', exposesHttp: false, executionModel: 'per-request' })
          ]
        })
      )
    ).toBe('2 serverless functions.');
  });
});

describe('conditional infrastructure preferences', () => {
  it('asks only about choices that affect the generated resource types', () => {
    expect(deploymentPreferenceKeysFor(['hosting-bucket'])).toEqual([]);
    expect(deploymentPreferenceKeysFor(['web-service'])).toEqual(['capacity', 'availability']);
    expect(deploymentPreferenceKeysFor(['bucket'])).toEqual(['dataProtection']);
    expect(deploymentPreferenceKeysFor(['function', 'relational-database', 'bastion'])).toEqual([
      'capacity',
      'availability',
      'dataProtection',
      'databaseAccess'
    ]);
  });
});
