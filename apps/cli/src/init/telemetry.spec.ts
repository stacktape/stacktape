import { describe, expect, it } from 'bun:test';
import { initTelemetryEvent } from './telemetry';
import type { WizardState } from './server/wizard-server';

const observations = {
  listeningPorts: [],
  dialedDependency: false,
  missingEnvironmentVariables: [],
  logTail: []
};

describe('init telemetry', () => {
  it('keeps partial verification outcomes separate and records measured durations', () => {
    const state = {
      phase: 'reviewing',
      projectName: 'customer-project-name',
      timeline: [],
      answers: {},
      mode: 'standard',
      configFile: { path: '/private/repository/stacktape.yml', filename: 'stacktape.yml', format: 'yaml' },
      facts: {
        services: [
          {
            name: 'customer-service-name',
            path: '/private/repository',
            language: 'javascript',
            framework: 'express',
            exposesHttp: true,
            executionModel: 'long-running',
            evidence: []
          }
        ],
        dependencies: [],
        existingDeployments: [],
        decisions: []
      },
      composition: {
        resources: { customerResourceName: { type: 'web-service', properties: {} } },
        provenance: {},
        gaps: [],
        deployable: true
      },
      verification: {
        status: 'completed',
        services: [
          {
            serviceName: 'customer-service-name',
            resourceName: 'customerResourceName',
            status: 'passed',
            reason: 'private result text',
            observations
          },
          {
            serviceName: 'private-worker-name',
            resourceName: 'privateWorkerResource',
            status: 'skipped',
            reason: 'private result text',
            observations
          }
        ]
      }
    } satisfies WizardState;

    const event = initTelemetryEvent(state, {
      presentation: 'browser',
      analysisDurationMs: 1200,
      deployDurationMs: 3400
    });

    expect(event).toMatchObject({
      verification: 'inconclusive',
      verification_passed_services: 1,
      verification_skipped_services: 1,
      analysis_duration_ms: 1200,
      deploy_duration_ms: 3400
    });
    expect(JSON.stringify(event)).not.toContain('customer-service-name');
    expect(JSON.stringify(event)).not.toContain('/private/repository');
    expect(JSON.stringify(event)).not.toContain('private result text');
  });
});
