import { describe, expect, it } from 'bun:test';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '../facts/project-facts';
import { defaultDeploymentPreferences, isDeploymentPreferenceChange, profileForPreferences } from './preferences';

const factsForExecutionModel = (executionModel: 'long-running' | 'per-request') =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [
      {
        name: 'app',
        path: '.',
        language: 'javascript',
        exposesHttp: executionModel === 'long-running',
        executionModel,
        ...(executionModel === 'long-running'
          ? { port: 3000, startCommand: 'npm start' }
          : { functionEntrypoint: 'src/handler.ts' }),
        environmentVariables: [],
        evidence: [],
        source: 'probe'
      }
    ],
    dependencies: [
      {
        name: 'database',
        kind: 'postgres',
        extensions: [],
        consumedBy: ['app'],
        evidence: [],
        source: 'probe'
      }
    ]
  });

describe('deployment preferences', () => {
  it('accepts only a matching key and value from the closed public vocabulary', () => {
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'performance' })).toBe(true);
    expect(isDeploymentPreferenceChange({ key: 'databaseAccess', value: 'private' })).toBe(true);
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'private' })).toBe(false);
    expect(isDeploymentPreferenceChange({ key: 'notifications', value: 'everything' })).toBe(false);
    expect(isDeploymentPreferenceChange({ key: 'capacity', value: 'balanced', extra: true })).toBe(false);
  });

  it('keeps protection independent from cost and availability', () => {
    expect(
      profileForPreferences({
        capacity: 'economical',
        availability: 'single',
        dataProtection: 'lean',
        databaseAccess: 'public'
      })
    ).toMatchObject({
      container: { cpu: 0.25, memory: 512 },
      scaling: { minInstances: 1, maxInstances: 1 },
      database: { multiAz: false, deletionProtection: true, backupRetentionDays: 1 },
      bucket: { versioning: false }
    });

    expect(
      profileForPreferences({
        capacity: 'performance',
        availability: 'redundant',
        dataProtection: 'protected',
        databaseAccess: 'private'
      })
    ).toMatchObject({
      container: { cpu: 1, memory: 2048 },
      scaling: { minInstances: 2, maxInstances: 10 },
      database: { multiAz: true, deletionProtection: true, backupRetentionDays: 7 },
      bucket: { versioning: true }
    });
  });

  it('recommends public database access for a Lambda consumer and private access for a container', () => {
    expect(defaultDeploymentPreferences(factsForExecutionModel('long-running')).databaseAccess).toBe('private');
    expect(defaultDeploymentPreferences(factsForExecutionModel('per-request')).databaseAccess).toBe('public');
  });

  it('recommends a private SQL database when a Lambda already needs the VPC for Redis', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        {
          name: 'app',
          path: '.',
          language: 'javascript',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: 'src/handler.ts',
          environmentVariables: [],
          evidence: [],
          source: 'probe'
        }
      ],
      dependencies: [
        {
          name: 'database',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['app'],
          evidence: [],
          source: 'probe'
        },
        {
          name: 'cache',
          kind: 'redis',
          extensions: [],
          consumedBy: ['app'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

    expect(defaultDeploymentPreferences(facts).databaseAccess).toBe('private');
  });
});
