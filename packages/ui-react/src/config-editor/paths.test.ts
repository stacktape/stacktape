import { describe, expect, test } from 'bun:test';
import type { StacktapeConfig } from '@stacktape/config';
import { extractPaths } from './paths.js';

describe('config repository paths', () => {
  test('preserves traversal order, owner metadata and directive export cleanup', () => {
    const config = {
      resources: {
        api: {
          type: 'function',
          properties: {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: {
                entryfilePath: 'src/api.ts',
                tsConfigPath: 'tsconfig.build.json'
              }
            }
          }
        },
        frontend: {
          type: 'hosting-bucket',
          properties: { uploadDirectoryPath: './dist' }
        }
      },
      directives: [{ name: 'ResolveSecret', filePath: 'directives/secrets.ts:resolveSecret' }],
      scripts: {
        seed: {
          type: 'local-script',
          properties: {
            executeScripts: ['scripts/prepare.ts', 'scripts/seed.ts:main']
          }
        }
      }
    } as unknown as StacktapeConfig;

    expect(extractPaths({ stacktapeConfig: config })).toEqual([
      {
        path: 'src/api.ts',
        pathPropertyLocation: '.resources.api.properties.packaging.properties.entryfilePath',
        pathType: 'resource',
        name: 'api',
        resourceType: 'function'
      },
      {
        path: 'tsconfig.build.json',
        pathPropertyLocation: '.resources.api.properties.packaging.properties.tsConfigPath',
        pathType: 'resource',
        name: 'api',
        resourceType: 'function'
      },
      {
        path: './dist',
        pathPropertyLocation: '.resources.frontend.properties.uploadDirectoryPath',
        oftenGenerated: true,
        pathType: 'resource',
        name: 'frontend',
        resourceType: 'hosting-bucket'
      },
      {
        path: 'directives/secrets.ts',
        pathPropertyLocation: '.directives.0.filePath',
        pathType: 'directive',
        name: 'ResolveSecret'
      },
      {
        path: 'scripts/prepare.ts',
        pathPropertyLocation: '.scripts.seed.properties.executeScripts',
        pathType: 'script',
        name: 'seed'
      },
      {
        path: 'scripts/seed.ts',
        pathPropertyLocation: '.scripts.seed.properties.executeScripts',
        pathType: 'script',
        name: 'seed'
      }
    ]);
  });

  test('ignores watched properties outside a resource, directive or script and non-string values', () => {
    const config = {
      resources: {
        invalid: { type: 'function', properties: { filePath: 42 } }
      },
      variables: { filePath: 'not-a-repository-input.ts' }
    } as unknown as StacktapeConfig;

    expect(extractPaths({ stacktapeConfig: config })).toEqual([]);
  });
});
