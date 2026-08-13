/**
 * Does the composer emit configuration Stacktape will actually accept?
 *
 * The other composer tests assert structure — that a database gets wired through `connectTo`, that
 * a password stays out of the file. Structure being right is not the same as the document being
 * valid, and this suite exists because the difference was not academic: the first version emitted
 * `serviceName` instead of `projectName` at the root, and an `internalHealthCheck` shaped like a
 * load-balancer path when Stacktape wants a container command. Every structural test passed. Every
 * generated configuration was rejected.
 *
 * So this validates finished output against the real generated schema, across the shapes the
 * pipeline is actually expected to produce.
 */

import { describe, expect, it } from 'bun:test';
import Ajv from 'ajv';
import configSchema from '@stacktape/config/config-schema.json' with { type: 'json' };
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema, type ProjectFactsInput } from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
import { composeConfig } from './compose';

// Ajv 6: unknown documentation keywords (`x-stp-focus`, `markdownDescription`) are ignored rather
// than rejected, so no opt-out is needed. `allErrors` makes a failure report every problem at once,
// which matters when a union rejects across several branches.
const ajv = new Ajv({ allErrors: true });
const validateConfig = ajv.compile(configSchema as object);

const describeErrors = (): string =>
  (validateConfig.errors ?? [])
    .map((error) => `${error.dataPath || '(root)'} ${error.message} ${JSON.stringify(error.params)}`)
    .join('\n');

const service = (overrides: Partial<ServiceFactInput>): ServiceFactInput => ({
  name: 'app',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  executionModel: 'long-running',
  startCommand: 'npm run start',
  environmentVariables: [],
  evidence: [],
  source: 'probe',
  ...overrides
});

const composeFrom = (input: Omit<ProjectFactsInput, 'schemaVersion'>) => {
  const facts = projectFactsSchema.parse({ schemaVersion: PROJECT_FACTS_SCHEMA_VERSION, ...input });
  return composeConfig({ facts, projectName: 'demo' }).config;
};

const expectValid = (config: unknown): void => {
  const valid = validateConfig(config);
  if (!valid) {
    throw new Error(`Composed configuration was rejected by the Stacktape schema:\n${describeErrors()}`);
  }
  expect(valid).toBe(true);
};

describe('composed configuration conforms to the Stacktape schema', () => {
  it('an HTTP service with a database and a cache', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'api',
            port: 3000,
            framework: 'express',
            environmentVariables: [{ name: 'STRIPE_KEY', role: 'third-party-secret', required: true, evidence: [] }]
          })
        ],
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: ['api'],
            evidence: [],
            source: 'probe'
          },
          { name: 'cache', kind: 'redis', extensions: [], consumedBy: ['api'], evidence: [], source: 'probe' }
        ]
      })
    );
  });

  it('a Next.js application', () => {
    expectValid(composeFrom({ services: [service({ name: 'web', framework: 'nextjs' })] }));
  });

  it('a worker with a queue and a bucket', () => {
    expectValid(
      composeFrom({
        services: [service({ name: 'worker', path: 'apps/worker', exposesHttp: false })],
        dependencies: [
          { name: 'jobQueue', kind: 'queue', extensions: [], consumedBy: ['worker'], evidence: [], source: 'probe' },
          {
            name: 'storageBucket',
            kind: 'object-storage',
            extensions: [],
            consumedBy: ['worker'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    );
  });

  it('a scheduled batch job', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'nightly',
            path: 'jobs',
            exposesHttp: false,
            executionModel: 'scheduled',
            schedule: '0 3 * * *'
          })
        ]
      })
    );
  });

  it('a static site', () => {
    expectValid(
      composeFrom({
        services: [
          service({ name: 'site', exposesHttp: false, startCommand: undefined, servesStaticAssets: { path: 'dist' } })
        ]
      })
    );
  });

  it('a service built from its own Dockerfile', () => {
    expectValid(
      composeFrom({
        services: [
          service({ name: 'api', language: 'go', port: 8080, dockerfile: 'Dockerfile', startCommand: undefined })
        ]
      })
    );
  });

  it('two services referring to each other', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'frontend',
            environmentVariables: [
              {
                name: 'API_URL',
                role: 'cross-service-reference',
                targetServiceName: 'api',
                required: true,
                evidence: []
              }
            ]
          }),
          service({ name: 'api', path: 'api' })
        ]
      })
    );
  });

  it('a DynamoDB table', () => {
    expectValid(
      composeFrom({
        services: [service({ name: 'api' })],
        dependencies: [
          { name: 'mainTable', kind: 'dynamodb', extensions: [], consumedBy: ['api'], evidence: [], source: 'probe' }
        ]
      })
    );
  });
});
