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
  const facts = projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    ...input
  });
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
            environmentVariables: [
              {
                name: 'STRIPE_KEY',
                role: 'third-party-secret',
                required: true,
                evidence: []
              }
            ]
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
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['api'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    );
  });

  it('a Next.js application', () => {
    expectValid(
      composeFrom({
        services: [service({ name: 'web', framework: 'nextjs' })]
      })
    );
  });

  it('a review-only NuxtHub app keeps a valid partial config without fabricated storage', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        service({
          name: 'web',
          framework: 'nuxt',
          environmentVariables: [
            { name: 'NUXT_SESSION_PASSWORD', role: 'generated-secret', required: true },
            { name: 'NUXT_OAUTH_GITHUB_CLIENT_SECRET', role: 'third-party-secret', required: true }
          ]
        })
      ],
      deploymentRequirements: [
        {
          kind: 'framework-runtime-bindings',
          provider: 'nuxthub',
          serviceName: 'web',
          bindings: ['database', 'blob', 'kv', 'cache'],
          databaseEngine: 'sqlite',
          databaseDeclaredInConfig: true,
          migrationPaths: ['database/changes/0001.sql']
        },
        {
          kind: 'framework-analysis-incomplete',
          provider: 'nuxthub',
          serviceName: 'web',
          reasons: ['source-limit', 'migration-paths']
        }
      ]
    });
    const composed = composeConfig({ facts, projectName: 'demo' });
    expectValid(composed.config);
    expect(composed.deployable).toBe(false);
    expect(Object.keys(composed.config.resources)).toEqual(['web']);
    expect(composed.config.scripts).toBeUndefined();
  });

  it('a worker with a queue and a bucket', () => {
    expectValid(
      composeFrom({
        services: [service({ name: 'worker', path: 'apps/worker', exposesHttp: false })],
        dependencies: [
          {
            name: 'jobQueue',
            kind: 'queue',
            extensions: [],
            consumedBy: ['worker'],
            evidence: [],
            source: 'probe'
          },
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

  it('a one-shot Docker batch job with build arguments and runtime environment', () => {
    const config = composeFrom({
      services: [
        service({
          name: 'bootstrap',
          language: 'go',
          exposesHttp: false,
          executionModel: 'one-shot',
          startCommand: undefined,
          dockerfile: 'build/package/servers.dockerfile',
          dockerfileBuildArgs: [{ argName: 'SERVER_TARGET', value: 'admin' }],
          environmentVariables: [
            {
              name: 'DATABASE_URL',
              role: 'infra-dependency',
              dependencyName: 'mainDatabase',
              required: true,
              evidence: []
            }
          ]
        })
      ],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['bootstrap'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

    expectValid(config);
    expect(config.resources.bootstrap?.properties.container).toMatchObject({
      packaging: {
        type: 'custom-dockerfile',
        properties: {
          dockerfilePath: 'build/package/servers.dockerfile',
          buildArgs: [{ argName: 'SERVER_TARGET', value: 'admin' }]
        }
      },
      environment: [expect.objectContaining({ name: 'DATABASE_URL' })]
    });
    expect(config.resources.bootstrap?.properties.environment).toBeUndefined();
  });

  it('a static site', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'site',
            exposesHttp: false,
            startCommand: undefined,
            servesStaticAssets: { path: 'dist' }
          })
        ]
      })
    );
  });

  it('a service built from its own Dockerfile', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'api',
            language: 'go',
            port: 8080,
            dockerfile: 'Dockerfile',
            startCommand: undefined
          })
        ]
      })
    );
  });

  it('a container with a persistent Docker volume', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'vault',
            language: 'rust',
            port: 80,
            dockerfile: 'docker/Dockerfile',
            startCommand: undefined,
            writesLocalFilesystem: { paths: ['/data'], purpose: 'unknown' },
            declaredContainerVolumes: { paths: ['/data'] }
          })
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
          {
            name: 'mainTable',
            kind: 'dynamodb',
            extensions: [],
            consumedBy: ['api'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    );
  });

  it('a Lambda function behind an HTTP API gateway', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'handler',
            exposesHttp: false,
            startCommand: undefined,
            executionModel: 'per-request',
            functionEntrypoint: 'src/handler.ts',
            functionTriggers: [{ type: 'http', method: 'POST', path: '/events' }]
          })
        ]
      })
    );
  });

  it('a Lambda function explicitly joined to a VPC-only database', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [
        service({
          name: 'handler',
          exposesHttp: false,
          startCommand: undefined,
          executionModel: 'per-request',
          functionEntrypoint: 'src/handler.ts',
          environmentVariables: [
            {
              name: 'DATABASE_URL',
              role: 'infra-dependency',
              dependencyName: 'mainDatabase',
              required: true,
              evidence: []
            }
          ]
        })
      ],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['handler'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const config = composeConfig({
      facts,
      projectName: 'demo',
      preferences: { databaseAccess: 'private' }
    }).config;
    expect(config.resources.handler?.properties.joinDefaultVpc).toBe(true);
    expectValid(config);
  });

  it('an SSR Lambda explicitly joined to a VPC-only database', () => {
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [service({ name: 'web', framework: 'nextjs' })],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['web'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const config = composeConfig({
      facts,
      projectName: 'demo',
      preferences: { databaseAccess: 'private' }
    }).config;
    expect(config.resources.web?.properties.serverLambda).toEqual({ joinDefaultVpc: true });
    expectValid(config);
  });

  it('a source entrypoint using the Stacktape container buildpack', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            startCommand: undefined,
            containerEntrypoint: 'src/server.ts'
          })
        ]
      })
    );
  });

  it('a workspace member built from the repository root', () => {
    expectValid(
      composeFrom({
        packageManager: 'pnpm',
        services: [
          service({
            name: 'web',
            path: 'apps/web',
            buildCommand: 'pnpm build',
            startCommand: 'pnpm start',
            environmentVariables: [],
            workspace: { packageName: '@acme/web', internalDependencies: ['@acme/ui'], buildsFromRoot: false }
          })
        ]
      })
    );
  });

  it('a pinned buildpack runtime version', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'api',
            startCommand: undefined,
            containerEntrypoint: 'src/server.ts',
            runtimeVersion: '22'
          })
        ]
      })
    );
  });

  it('an SSR framework with an explicit build-only command', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'storefront',
            framework: 'nextjs',
            buildCommand: 'npm run build-ci'
          })
        ]
      })
    );
  });

  it('a proxied catch-all function route, as the SST and CDK importers emit it', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'api',
            exposesHttp: false,
            startCommand: undefined,
            executionModel: 'per-request',
            functionEntrypoint: 'src/api.ts',
            functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}' }]
          })
        ]
      })
    );
  });

  it('a database migration wired as a deploy hook', () => {
    // The `scripts` + `hooks.afterDeploy` emission is new surface: a wrong shape here validates
    // nowhere else and fails at deploy time, which is exactly what this suite exists to prevent.
    expectValid(
      composeFrom({
        services: [
          service({
            name: 'api',
            environmentVariables: [
              {
                name: 'DATABASE_URL',
                role: 'infra-dependency',
                dependencyName: 'mainDatabase',
                required: true,
                evidence: []
              }
            ]
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
          }
        ],
        migrations: [
          {
            serviceName: 'api',
            tool: 'prisma',
            command: 'npx prisma migrate deploy',
            runsAt: 'ci',
            evidence: []
          }
        ]
      })
    );
  });
});
