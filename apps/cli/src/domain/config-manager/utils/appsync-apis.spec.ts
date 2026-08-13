import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConfigManager } from '../index';
import type { StpAppSyncApi } from '../resolved-types/appsync-apis';
import {
  getAppSyncApiKeyExpirationSeconds,
  validateAppSyncApiConfig,
  validateAppSyncIntegrations
} from './appsync-apis';

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { force: true, recursive: true }));
});

const api = (overrides: Partial<StpAppSyncApi> = {}): StpAppSyncApi => ({
  type: 'appsync-api',
  name: 'graphql',
  nameChain: ['graphql'],
  configParentResourceType: 'appsync-api',
  authentication: { type: 'aws-iam' },
  schemaFilePath: 'schema.graphql',
  queryDepthLimit: 10,
  resolverCountLimit: 1000,
  introspectionEnabled: true,
  xrayEnabled: false,
  ...overrides
});

const project = (schema: string) => {
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-appsync-'));
  temporaryDirectories.push(directory);
  writeFileSync(join(directory, 'schema.graphql'), schema);
  return directory;
};

const config = (resource: StpAppSyncApi, handlers: { name: string; field: string }[]): ConfigManager => {
  const functions = handlers.map(({ field, name }) => ({
    name,
    type: 'function',
    events: [{ type: 'appsync-api', properties: { appsyncApiName: resource.name, field } }]
  }));
  return {
    functions,
    findResourceInConfig: ({ nameChain }: { nameChain: string[] }) => ({
      resource: nameChain[0] === resource.name ? resource : functions.find(({ name }) => name === nameChain[0]),
      fullyResolved: true,
      restPath: [],
      validPath: nameChain
    })
  } as unknown as ConfigManager;
};

describe('AppSync API configuration', () => {
  test('accepts AWS GraphQL directives while checking Lambda field ownership', () => {
    const resource = api();
    const activeConfig = config(resource, [{ name: 'getUser', field: 'Query.user' }]);
    expect(() =>
      validateAppSyncApiConfig({
        activeConfig,
        resource,
        workingDir: project('type Query { user(id: ID!): String @aws_iam }')
      })
    ).not.toThrow();
  });

  test('rejects resolver fields missing from the parsed schema', () => {
    const resource = api();
    expect(() =>
      validateAppSyncApiConfig({
        activeConfig: config(resource, [{ name: 'createUser', field: 'Mutation.createUser' }]),
        resource,
        workingDir: project('type Query { user: String }')
      })
    ).toThrow('is not in the schema');
  });

  test('rejects two Lambda functions that own the same API field', () => {
    const resource = api();
    expect(() =>
      validateAppSyncIntegrations({
        activeConfig: config(resource, [
          { name: 'first', field: 'Query.user' },
          { name: 'second', field: 'Query.user' }
        ])
      })
    ).toThrow('assigned to both `first` and `second`');
  });

  test('uses only a fixed timestamp and rounds AppSync API keys down to the hour', () => {
    expect(getAppSyncApiKeyExpirationSeconds('2027-01-31T12:59:59Z')).toBe(1801396800);
    const resource = api({
      authentication: { type: 'api-key', properties: { expiresAt: 'tomorrow' } }
    });
    expect(() =>
      validateAppSyncApiConfig({
        activeConfig: config(resource, []),
        now: new Date('2026-08-12T00:00:00Z'),
        resource,
        workingDir: project('type Query { ok: Boolean }')
      })
    ).toThrow('absolute RFC 3339 timestamp');
  });

  test('rejects calendar dates that JavaScript would otherwise normalize', () => {
    for (const expiresAt of ['2027-02-29T00:00:00Z', '2027-04-31T00:00:00Z']) {
      const resource = api({ authentication: { type: 'api-key', properties: { expiresAt } } });
      expect(() =>
        validateAppSyncApiConfig({
          activeConfig: config(resource, []),
          now: new Date('2026-08-12T00:00:00Z'),
          resource,
          workingDir: project('type Query { ok: Boolean }')
        })
      ).toThrow('is not a valid calendar date');
    }
  });
});
