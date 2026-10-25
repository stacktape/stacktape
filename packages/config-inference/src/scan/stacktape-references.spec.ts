import { describe, expect, it } from 'bun:test';
import type { DependencyFact, DependencyKind } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';
import { applyStacktapeReferences, parseStacktapeReference, resourceNameForReference } from './stacktape-references';

describe('Stacktape connectTo variable names', () => {
  it.each([
    ['STP_DB_CONNECTION_STRING', 'DB', 'CONNECTION_STRING', 'db'],
    ['STP_MAIN_DATABASE_JDBC_CONNECTION_STRING', 'MAIN_DATABASE', 'JDBC_CONNECTION_STRING', 'mainDatabase'],
    ['STP_CACHE_READER_HOST', 'CACHE', 'READER_HOST', 'cache'],
    ['STP_JOBS_URL', 'JOBS', 'URL', 'jobs'],
    ['STP_USERS_TABLE_NAME', 'USERS_TABLE', 'NAME', 'usersTable'],
    ['STP_EVENTS_STREAM_ARN', 'EVENTS', 'STREAM_ARN', 'events'],
    ['STP_DB_2_PORT', 'DB_2', 'PORT', 'db2']
  ])('%s reads parameter %s of %s', (variable, resource, parameter, resourceName) => {
    expect(parseStacktapeReference(variable)).toMatchObject({ resource, parameter });
    expect(resourceNameForReference(resource)).toBe(resourceName);
  });

  it.each(['STP_HOOK_TYPE', 'STP_INJECTED_ENV', 'DATABASE_URL', 'STP_URL'])(
    '%s is not a connectTo variable',
    (name) => {
      expect(parseStacktapeReference(name)).toBeUndefined();
    }
  );
});

const dependency = (name: string, kind: DependencyKind): DependencyFact => ({
  name,
  kind,
  extensions: [],
  consumedBy: [],
  addressedBy: [],
  evidence: [],
  source: 'probe'
});

const service = (
  name: string,
  reads: readonly string[],
  overrides: Partial<ServiceFactInput> = {}
): ServiceFactInput => ({
  name,
  path: 'src',
  language: 'typescript',
  exposesHttp: false,
  executionModel: 'per-request',
  functionEntrypoint: `src/${name}.ts`,
  environmentVariables: reads.map((variable) => ({
    name: variable,
    role: 'runtime-config',
    required: true,
    evidence: []
  })),
  evidence: [],
  source: 'probe',
  ...overrides
});

describe('naming dependencies after the variables the code reads', () => {
  it('binds by parameters, then by the resource name, and rewrites every reference', () => {
    const dependencies = [
      dependency('mainDatabase', 'postgres'),
      dependency('cache', 'redis'),
      dependency('jobQueue', 'queue')
    ];
    const services = [
      service('api', ['STP_DB_CONNECTION_STRING', 'STP_CACHE_CONNECTION_STRING', 'STP_JOBS_URL']),
      service('worker', ['STP_DB_CONNECTION_STRING', 'STP_CACHE_CONNECTION_STRING'], {
        functionTriggers: [{ type: 'queue', dependencyName: 'jobQueue' }]
      })
    ];

    applyStacktapeReferences({ services, dependencies });

    expect(dependencies.map(({ name, consumedBy }) => [name, consumedBy])).toEqual([
      ['db', ['api', 'worker']],
      ['cache', ['api', 'worker']],
      ['jobs', ['api']]
    ]);
    expect(services[1]!.functionTriggers).toEqual([{ type: 'queue', dependencyName: 'jobs' }]);
    expect(services[0]!.environmentVariables!.map(({ role, dependencyName }) => [role, dependencyName])).toEqual([
      ['infra-dependency', 'db'],
      ['infra-dependency', 'cache'],
      ['infra-dependency', 'jobs']
    ]);
  });

  it('leaves a read unbound when two dependencies fit it equally', () => {
    const dependencies = [dependency('mainDatabase', 'postgres'), dependency('analytics', 'postgres')];
    const services = [service('api', ['STP_DB_CONNECTION_STRING'])];

    applyStacktapeReferences({ services, dependencies });

    expect(dependencies.map(({ name }) => name)).toEqual(['mainDatabase', 'analytics']);
    expect(services[0]!.environmentVariables![0]!.role).toBe('runtime-config');
  });

  it('keeps a dependency that already has the expected name', () => {
    const dependencies = [dependency('cache', 'redis'), dependency('sessions', 'redis')];
    const services = [service('api', ['STP_SESSIONS_HOST', 'STP_CACHE_HOST'])];

    applyStacktapeReferences({ services, dependencies });

    expect(dependencies.map(({ name, consumedBy }) => [name, consumedBy])).toEqual([
      ['cache', ['api']],
      ['sessions', ['api']]
    ]);
  });
});
