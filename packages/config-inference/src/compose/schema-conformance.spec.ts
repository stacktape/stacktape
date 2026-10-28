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
import { DIRECT_INVOCATION_SOURCE, type ServiceFactInput } from '../facts/service';
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

const workflowVariable = (name: string, dependencyName: string) => ({
  name,
  role: 'infra-dependency' as const,
  dependencyName,
  required: true,
  evidence: []
});

const serviceReference = (name: string, targetServiceName: string, targetServiceProperty?: 'arn') => ({
  name,
  role: 'cross-service-reference' as const,
  targetServiceName,
  ...(targetServiceProperty === undefined ? {} : { targetServiceProperty }),
  required: true,
  evidence: []
});

/** A queue the topic fans out to. */
const subscribed = (name: string, rawMessageDelivery: boolean) => ({
  name,
  kind: 'queue' as const,
  topicSubscription: { topicName: 'notificationsTopic', rawMessageDelivery },
  evidence: [],
  source: 'probe' as const
});

describe('composed configuration conforms to the Stacktape schema', () => {
  it('a service that keeps its SQLite file on a mounted disk', () => {
    expectValid(
      composeFrom({
        services: [
          service({
            environmentVariables: [
              {
                name: 'DATABASE_URL',
                role: 'infra-dependency',
                dependencyName: 'localDatabase',
                required: true,
                evidence: []
              }
            ]
          })
        ],
        dependencies: [
          {
            name: 'localDatabase',
            kind: 'sqlite',
            consumedBy: ['app'],
            addressedBy: ['DATABASE_URL'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    );
  });

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

  it('typed Lambda handlers, a scheduled function and frontends that stacktape dev runs', () => {
    const fn = (name: string, overrides: Partial<ServiceFactInput>) =>
      service({
        name,
        path: 'src',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `src/${name}.ts`,
        ...overrides
      });
    const config = composeFrom({
      services: [
        fn('api', {
          functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }],
          environmentVariables: [
            {
              name: 'STP_DB_CONNECTION_STRING',
              role: 'infra-dependency',
              dependencyName: 'db',
              required: true,
              evidence: []
            }
          ]
        }),
        fn('worker', { functionTriggers: [{ type: 'queue', dependencyName: 'jobs' }] }),
        fn('prune', { schedule: '0 3 * * *' }),
        service({
          name: 'site',
          path: 'web',
          exposesHttp: false,
          startCommand: undefined,
          framework: 'vite',
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          servesStaticAssets: { path: 'web/dist' },
          environmentVariables: [
            { name: 'VITE_API_URL', role: 'build-time', targetServiceName: 'api', required: true, evidence: [] }
          ]
        }),
        service({
          name: 'dashboard',
          path: 'dashboard',
          framework: 'nextjs',
          devCommand: 'npm run dev',
          environmentVariables: [
            { name: 'NEXT_PUBLIC_API_URL', role: 'build-time', targetServiceName: 'api', required: true, evidence: [] }
          ]
        })
      ],
      dependencies: [
        { name: 'db', kind: 'postgres', extensions: [], consumedBy: ['api'], evidence: [], source: 'probe' },
        { name: 'jobs', kind: 'queue', extensions: [], consumedBy: [], evidence: [], source: 'probe' }
      ]
    });
    expectValid(config);
    expect(config.resources.site?.properties).toMatchObject({
      dev: { command: 'npm run dev', workingDirectory: 'web' },
      injectEnvironment: [{ name: 'VITE_API_URL', value: "$ResourceParam('httpApiGateway', 'url')" }]
    });
    expect(config.resources.prune?.properties.events).toEqual([
      { type: 'schedule', properties: { scheduleRate: 'cron(0 3 * * ? *)' } }
    ]);
  });

  it('two functions declaring one route keep it once and report the second', () => {
    const fn = (name: string) =>
      service({
        name,
        path: 'src',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `src/${name}.ts`,
        functionTriggers: [{ type: 'http', method: 'ANY', path: '/{proxy+}' }]
      });
    const facts = projectFactsSchema.parse({
      schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
      services: [fn('a'), fn('b')]
    });
    const result = composeConfig({ facts, projectName: 'demo' });

    expectValid(result.config);
    expect(result.config.resources.a?.properties.events).toHaveLength(1);
    expect(result.config.resources.b?.properties.events).toBeUndefined();
    expect(result.gaps.map((gap) => gap.subject)).toContain('b.route');
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

  it('a function that publishes, browser uploads and a seed script', () => {
    const config = composeFrom({
      services: [
        service({
          name: 'api',
          path: 'api',
          language: 'python',
          exposesHttp: false,
          executionModel: 'per-request',
          startCommand: undefined,
          functionEntrypoint: 'api/main.py',
          functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }],
          presignedUploadMethods: ['PUT'],
          environmentVariables: [
            { name: 'DATABASE_URL', role: 'infra-dependency', dependencyName: 'mainDatabase', required: true },
            { name: 'UPLOAD_BUCKET', role: 'infra-dependency', dependencyName: 'storageBucket', required: true },
            { name: 'EVENTS_TOPIC', role: 'infra-dependency', dependencyName: 'notificationsTopic', required: true }
          ]
        }),
        service({
          name: 'web',
          path: 'web',
          framework: 'sveltekit',
          exposesHttp: false,
          executionModel: 'long-running',
          startCommand: undefined,
          devCommand: 'npm run dev'
        })
      ],
      dependencies: [
        { name: 'mainDatabase', kind: 'postgres', consumedBy: ['api'], evidence: [], source: 'probe' },
        { name: 'storageBucket', kind: 'object-storage', consumedBy: ['api'], evidence: [], source: 'probe' },
        { name: 'notificationsTopic', kind: 'topic', consumedBy: ['api'], evidence: [], source: 'probe' }
      ],
      localScripts: [
        {
          name: 'seed',
          command: 'npm run seed',
          directory: '.',
          environmentVariables: [
            { name: 'DATABASE_URL', role: 'infra-dependency', dependencyName: 'mainDatabase', required: true }
          ]
        }
      ]
    });

    expect(config.resources.storageBucket?.properties.cors).toEqual({
      enabled: true,
      corsRules: [{ allowedOrigins: ['*'], allowedMethods: ['PUT'], allowedHeaders: ['*'] }]
    });
    expect(config.scripts?.seed?.type).toBe('local-script');
    expectValid(config);
  });

  it('WebSocket routes, a table stream, an event bus rule and the addresses a frontend reads', () => {
    const fn = (name: string, overrides: Partial<ServiceFactInput>) =>
      service({
        name,
        path: 'functions',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `functions/${name}.ts`,
        ...overrides
      });
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          fn('ws', {
            functionTriggers: [
              { type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['$connect', '$disconnect', '$default'] }
            ]
          }),
          // `$default` is taken; one API holds each route once.
          fn('chat', {
            functionTriggers: [{ type: 'websocket', dependencyName: 'websocketApi', routeKeys: ['send', '$default'] }]
          }),
          fn('stream', {
            functionTriggers: [{ type: 'dynamodb-stream', dependencyName: 'mainTable', streamType: 'NEW_IMAGE' }],
            environmentVariables: [
              {
                name: 'EVENT_BUS_NAME',
                role: 'infra-dependency',
                dependencyName: 'eventBus',
                required: true,
                evidence: []
              }
            ]
          }),
          fn('notify', {
            functionTriggers: [
              { type: 'event-bus', dependencyName: 'eventBus', detailTypes: ['OrderCreated'], sources: ['shop'] }
            ],
            environmentVariables: [
              {
                name: 'WS_MANAGEMENT_URL',
                role: 'infra-dependency',
                dependencyName: 'websocketApi',
                required: true,
                evidence: []
              }
            ]
          }),
          service({ name: 'orders-api', path: 'api', port: 8080 }),
          service({
            name: 'web',
            path: 'web',
            framework: 'nextjs',
            devCommand: 'npm run dev',
            environmentVariables: [
              {
                name: 'NEXT_PUBLIC_WS_URL',
                role: 'build-time',
                dependencyName: 'websocketApi',
                required: true,
                evidence: []
              },
              {
                name: 'ORDERS_API_URL',
                role: 'cross-service-reference',
                targetServiceName: 'orders-api',
                required: true,
                evidence: []
              }
            ]
          })
        ],
        dependencies: [
          {
            name: 'mainTable',
            kind: 'dynamodb',
            itemKey: { partitionKey: 'customerId', sortKey: 'orderId' },
            consumedBy: [],
            evidence: [],
            source: 'probe'
          },
          { name: 'eventBus', kind: 'event-bus', consumedBy: ['stream'], evidence: [], source: 'probe' },
          { name: 'websocketApi', kind: 'websocket-api', consumedBy: ['notify'], evidence: [], source: 'probe' }
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    const { resources } = result.config;
    expect(resources.mainTable?.properties).toEqual({
      primaryKey: {
        partitionKey: { name: 'customerId', type: 'string' },
        sortKey: { name: 'orderId', type: 'string' }
      },
      streamType: 'NEW_IMAGE'
    });
    expect(resources.chat?.properties.events).toEqual([
      { type: 'websocket-api-gateway', properties: { websocketApiGatewayName: 'websocketApi', routeKey: 'send' } }
    ]);
    expect(result.gaps.map((gap) => gap.subject)).toEqual(['chat.route']);
    expect(resources.web?.properties.environment).toEqual([
      { name: 'ORDERS_API_URL', value: "$ResourceParam('ordersApi', 'url')" },
      { name: 'NEXT_PUBLIC_WS_URL', value: "$ResourceParam('websocketApi', 'url')" }
    ]);
  });

  it('a function URL, and state machines with ordered Task states or a placeholder', () => {
    const fn = (name: string, overrides: Partial<ServiceFactInput> = {}) =>
      service({
        name,
        path: 'functions',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `functions/${name}.ts`,
        ...overrides
      });
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          fn('stats', { functionTriggers: [{ type: 'url' }] }),
          fn('score'),
          fn('mark-decision'),
          service({
            name: 'api',
            path: 'api',
            port: 8000,
            environmentVariables: [
              workflowVariable('APPROVAL_WORKFLOW_ARN', 'approvalWorkflow'),
              workflowVariable('REFUND_WORKFLOW_ARN', 'refundWorkflow')
            ]
          }),
          service({
            name: 'web',
            path: 'web',
            framework: 'sveltekit',
            devCommand: 'npm run dev',
            environmentVariables: [
              {
                name: 'STATS_URL',
                role: 'cross-service-reference',
                targetServiceName: 'stats',
                required: true,
                evidence: []
              }
            ]
          })
        ],
        dependencies: [
          {
            name: 'approvalWorkflow',
            kind: 'state-machine',
            consumedBy: ['api'],
            addressedBy: ['APPROVAL_WORKFLOW_ARN'],
            workflowSteps: ['score', 'mark-decision'],
            evidence: [],
            source: 'probe'
          },
          {
            name: 'refundWorkflow',
            kind: 'state-machine',
            consumedBy: ['api'],
            addressedBy: ['REFUND_WORKFLOW_ARN'],
            evidence: [],
            source: 'probe'
          }
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    const { resources } = result.config;
    expect(resources.stats?.properties.url).toEqual({ enabled: true });
    expect(resources.web?.properties.environment).toEqual([
      { name: 'STATS_URL', value: "$ResourceParam('stats', 'url')" }
    ]);
    expect(resources.approvalWorkflow?.properties.definition).toEqual({
      StartAt: 'Score',
      States: {
        Score: { Type: 'Task', Resource: "$ResourceParam('score', 'arn')", Next: 'MarkDecision' },
        MarkDecision: { Type: 'Task', Resource: "$ResourceParam('markDecision', 'arn')", End: true }
      }
    });
    // No order for the second one: a placeholder, and one item. Its candidate states would be the functions nothing
    // invokes, but the first workflow runs both.
    expect(resources.refundWorkflow?.properties.definition).toEqual({
      StartAt: 'Start',
      States: { Start: { Type: 'Pass', End: true } }
    });
    expect(resources.api?.properties).toMatchObject({
      environment: [
        { name: 'APPROVAL_WORKFLOW_ARN', value: "$ResourceParam('approvalWorkflow', 'arn')" },
        { name: 'REFUND_WORKFLOW_ARN', value: "$ResourceParam('refundWorkflow', 'arn')" }
      ],
      connectTo: ['approvalWorkflow', 'refundWorkflow']
    });
    expect(result.gaps).toEqual([
      {
        subject: 'refundWorkflow.definition',
        message:
          "Your code starts refundWorkflow, a Step Functions workflow, but init cannot tell which states it runs. Its definition is a Pass placeholder; replace it with your workflow's states before deploying."
      }
    ]);
  });

  it('a state machine whose states the code does not order names the functions nothing invokes', () => {
    const fn = (name: string) =>
      service({
        name,
        path: 'functions',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `functions/${name}.ts`
      });
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [fn('score'), fn('audit')],
        dependencies: [
          {
            name: 'approvalWorkflow',
            kind: 'state-machine',
            consumedBy: [],
            addressedBy: ['APPROVAL_WORKFLOW_ARN'],
            evidence: [],
            source: 'probe'
          }
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    // One item for the workflow instead of a "no event invokes it" item for each function.
    expect(result.gaps.map((gap) => gap.subject)).toEqual(['approvalWorkflow.definition']);
    expect(result.gaps[0]!.message).toContain('may be its Task states: score, audit.');
  });

  it('a function URL a browser calls gets CORS, says it is public, and a directly invoked function says how to wire it', () => {
    const fn = (name: string, overrides: Partial<ServiceFactInput> = {}) =>
      service({
        name,
        path: 'functions',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `functions/${name}.ts`,
        ...overrides
      });
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          fn('stats', { functionTriggers: [{ type: 'url' }] }),
          fn('report', { functionTriggers: [{ type: 'url' }] }),
          fn('send-email', { functionTriggers: [{ type: 'unmapped', sourceType: DIRECT_INVOCATION_SOURCE }] }),
          service({
            name: 'web',
            path: 'web',
            framework: 'nextjs',
            devCommand: 'npm run dev',
            environmentVariables: [
              // Read in the browser: the browser calls the URL itself.
              {
                name: 'NEXT_PUBLIC_STATS_URL',
                role: 'build-time',
                targetServiceName: 'stats',
                required: true,
                evidence: []
              },
              // Read on the server only.
              {
                name: 'REPORT_URL',
                role: 'cross-service-reference',
                targetServiceName: 'report',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    const { resources } = result.config;
    expect(resources.stats?.properties.url).toEqual({ enabled: true, cors: { enabled: true } });
    expect(resources.report?.properties.url).toEqual({ enabled: true });
    expect(result.provenance.stats?.reason).toContain('Its function URL is public (authMode NONE)');
    expect(result.gaps).toEqual([
      {
        subject: 'send-email',
        message:
          "Your code invokes send-email directly with the Lambda Invoke API. Before deploying, give the workload that calls it connectTo: [sendEmail] and pass it the function's ARN with $ResourceParam('sendEmail', 'arn')."
      }
    ]);
  });

  // The r2gg part B shapes: a Java function the API invokes by name, a private service only the API calls, a job each
  // queue message starts, and a frontend reading the address of an HTTP-triggered function.
  it('a Java function invoked by name, a private service, a job per queue message and a function address', () => {
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          service({
            name: 'api',
            path: 'apps/api',
            environmentVariables: [
              serviceReference('RECS_URL', 'recs'),
              serviceReference('TAX_FUNCTION_NAME', 'tax', 'arn')
            ]
          }),
          service({ name: 'recs', path: 'apps/recs', language: 'python', internalOnly: true, port: 5000 }),
          service({
            name: 'tax',
            path: 'functions/tax',
            language: 'java',
            runtimeVersion: '21',
            exposesHttp: false,
            executionModel: 'per-request',
            startCommand: undefined,
            functionEntrypoint: 'functions/tax/src/main/java/shelf/TaxHandler.java',
            functionHandler: 'TaxHandler::handleRequest',
            functionTriggers: [{ type: 'unmapped', sourceType: DIRECT_INVOCATION_SOURCE }]
          }),
          service({
            name: 'quote',
            path: 'functions/quote',
            language: 'typescript',
            exposesHttp: false,
            executionModel: 'per-request',
            startCommand: undefined,
            functionEntrypoint: 'functions/quote/handler.ts',
            functionTriggers: [{ type: 'http', method: 'GET', path: '/quote/{sku}', payloadFormat: '2.0' }]
          }),
          service({
            name: 'report',
            path: 'jobs/report',
            exposesHttp: false,
            executionModel: 'one-shot',
            functionTriggers: [{ type: 'queue', dependencyName: 'jobQueue' }]
          }),
          service({
            name: 'web',
            path: 'apps/web',
            framework: 'astro',
            environmentVariables: [serviceReference('API_URL', 'api'), serviceReference('QUOTE_URL', 'quote')]
          })
        ],
        dependencies: [{ name: 'jobQueue', kind: 'queue', consumedBy: ['api'], evidence: [], source: 'probe' }]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    const { resources } = result.config;
    expect(resources.api?.properties).toMatchObject({
      environment: [
        { name: 'RECS_URL', value: "$CfFormat('http://{}', $ResourceParam('recs', 'address'))" },
        { name: 'TAX_FUNCTION_NAME', value: "$ResourceParam('tax', 'arn')" }
      ],
      connectTo: ['jobQueue', 'recs', 'tax']
    });
    expect(resources.recs?.type).toBe('private-service');
    expect(resources.tax?.properties).toMatchObject({
      packaging: { type: 'buildpack', properties: { handlerFunction: 'TaxHandler::handleRequest' } },
      runtime: 'java21'
    });
    expect(resources.report).toMatchObject({
      type: 'batch-job',
      properties: { resources: { cpu: 1 }, events: [{ type: 'sqs', properties: { sqsQueueName: 'jobQueue' } }] }
    });
    expect(resources.web?.properties.environment).toEqual([
      { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'QUOTE_URL', value: "$ResourceParam('httpApiGateway', 'url')" }
    ]);
    expect(result.gaps).toEqual([]);
  });

  it('says when a catch-all route drops the path parameters a handler reads, and when a Java package will not load', () => {
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          service({
            name: 'quote',
            path: 'functions',
            language: 'typescript',
            exposesHttp: false,
            executionModel: 'per-request',
            startCommand: undefined,
            functionEntrypoint: 'functions/quote.ts',
            functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}', pathParameters: ['sku'] }]
          })
        ],
        handlerFindings: [
          {
            path: 'functions/tax/src/main/java/com/acme/tax/TaxHandler.java',
            language: 'Java',
            reason: 'java-package',
            packageName: 'com.acme.tax'
          }
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    expect(result.gaps).toEqual([
      {
        subject: 'quote.route',
        message:
          'quote reads the path parameter sku, but init could not tell its route, so it takes every request on /{proxy+} and that parameter arrives empty. Before deploying, set its http-api-gateway event to the route that defines {sku}.'
      },
      {
        subject: 'functions/tax/src/main/java/com/acme/tax/TaxHandler.java',
        message:
          "TaxHandler is in package com.acme.tax, but Stacktape currently builds a Java handler from the class's folder: tax.TaxHandler::handleRequest. Lambda cannot load that class, so every invocation fails. Until Stacktape builds the handler from the package, put TaxHandler in package tax."
      }
    ]);
  });

  it('a Go function, SNS fanout to one queue per consumer, and a table whose key the code does not name', () => {
    const consumer = (name: string, queue: string) =>
      service({
        name,
        path: 'functions',
        language: 'typescript',
        exposesHttp: false,
        executionModel: 'per-request',
        startCommand: undefined,
        functionEntrypoint: `functions/${name}.ts`,
        functionTriggers: [{ type: 'queue', dependencyName: queue }]
      });
    const result = composeConfig({
      facts: projectFactsSchema.parse({
        schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
        services: [
          service({
            name: 'ping',
            path: 'functions/ping',
            language: 'go',
            exposesHttp: false,
            executionModel: 'per-request',
            startCommand: undefined,
            functionEntrypoint: 'functions/ping/main.go',
            functionTriggers: [{ type: 'http', method: '*', path: '/{proxy+}', payloadFormat: '2.0' }]
          }),
          consumer('billing', 'billingQueue'),
          consumer('audit', 'auditQueue')
        ],
        dependencies: [
          { name: 'notificationsTopic', kind: 'topic', evidence: [], source: 'probe' },
          subscribed('billingQueue', true),
          subscribed('auditQueue', false),
          {
            name: 'mainTable',
            kind: 'dynamodb',
            writtenItemAttributes: ['id', 'expiresAt'],
            consumedBy: ['audit'],
            evidence: [],
            source: 'probe'
          }
        ]
      }),
      projectName: 'demo'
    });

    expectValid(result.config);
    const { resources, cloudformationResources } = result.config;
    // No runtime: the buildpack builds a Go entry file for provided.al2023.
    expect(resources.ping?.properties).toMatchObject({
      packaging: { type: 'buildpack', properties: { entryfilePath: 'functions/ping/main.go' } }
    });
    expect(resources.ping?.properties.runtime).toBeUndefined();
    expect(Object.keys(cloudformationResources ?? {})).toEqual(['billingQueueSubscription', 'auditQueueSubscription']);
    expect(cloudformationResources?.auditQueueSubscription?.Properties.RawMessageDelivery).toBe(false);
    expect(resources.mainTable?.properties.primaryKey).toEqual({ partitionKey: { name: 'pk', type: 'string' } });
    expect(result.gaps).toEqual([
      {
        subject: 'mainTable.primaryKey',
        message:
          "Your code writes items with id and expiresAt to mainTable, but no request names the table's key. Its partition key is the placeholder pk, which these items do not have, so DynamoDB rejects every write. Before deploying, set primaryKey.partitionKey to whichever of id or expiresAt identifies an item."
      }
    ]);
  });
});
