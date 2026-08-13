import { describe, expect, it } from 'bun:test';
import {
  PROJECT_FACTS_SCHEMA_VERSION,
  checkFactsCompleteness,
  factsAreUsable,
  projectFactsSchema,
  type ProjectFacts,
  type ProjectFactsInput
} from './project-facts';
import { serviceFactSchema, type ServiceFactInput } from './service';

const citation = { file: 'src/index.ts', line: 1, quote: 'app.listen(3000)' };

const service = (overrides: Partial<ServiceFactInput> = {}): ServiceFactInput => ({
  name: 'web',
  path: '.',
  language: 'typescript',
  exposesHttp: true,
  port: 3000,
  executionModel: 'long-running',
  startCommand: 'node dist/index.js',
  environmentVariables: [],
  evidence: [citation],
  source: 'probe',
  ...overrides
});

const facts = (overrides: Partial<ProjectFactsInput> = {}): ProjectFacts =>
  projectFactsSchema.parse({
    schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
    services: [service()],
    ...overrides
  });

describe('serviceFactSchema', () => {
  it('accepts an ordinary long-running HTTP service', () => {
    expect(serviceFactSchema.safeParse(service()).success).toBe(true);
  });

  it('rejects a scheduled service that states no schedule', () => {
    // Without this the composer has nothing to emit, and the failure surfaces far from its cause.
    const result = serviceFactSchema.safeParse(service({ executionModel: 'scheduled', exposesHttp: false }));

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('schedule');
  });

  it('accepts a scheduled service with a schedule', () => {
    const result = serviceFactSchema.safeParse(
      service({ executionModel: 'scheduled', exposesHttp: false, schedule: '0 3 * * *' })
    );

    expect(result.success).toBe(true);
  });

  it('rejects a service that both serves HTTP and runs once to completion', () => {
    expect(serviceFactSchema.safeParse(service({ executionModel: 'one-shot' })).success).toBe(false);
  });

  it('rejects an infrastructure variable that names no dependency', () => {
    const result = serviceFactSchema.safeParse(
      service({
        environmentVariables: [{ name: 'DATABASE_URL', role: 'infra-dependency', required: true, evidence: [] }]
      })
    );

    expect(result.success).toBe(false);
  });

  it('defaults long-lived connections to none rather than leaving them unknown', () => {
    expect(serviceFactSchema.parse(service()).longLivedConnections).toBe('none');
  });
});

describe('checkFactsCompleteness', () => {
  it('passes a complete single-service document', () => {
    const issues = checkFactsCompleteness(facts());

    expect(issues).toEqual([]);
    expect(factsAreUsable(issues)).toBe(true);
  });

  it('blocks a service with no way to start it', () => {
    const issues = checkFactsCompleteness(facts({ services: [service({ startCommand: undefined })] }));

    expect(factsAreUsable(issues)).toBe(false);
    expect(issues[0]?.path).toBe('services[0].startCommand');
  });

  it('accepts a missing start command when it was raised as an uncertainty', () => {
    // The escape hatch is the whole point. A required field a model cannot satisfy honestly is a
    // field the model will invent a value for.
    const issues = checkFactsCompleteness(
      facts({
        services: [service({ startCommand: undefined })],
        uncertainties: [
          {
            kind: 'command-unknown',
            id: 'u1',
            blocksDeploy: true,
            evidence: [],
            source: 'probe',
            serviceName: 'web',
            command: 'start',
            suggestions: []
          }
        ]
      })
    );

    expect(factsAreUsable(issues)).toBe(true);
  });

  it('accepts a static bundle with no start command', () => {
    const issues = checkFactsCompleteness(
      facts({
        services: [service({ startCommand: undefined, servesStaticAssets: { path: 'dist' } })]
      })
    );

    expect(factsAreUsable(issues)).toBe(true);
  });

  it('blocks a variable pointing at a service that does not exist', () => {
    const issues = checkFactsCompleteness(
      facts({
        services: [
          service({
            environmentVariables: [
              {
                name: 'API_URL',
                role: 'cross-service-reference',
                targetServiceName: 'ghost',
                required: true,
                evidence: []
              }
            ]
          })
        ]
      })
    );

    expect(factsAreUsable(issues)).toBe(false);
  });

  it('blocks a cross-service reference with no target and no uncertainty', () => {
    const issues = checkFactsCompleteness(
      facts({
        services: [
          service({
            environmentVariables: [{ name: 'API_URL', role: 'cross-service-reference', required: true, evidence: [] }]
          })
        ]
      })
    );

    expect(factsAreUsable(issues)).toBe(false);
  });

  it('blocks a dependency naming a consumer that is not a service', () => {
    const issues = checkFactsCompleteness(
      facts({
        dependencies: [
          {
            name: 'mainDatabase',
            kind: 'postgres',
            extensions: [],
            consumedBy: ['ghost'],
            evidence: [],
            source: 'agent'
          }
        ]
      })
    );

    expect(factsAreUsable(issues)).toBe(false);
  });

  it('reports an unconsumed dependency as advisory, not blocking', () => {
    // Usually means we missed a service, so it is worth saying — but it is not a reason to refuse
    // to produce anything.
    const issues = checkFactsCompleteness(
      facts({
        dependencies: [{ name: 'cache', kind: 'redis', extensions: [], consumedBy: [], evidence: [], source: 'agent' }]
      })
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('advisory');
    expect(factsAreUsable(issues)).toBe(true);
  });

  it('blocks duplicate service names', () => {
    const issues = checkFactsCompleteness(facts({ services: [service(), service()] }));

    expect(factsAreUsable(issues)).toBe(false);
  });

  it('flags a missing port as advisory only', () => {
    const issues = checkFactsCompleteness(facts({ services: [service({ port: undefined })] }));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('advisory');
  });
});
