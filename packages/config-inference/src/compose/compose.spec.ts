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
        projectFactsSchema.parse({ schemaVersion: 1, services: [service({ framework: 'nextjs' })] }).services[0]!
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
});

describe('composeConfig', () => {
  it('emits a container service with nixpacks packaging and the start command', () => {
    const { config } = composeConfig({ facts: facts(), projectName: 'shop' });

    expect(config.projectName).toBe('shop');
    expect(config.resources.web).toMatchObject({
      type: 'web-service',
      properties: {
        packaging: { type: 'nixpacks', properties: { sourceDirectoryPath: '.', startCmd: 'npm run start' } },
        // The default mode's sizing. `low-cost` would be half of this.
        resources: { cpu: 0.5, memory: 1024 },
        scaling: { minInstances: 1, maxInstances: 3 }
      }
    });
  });

  it('sizes everything from the chosen mode', () => {
    const cheap = composeConfig({ facts: facts(), mode: 'low-cost' }).config.resources.web?.properties;
    const production = composeConfig({ facts: facts(), mode: 'production' }).config.resources.web?.properties;

    // The one thing no amount of reading the repository can tell us, so it is the one thing chosen.
    expect(cheap).toMatchObject({ resources: { cpu: 0.25, memory: 512 }, scaling: { maxInstances: 1 } });
    expect(production).toMatchObject({ resources: { cpu: 1, memory: 2048 }, scaling: { minInstances: 2 } });
  });

  it('protects a production database and leaves a throwaway one unprotected', () => {
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

    expect(withDatabase('low-cost').deletionProtection).toBeUndefined();
    expect(withDatabase('production')).toMatchObject({
      deletionProtection: true,
      automatedBackupRetentionDays: 14,
      engine: { properties: { primaryInstance: { multiAz: true } } }
    });
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
      // Sized by the mode. `standard` is the default: small instance, backups kept, deletion protected.
      properties: { engine: { type: 'postgres', properties: { primaryInstance: { instanceSize: 'db.t4g.small' } } } }
    });
    expect(config.resources.web?.properties.connectTo).toEqual(['mainDatabase']);
  });

  it('keeps the database password out of the configuration file', () => {
    const { config } = composeConfig({
      facts: facts({
        dependencies: [
          { name: 'mainDatabase', kind: 'postgres', extensions: [], consumedBy: ['web'], evidence: [], source: 'probe' }
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
    expect(provenance.cache?.evidence[0]).toMatchObject({ file: 'package.json', line: 7 });
    expect(provenance.web?.reason).toBeTruthy();
  });

  it('turns a third-party secret into a secret reference, never a TODO placeholder', () => {
    const { config } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [
              { name: 'STRIPE_SECRET_KEY', role: 'third-party-secret', required: true, evidence: [] }
            ]
          })
        ]
      })
    });

    const environment = config.resources.web?.properties.environment as Array<{ name: string; value: string }>;
    expect(environment).toEqual([{ name: 'STRIPE_SECRET_KEY', value: "$Secret('stripe_secret_key')" }]);
  });

  it('reports a build-time variable as a gap instead of writing it as a runtime value', () => {
    // Writing it at runtime is the silent failure: the bundle ships with an empty string and the
    // deploy is green.
    const { config, gaps } = composeConfig({
      facts: facts({
        services: [
          service({
            environmentVariables: [{ name: 'NEXT_PUBLIC_API_URL', role: 'build-time', required: true, evidence: [] }]
          })
        ]
      })
    });

    expect(config.resources.web?.properties.environment).toBeUndefined();
    expect(gaps.some((gap) => gap.subject === 'web.NEXT_PUBLIC_API_URL')).toBe(true);
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

  it('states SQLite as a decision rather than creating nothing and saying nothing', () => {
    const { gaps, assumptions, config } = composeConfig({
      facts: facts({
        dependencies: [
          { name: 'localDatabase', kind: 'sqlite', extensions: [], consumedBy: ['web'], evidence: [], source: 'probe' }
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
        { name: 'mainDatabase', kind: 'postgres', extensions: [], consumedBy: ['web'], evidence: [], source: 'probe' }
      ]
    });

    expect(JSON.stringify(composeConfig({ facts: input }))).toBe(JSON.stringify(composeConfig({ facts: input })));
  });
});
