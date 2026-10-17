import { reportInitTelemetry } from './telemetry';
import type { WizardState } from './server/wizard-server';

const observations = {
  listeningPorts: [],
  dialedDependency: false,
  missingEnvironmentVariables: [],
  logTail: []
};

const state = {
  phase: 'reviewing',
  projectName: 'customer-project-name',
  timeline: [],
  answers: {},
  preferences: {
    capacity: 'performance',
    availability: 'single',
    dataProtection: 'protected',
    databaseAccess: 'private'
  },
  recommendedPreferences: {
    capacity: 'balanced',
    availability: 'single',
    dataProtection: 'protected',
    databaseAccess: 'private'
  },
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

void reportInitTelemetry(state, {
  presentation: 'browser',
  analysisDurationMs: 1200,
  deployDurationMs: 3400
}).then(() => console.log('init-completed'));
