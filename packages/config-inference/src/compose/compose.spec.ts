import { describe, expect, it } from 'bun:test';
import {
  PROJECT_FACTS_SCHEMA_VERSION,
  projectFactsSchema,
  type ProjectFacts,
  type ProjectFactsInput
} from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
import { classifyService } from './classify';
import { composeConfig } from './compose';

const service = (overrides: Partial<ServiceFactInput> = {}): ServiceFactInput => ({
  name: 'web',
  path: '.',
  language: 'javascript',
  exposesHttp: true,
  port: 3000,
  executionModel: 'long-running',
  startCommand: 'npm run start',
  environmentVariables: [],
  evidence: [{ file: 'package.json', line: 3, quote: '"start"' }],
  source: 'probe',
  ...overrides
});

const facts = (overrides: Partial<ProjectFactsInput> = {}): ProjectFacts =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [service()],
    ...overrides
  });

describe('classifyService', () => {
  it('uses the dedicated framework resource when there is one', () => {
    expect(
      classifyService(
        projectFactsSchema.parse({
          schemaVersion: 1,
          services: [service({ framework: 'nextjs' })]
        }).services[0]!
      ).resourceType
    ).toBe('nextjs-web');
  });

  it('puts a websocket server in a container, never a per-request function', () => {
    const parsed = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [service({ longLivedConnections: 'websocket' })]
    });

    const classification = classifyService(parsed.services[0]!);
    expect(classification.resourceType).toBe('web-service');
    expect(classification.reason).toContain('websocket');
  });

  it('classifies a non-HTTP long-running process as a worker', () => {
    const parsed = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [service({ name: 'worker', exposesHttp: false, port: undefined })]
    });

    expect(classifyService(parsed.services[0]!).resourceType).toBe('worker-service');
  });

  it('classifies a scheduled process as a batch job', () => {
    const parsed = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [
        service({
          name: 'nightly',
          exposesHttp: false,
          port: undefined,
          executionModel: 'scheduled',
          schedule: '0 3 * * *'
        })
      ]
    });

    expect(classifyService(parsed.services[0]!).resourceType).toBe('batch-job');
  });

  it('serves a build-only static bundle from storage rather than a container', () => {
    const parsed = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [
        service({
          name: 'site',
          exposesHttp: false,
          port: undefined,
          startCommand: undefined,
          servesStaticAssets: { path: 'dist' }
        })
      ]
    });

    expect(classifyService(parsed.services[0]!).resourceType).toBe('hosting-bucket');
  });

  it('classifies an exported handler as a function rather than an always-on worker', () => {
    const parsed = projectFactsSchema.parse({
      schemaVersion: 1,
      services: [
        service({
          exposesHttp: false,
          port: undefined,
          startCommand: undefined,
          executionModel: 'per-request',
          functionEntrypoint: 'src/handler.ts'
        })
      ]
    });

    expect(classifyService(parsed.services[0]!).resourceType).toBe('function');
  });
});

describe('composeConfig', () => {
  it('emits a container service with nixpacks packaging and the start command', () => {
    const { config } = composeConfig({ facts: facts(), projectName: 'shop' });

    expect(config.projectName).toBe('shop');
    expect(config.resources.web).toMatchObject({
      type: 'web-service',
      properties: {
        packaging: {
          type: 'nixpacks',
          properties: { sourceDirectoryPath: '.', startCmd: 'npm run start' }
        },
        // The recommended capacity choice. `economical` would be half of this.
        resources: { cpu: 0.5, memory: 1024 },
        scaling: { minInstances: 1, maxInstances: 3 }
      }
    });
  });

  it('composes function routes through one shared HTTP API gateway', () => {
    const { config, gaps } = composeConfig({
      projectName: 'serverless-api',
      facts: facts({
        services: [
          service({
            name: 'getUser',
            exposesHttp: false,
            port: undefined,
            startCommand: undefined,
            executionModel: 'per-request',
            functionEntrypoint: 'src/get-user.ts',
            functionTriggers: [{ type: 'http', method: 'GET', path: '/users/{id}' }]
          })
        ]
      })
    });

    expect(config.resources.httpApiGateway).toEqual({
      type: 'http-api-gateway',
      properties: {}
    });
    expect(config.resources.getUser).toMatchObject({
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: { entryfilePath: 'src/get-user.ts' }
        },
        events: [
          {
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName: 'httpApiGateway',
              method: 'GET',
              path: '/users/{id}'
            }
          }
        ],
        alarms: [
          {
            trigger: {
              type: 'lambda-error-rate',
              properties: { thresholdPercent: 10 }
            },
            evaluation: {
              period: 300,
              evaluationPeriods: 3,
              breachedPeriods: 2
            },
            includeInHistory: true
          }
        ]
      }
    });
    expect(gaps).toEqual([]);
  });

  it('builds and uploads a single-page application with the native hosting resource', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [
          service({
            name: 'dashboard',
            framework: 'react',
            exposesHttp: false,
            port: undefined,
            startCommand: undefined,
            buildCommand: 'npm run build',
            servesStaticAssets: { path: 'apps/dashboard/dist' },
            path: 'apps/dashboard'
          })
        ]
      })
    });

    expect(config.resources.dashboard).toMatchObject({
      type: 'hosting-bucket',
      properties: {
        uploadDirectoryPath: 'apps/dashboard/dist',
        hostingContentType: 'single-page-app',
        build: { command: 'npm run build', workingDirectory: 'apps/dashboard' }
      }
    });
  });

  it('keeps legacy modes as deterministic headless presets', () => {
    const cheap = composeConfig({ facts: facts(), mode: 'low-cost' }).config.resources.web?.properties;
    const production = composeConfig({ facts: facts(), mode: 'production' }).config.resources.web?.properties;

    expect(cheap).toMatchObject({
      resources: { cpu: 0.25, memory: 512 },
      scaling: { maxInstances: 1 }
    });
    expect(production).toMatchObject({
      resources: { cpu: 1, memory: 2048 },
      scaling: { minInstances: 2 }
    });
  });

  it('always protects databases from deletion while legacy modes retain their backup and HA behavior', () => {
    const withDatabase = (mode: 'low-cost' | 'production') =>
      composeConfig({
        facts: facts({
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
        }),
        mode
      }).config.resources.mainDatabase?.properties as Record<string, unknown>;

    expect(withDatabase('low-cost')).toMatchObject({
      deletionProtection: true,
      automatedBackupRetentionDays: 1
    });
    expect(withDatabase('production')).toMatchObject({
      deletionProtection: true,
      automatedBackupRetentionDays: 14,
      engine: { properties: { primaryInstance: { multiAz: true } } }
    });
  });

  it('applies capacity, availability, and data protection as independent choices', () => {
    const { config } = composeConfig({
      facts: facts({
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'probe'
          },
          {
            name: 'uploads',
            kind: 'object-storage',
            consumedBy: ['web'],
            evidence: [],
            source: 'probe'
          }
        ]
      }),
      preferences: {
        capacity: 'performance',
        availability: 'redundant',
        dataProtection: 'lean',
        databaseAccess: 'public'
      }
    });

    expect(config.resources.web?.properties).toMatchObject({
      resources: { cpu: 1, memory: 2048 },
      scaling: { minInstances: 2, maxInstances: 10 }
    });
    expect(config.resources.mainDatabase?.properties).toMatchObject({
      deletionProtection: true,
      automatedBackupRetentionDays: 1,
      engine: {
        properties: {
          primaryInstance: { instanceSize: 'db.t4g.medium', multiAz: true }
        }
      }
    });
    expect(config.resources.uploads?.properties).toEqual({});
  });

  it('defaults a container database to private access and adds one keyless operator path', () => {
    const composed = composeConfig({
      facts: facts({
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
      })
    });

    expect(composed.recommendedPreferences.databaseAccess).toBe('private');
    expect(composed.preferences.databaseAccess).toBe('private');
    expect(composed.config.resources.mainDatabase?.properties).toMatchObject({
      accessibility: { accessibilityMode: 'vpc', forceDisablePublicIp: true }
    });
    expect(composed.config.resources.databaseBastion).toEqual({
      type: 'bastion',
      properties: { instanceSize: 't3.micro' }
    });
  });

  it('defaults a Lambda database to public access, but honors an explicit private-network choice', () => {
    const input = facts({
      services: [
        service({
          name: 'handler',
          exposesHttp: false,
          port: undefined,
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
            },
            {
              name: 'STRIPE_SECRET_KEY',
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
          consumedBy: ['handler'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

    const recommended = composeConfig({ facts: input });
    expect(recommended.recommendedPreferences.databaseAccess).toBe('public');
    expect(recommended.config.resources.databaseBastion).toBeUndefined();
    expect(recommended.config.resources.handler?.properties.joinDefaultVpc).toBeUndefined();

    const privateChoice = composeConfig({
      facts: input,
      preferences: { databaseAccess: 'private' }
    });
    expect(privateChoice.preferences.databaseAccess).toBe('private');
    expect(privateChoice.config.resources.databaseBastion?.type).toBe('bastion');
    expect(privateChoice.config.resources.handler?.properties.joinDefaultVpc).toBe(true);
    expect(privateChoice.gaps.some((gap) => gap.subject === 'handler.vpc-internet-access')).toBe(true);
  });

  it('joins a Lambda to the VPC for a composed Redis cache without adding a database bastion', () => {
    const composed = composeConfig({
      facts: facts({
        services: [
          service({
            name: 'handler',
            exposesHttp: false,
            port: undefined,
            startCommand: undefined,
            executionModel: 'per-request',
            functionEntrypoint: 'src/handler.ts',
            environmentVariables: [
              {
                name: 'REDIS_URL',
                role: 'infra-dependency',
                dependencyName: 'cache',
                required: true,
                evidence: []
              }
            ]
          })
        ],
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['handler'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    });

    expect(composed.config.resources.handler?.properties.joinDefaultVpc).toBe(true);
    expect(composed.config.resources.databaseBastion).toBeUndefined();
  });

  it('adds only sustained-problem alarms to container and database resources', () => {
    const { config } = composeConfig({
      facts: facts({
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
      })
    });

    expect(config.resources.web?.properties.alarms).toEqual([
      {
        description: 'Web service p95 latency stays above 5 seconds',
        trigger: {
          type: 'http-api-gateway-latency',
          properties: { thresholdMilliseconds: 5000, statistic: 'p95' }
        },
        evaluation: { period: 300, evaluationPeriods: 3, breachedPeriods: 2 },
        includeInHistory: true
      }
    ]);
    expect(config.resources.mainDatabase?.properties.alarms).toEqual([
      {
        description: 'Database has less than 2 GiB of free storage',
        trigger: {
          type: 'database-free-storage',
          properties: { thresholdMB: 2048 }
        },
        evaluation: { period: 300, evaluationPeriods: 3, breachedPeriods: 2 },
        includeInHistory: true
      }
    ]);
  });

  it('prefers the user own Dockerfile when they have one', () => {
    const { config } = composeConfig({
      facts: facts({ services: [service({ dockerfile: 'Dockerfile' })] })
    });

    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'custom-dockerfile',
      properties: { buildContextPath: '.', dockerfilePath: 'Dockerfile' }
    });
  });

  it('wires a database through connectTo rather than restating a connection string', () => {
    const { config } = composeConfig({
      facts: facts({
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: ['web'],
            evidence: [{ file: 'package.json', line: 5, quote: '"pg"' }],
            source: 'probe'
          }
        ]
      })
    });

    expect(config.resources.mainDatabase).toMatchObject({
      type: 'relational-database',
      // Sized by the balanced recommendation: small instance, backups kept, deletion protected.
      properties: {
        engine: {
          type: 'postgres',
          properties: { primaryInstance: { instanceSize: 'db.t4g.small' } }
        }
      }
    });
    expect(config.resources.web?.properties.connectTo).toEqual(['mainDatabase']);
  });

  it('states when a network dependency has no configurable address in the application', () => {
    const { config, gaps } = composeConfig({
      projectName: 'shop',
      facts: facts({
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'mongodb',
            extensions: [],
            consumedBy: ['web'],
            addressedBy: [],
            evidence: [{ file: 'compose.yaml', line: 8, quote: 'image: mongo:8' }],
            source: 'probe'
          }
        ]
      })
    });

    expect(config.resources.web?.properties.connectTo).toEqual(['mainDatabase']);
    expect(config.resources.mainDatabase).toEqual({
      type: 'mongo-db-atlas-cluster',
      properties: { clusterTier: 'M10' }
    });
    expect(gaps).toContainEqual(
      expect.objectContaining({
        subject: 'mainDatabase.address',
        message: expect.stringContaining('does not read a configurable address')
      })
    );
    expect(gaps).toContainEqual(
      expect.objectContaining({
        subject: 'mainDatabase.provider',
        message: expect.stringContaining('providerConfig.mongoDbAtlas')
      })
    );
  });

  it('keeps the database password out of the configuration file', () => {
    const { config } = composeConfig({
      facts: facts({
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
      })
    });

    const credentials = (config.resources.mainDatabase?.properties.credentials ?? {}) as Record<string, string>;
    expect(credentials.masterUserPassword).toBe("$Secret('mainDatabase.password')");
  });

  it('records why every resource exists, pointing at the user own code', () => {
    const { provenance } = composeConfig({
      facts: facts({
        dependencies: [
          {
            name: 'cache',
            kind: 'redis',
            extensions: [],
            consumedBy: ['web'],
            evidence: [{ file: 'package.json', line: 7, quote: '"ioredis"' }],
            source: 'probe'
          }
        ]
      })
    });

    expect(provenance.cache?.reason).toContain('Redis');
    expect(provenance.cache?.evidence[0]).toMatchObject({
      file: 'package.json',
      line: 7
    });
    expect(provenance.web?.reason).toBeTruthy();
  });

  it('turns a third-party secret into a secret reference, never a TODO placeholder', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'STRIPE_SECRET_KEY',
                role: 'third-party-secret',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    const environment = config.resources.web?.properties.environment as Array<{
      name: string;
      value: string;
    }>;
    expect(environment).toEqual([{ name: 'STRIPE_SECRET_KEY', value: "$Secret('stripe_secret_key')" }]);
  });

  it('does not require optional secrets that the application can run without', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'OPTIONAL_API_KEY',
                role: 'third-party-secret',
                required: false,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toBeUndefined();
  });

  it('reports a build-time variable as a gap instead of writing it as a runtime value', () => {
    // Writing it at runtime is the silent failure: the bundle ships with an empty string and the
    // deploy is green.
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'NEXT_PUBLIC_API_URL',
                role: 'build-time',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toBeUndefined();
    expect(gaps.some((gap) => gap.subject === 'web.NEXT_PUBLIC_API_URL')).toBe(true);
  });

  it('keeps a declared runtime value out of facts while leaving a fail-closed secret slot', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'LOG_LEVEL',
                role: 'runtime-config',
                hasDeclaredValue: true,
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toEqual([
      { name: 'LOG_LEVEL', value: "$Secret('log_level')" }
    ]);
    expect(gaps.find((gap) => gap.subject === 'web.LOG_LEVEL')?.message).toContain(
      'set the log_level Stacktape secret'
    );
  });

  it('writes a probe-approved operational literal without asking for a secret', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'LOG_LEVEL',
                role: 'runtime-config',
                hasDeclaredValue: true,
                safeLiteralValue: 'info',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toEqual([{ name: 'LOG_LEVEL', value: 'info' }]);
    expect(gaps.some((gap) => gap.subject.includes('LOG_LEVEL'))).toBe(false);
  });

  it('does not turn unconsumed SDK hints in an unresolved Pulumi app into orphaned infrastructure', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [],
        dependencies: [
          {
            name: 'jobQueue',
            kind: 'queue',
            extensions: [],
            consumedBy: [],
            addressedBy: [],
            evidence: [{ file: 'package.json', line: 4, quote: '"@aws-sdk/client-sqs"' }],
            source: 'probe'
          }
        ],
        existingDeployments: [
          {
            tool: 'pulumi',
            managesAws: true,
            evidence: [{ file: 'Pulumi.yaml', line: 1, quote: 'name:' }],
            source: 'probe'
          }
        ]
      })
    });

    expect(config.resources).toEqual({});
    expect(gaps.find((gap) => gap.subject === 'pulumi')?.message).toContain('orphaned queues');
  });

  it('groups deployment-file values into one understandable action', () => {
    const { gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: ['DOMAIN', 'LOG_LEVEL', 'PUBLIC_ORIGIN'].map((name) => ({
              name,
              role: 'runtime-config' as const,
              hasDeclaredValue: true,
              required: true,
              evidence: []
            }))
          })
        ]
      })
    });

    expect(gaps.filter((gap) => gap.subject.startsWith('web.'))).toEqual([
      {
        subject: 'web.runtime-settings',
        message: expect.stringContaining('DOMAIN, LOG_LEVEL, PUBLIC_ORIGIN')
      }
    ]);
    expect(gaps[0]?.message).toContain('domain, log_level, public_origin');
  });

  it('turns a declared application URL into the service own generated URL', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            framework: 'nextjs',
            environmentVariables: [
              {
                name: 'APP_URL',
                role: 'runtime-config',
                hasDeclaredValue: true,
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toEqual([
      { name: 'APP_URL', value: "$ResourceParam('web', 'url')" }
    ]);
    expect(gaps.some((gap) => gap.subject.includes('APP_URL'))).toBe(false);
  });

  it('resolves a cross-service reference to the other resource', () => {
    const { config } = composeConfig({
      facts: facts({
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
    });

    const environment = config.resources.frontend?.properties.environment as Array<{ name: string; value: string }>;
    expect(environment[0]?.value).toBe("$ResourceParam('api', 'url')");
  });

  it('does not silently turn a requested service host into a complete URL', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            name: 'frontend',
            environmentVariables: [
              {
                name: 'API_HOST',
                role: 'cross-service-reference',
                targetServiceName: 'api',
                targetServiceProperty: 'host',
                required: true,
                evidence: []
              }
            ]
          }),
          service({ name: 'api', path: 'api' })
        ]
      })
    });

    expect(config.resources.frontend?.properties.environment).toBeUndefined();
    expect(gaps.find((gap) => gap.subject === 'frontend.API_HOST')?.message).toContain('expects a service host');
  });

  it('states SQLite as a decision rather than creating nothing and saying nothing', () => {
    const { gaps, assumptions, config } = composeConfig({
      facts: facts({
        dependencies: [
          {
            name: 'localDatabase',
            kind: 'sqlite',
            extensions: [],
            consumedBy: ['web'],
            evidence: [],
            source: 'probe'
          }
        ]
      })
    });

    expect(config.resources.localDatabase).toBeUndefined();
    expect(gaps.some((gap) => gap.subject === 'localDatabase')).toBe(true);
    // Decided, not asked: a SQLite file on a container disk disappears on the next deploy, so the
    // assumption is to move it — and the review screen says so, with the option to change it.
    expect(assumptions.find((assumption) => assumption.kind === 'sqlite-persistence')).toMatchObject({
      chosen: 'migrate-to-managed-database',
      notable: true
    });
  });

  it('gives colliding names distinct resource keys', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [service({ name: 'app', path: 'a' }), service({ name: 'app', path: 'b' })]
      })
    });

    expect(Object.keys(config.resources).toSorted()).toEqual(['app', 'app2']);
  });

  it('is deterministic', () => {
    const input = facts({
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

    expect(JSON.stringify(composeConfig({ facts: input }))).toBe(JSON.stringify(composeConfig({ facts: input })));
  });
});

const environmentOf = (config: ReturnType<typeof composeConfig>['config']): Record<string, string> =>
  Object.fromEntries(
    (
      (config.resources.web?.properties.environment ?? []) as Array<{
        name: string;
        value: string;
      }>
    ).map((entry) => [entry.name, entry.value])
  );

describe('wiring application variable names to created resources', () => {
  // `connectTo` injects `STP_*`-prefixed values, but the application reads the names it was
  // written with. These tests protect the bridge between the two: the app's own name gets an
  // explicit `$ResourceParam`, using only parameter names the CLI's resolvers actually publish.
  const wiredFacts = (environmentVariables: ServiceFactInput['environmentVariables']): ProjectFacts =>
    facts({
      services: [service({ environmentVariables })],
      dependencies: [
        {
          name: 'mainDatabase',
          kind: 'postgres',
          extensions: [],
          consumedBy: ['web'],
          evidence: [],
          source: 'probe'
        },
        {
          name: 'cache',
          kind: 'redis',
          extensions: [],
          consumedBy: ['web'],
          evidence: [],
          source: 'probe'
        },
        {
          name: 'storageBucket',
          kind: 'object-storage',
          extensions: [],
          consumedBy: ['web'],
          evidence: [],
          source: 'probe'
        }
      ]
    });

  it('gives the application its own variable names, pointed at the created resources', () => {
    const { config } = composeConfig({
      facts: wiredFacts([
        {
          name: 'DATABASE_URL',
          role: 'infra-dependency',
          dependencyName: 'mainDatabase',
          required: true,
          evidence: []
        },
        {
          name: 'REDIS_HOST',
          role: 'infra-dependency',
          dependencyName: 'cache',
          required: true,
          evidence: []
        },
        {
          name: 'REDIS_PORT',
          role: 'infra-dependency',
          dependencyName: 'cache',
          required: true,
          evidence: []
        },
        {
          name: 'S3_BUCKET',
          role: 'infra-dependency',
          dependencyName: 'storageBucket',
          required: true,
          evidence: []
        }
      ])
    });

    expect(environmentOf(config)).toMatchObject({
      DATABASE_URL: "$ResourceParam('mainDatabase', 'connectionString')",
      REDIS_HOST: "$ResourceParam('cache', 'host')",
      REDIS_PORT: "$ResourceParam('cache', 'port')",
      S3_BUCKET: "$ResourceParam('storageBucket', 'name')"
    });
    // The access grant still rides along; the explicit values complement it rather than replace it.
    expect(config.resources.web?.properties.connectTo).toEqual(['mainDatabase', 'cache', 'storageBucket']);
  });

  it('hands a password variable the same generated secret the database itself uses', () => {
    const { config } = composeConfig({
      projectName: 'shop',
      facts: wiredFacts([
        {
          name: 'POSTGRES_PASSWORD',
          role: 'infra-dependency',
          dependencyName: 'mainDatabase',
          required: true,
          evidence: []
        },
        {
          name: 'POSTGRES_USER',
          role: 'infra-dependency',
          dependencyName: 'mainDatabase',
          required: true,
          evidence: []
        }
      ])
    });

    const environment = environmentOf(config);
    expect(environment.POSTGRES_PASSWORD).toBe("$Secret('shop-mainDatabase.password')");
    // We do not know the master user name, and a wrong guess is a broken login: better unwired.
    expect(environment.POSTGRES_USER).toBeUndefined();
  });

  it('never lets a hostile variable name break out of a secret directive', () => {
    // Variable names can come from an agent that read untrusted repository content; the directive
    // argument is the one place they are interpolated into syntax.
    const { config } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: "PAYMENT_KEY'),('injected",
                role: 'third-party-secret',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    });

    const environment = (config.resources.web?.properties.environment ?? []) as Array<{ name: string; value: string }>;
    expect(environment[0]?.value).toBe("$Secret('payment_keyinjected')");
    expect(environment[0]?.value).not.toContain("')('");
  });
});

describe('packaging a workspace member from the repository root', () => {
  const workspaceService = (overrides: Partial<ServiceFactInput> = {}) =>
    service({
      name: 'web',
      path: 'apps/web',
      buildCommand: 'pnpm build',
      startCommand: 'pnpm start',
      workspace: {
        packageName: '@acme/web',
        internalDependencies: ['@acme/ui'],
        buildsFromRoot: false
      },
      ...overrides
    });

  it('installs and builds at the root, filtered to the member, for pnpm', () => {
    const { config } = composeConfig({
      facts: facts({ packageManager: 'pnpm', services: [workspaceService()] })
    });

    expect(config.resources.web?.properties.packaging).toEqual({
      type: 'nixpacks',
      properties: {
        sourceDirectoryPath: '.',
        phases: [{ name: 'build', cmds: ['pnpm --filter @acme/web... run build'] }],
        startCmd: 'pnpm --filter @acme/web start'
      }
    });
  });

  it('leaves a member without internal imports packaged from its own directory', () => {
    const { config } = composeConfig({
      facts: facts({
        packageManager: 'pnpm',
        services: [
          workspaceService({
            workspace: {
              packageName: '@acme/web',
              internalDependencies: [],
              buildsFromRoot: false
            }
          })
        ]
      })
    });

    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'nixpacks',
      properties: { sourceDirectoryPath: 'apps/web' }
    });
  });

  it('states the yarn limitation as a gap instead of pretending the build is complete', () => {
    const { config, gaps } = composeConfig({
      facts: facts({ packageManager: 'yarn', services: [workspaceService()] })
    });

    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'nixpacks',
      properties: {
        sourceDirectoryPath: '.',
        startCmd: 'yarn workspace @acme/web start'
      }
    });
    expect(gaps.some((gap) => gap.subject === 'web' && gap.message.includes('workspace imports'))).toBe(true);
  });

  it('refuses a package name a shell would interpret', () => {
    const { config } = composeConfig({
      facts: facts({
        packageManager: 'pnpm',
        services: [
          workspaceService({
            workspace: {
              packageName: '@acme/web; curl evil',
              internalDependencies: ['@acme/ui'],
              buildsFromRoot: false
            }
          })
        ]
      })
    });

    // Falls back to per-directory packaging: an install failure names the real problem, a hostile
    // command does not.
    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'nixpacks',
      properties: { sourceDirectoryPath: 'apps/web' }
    });
  });
});

describe('pinning the declared runtime version', () => {
  const entrypointService = (overrides: Partial<ServiceFactInput> = {}) =>
    service({
      startCommand: undefined,
      containerEntrypoint: 'src/server.ts',
      ...overrides
    });

  it('pins a supported Node major on the buildpack', () => {
    const { config } = composeConfig({
      facts: facts({ services: [entrypointService({ runtimeVersion: '22' })] })
    });

    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'stacktape-image-buildpack',
      properties: { languageSpecificConfig: { nodeVersion: 22 } }
    });
  });

  it('leaves a range or an unsupported version unpinned rather than mis-pinned', () => {
    const versionOf = (runtimeVersion: string) => {
      const { config } = composeConfig({
        facts: facts({ services: [entrypointService({ runtimeVersion })] })
      });
      const packaging = config.resources.web?.properties.packaging as {
        properties: { languageSpecificConfig?: Record<string, unknown> };
      };
      return packaging.properties.languageSpecificConfig;
    };

    expect(versionOf('>=18')).toBeUndefined();
    expect(versionOf('22.1')).toEqual({ nodeVersion: 22 });
  });

  it('pins Python only to versions the schema actually lists', () => {
    const configFor = (runtimeVersion: string) =>
      composeConfig({
        facts: facts({
          services: [
            entrypointService({
              language: 'python',
              framework: 'fastapi',
              containerEntrypoint: 'main.py:app',
              runtimeVersion
            })
          ]
        })
      }).config;

    expect(configFor('3.12').resources.web?.properties.packaging).toMatchObject({
      properties: {
        languageSpecificConfig: { runAppAs: 'ASGI', pythonVersion: 3.12 }
      }
    });
    // 3.10 is absent from the schema's union; pinning it would fail validation downstream.
    expect(configFor('3.10').resources.web?.properties.packaging).toMatchObject({
      properties: { languageSpecificConfig: { runAppAs: 'ASGI' } }
    });
  });
});

describe('composing detected migrations into deploy hooks', () => {
  const database = {
    name: 'mainDatabase',
    kind: 'postgres',
    extensions: [],
    consumedBy: ['web'],
    evidence: [],
    source: 'probe'
  } satisfies NonNullable<ProjectFactsInput['dependencies']>[number];

  const webWithDatabaseUrl = service({
    environmentVariables: [
      {
        name: 'DATABASE_URL',
        role: 'infra-dependency',
        dependencyName: 'mainDatabase',
        required: true,
        evidence: []
      }
    ]
  });

  it('tunnels the documented script-plus-hook pattern into a private database', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [webWithDatabaseUrl],
        dependencies: [database],
        migrations: [
          {
            serviceName: 'web',
            tool: 'prisma',
            command: 'npx prisma migrate deploy',
            runsAt: 'ci',
            evidence: []
          }
        ]
      })
    });

    expect(config.scripts?.migrateDatabase).toEqual({
      type: 'local-script-with-bastion-tunneling',
      properties: {
        executeCommand: 'npx prisma migrate deploy',
        bastionResource: 'databaseBastion',
        connectTo: ['mainDatabase'],
        // The migration tool reads the same name the application does, wired the same way.
        environment: [
          {
            name: 'DATABASE_URL',
            value: "$ResourceParam('mainDatabase', 'connectionString')"
          }
        ]
      }
    });
    expect(config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
  });

  it('gives the migration the exact same case-sensitive database password secret', () => {
    const { config } = composeConfig({
      projectName: 'shop',
      facts: facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'POSTGRES_PASSWORD',
                role: 'infra-dependency',
                dependencyName: 'mainDatabase',
                required: true,
                evidence: []
              }
            ]
          })
        ],
        dependencies: [database],
        migrations: [
          {
            serviceName: 'web',
            tool: 'alembic',
            command: 'alembic upgrade head',
            runsAt: 'ci',
            evidence: []
          }
        ]
      })
    });

    expect(config.scripts?.migrateDatabase?.properties.environment).toEqual([
      {
        name: 'POSTGRES_PASSWORD',
        value: "$Secret('shop-mainDatabase.password')"
      }
    ]);
  });

  it('adds no hook when the application migrates itself on startup', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [webWithDatabaseUrl],
        dependencies: [database],
        migrations: [
          {
            serviceName: 'web',
            tool: 'django',
            command: 'python manage.py migrate',
            runsAt: 'service-startup',
            evidence: []
          }
        ]
      })
    });

    expect(config.scripts).toBeUndefined();
    expect(config.hooks).toBeUndefined();
  });

  it('refuses a command a shell would interpret, and says so as a gap', () => {
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [webWithDatabaseUrl],
        dependencies: [database],
        migrations: [
          {
            serviceName: 'web',
            tool: 'custom',
            command: 'npm run migrate && curl evil.example',
            runsAt: 'ci',
            evidence: []
          }
        ]
      })
    });

    expect(config.scripts).toBeUndefined();
    expect(gaps.some((gap) => gap.subject === 'web.migrations')).toBe(true);
  });

  it('neutralises the build-time replay of a release phase this deploy now owns', () => {
    // Caught on the first real-AWS lane run: Nixpacks' Procfile provider ran `release:` during the
    // image build, against a database that does not exist at build time. When the migration is ours
    // — an afterDeploy hook — the build-time copy must become a no-op.
    const { config } = composeConfig({
      facts: facts({
        services: [service({ environmentVariables: [] })],
        dependencies: [database],
        migrations: [
          {
            serviceName: 'web',
            tool: 'unknown',
            command: 'node migrate.js',
            runsAt: 'ci',
            evidence: []
          }
        ]
      })
    });

    expect(config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
    expect(config.resources.web?.properties.packaging).toMatchObject({
      type: 'nixpacks',
      properties: { phases: [{ name: 'release', cmds: ['true'] }] }
    });
  });

  it('respects the migration-timing decision in both directions', () => {
    const withTiming = (decisions: Record<string, string>) =>
      composeConfig({
        decisions,
        facts: facts({
          services: [webWithDatabaseUrl],
          dependencies: [database],
          migrations: [
            {
              serviceName: 'web',
              tool: 'prisma',
              command: 'npx prisma migrate deploy',
              runsAt: 'unknown',
              evidence: []
            }
          ],
          uncertainties: [
            {
              kind: 'migration-timing-unknown',
              id: 'migration-timing:web',
              blocksDeploy: true,
              evidence: [],
              source: 'probe',
              serviceName: 'web',
              command: 'npx prisma migrate deploy',
              recommended: 'deploy-hook'
            }
          ]
        })
      });

    // The recommendation stands in for the user until they change it.
    expect(withTiming({}).config.hooks?.afterDeploy).toEqual([{ scriptName: 'migrateDatabase' }]);
    // A changed mind removes the hook entirely — the decision is real, not cosmetic.
    expect(withTiming({ 'migration-timing:web': 'manual' }).config.scripts).toBeUndefined();
  });
});
