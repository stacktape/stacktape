import { describe, expect, test } from 'bun:test';
import type { ConfigManager } from '..';
import type { StpResource, StpResourceScopableByConnectToAffectingRole } from '../resolved-types/resources';
import type { StpBucket } from '../resolved-types/buckets';
import { resolveConnectToList } from './resource-references';

const configContaining = (resource: StpResource): Pick<ConfigManager, 'findResourceInConfig'> => ({
  findResourceInConfig: () => ({
    resource,
    fullyResolved: true,
    validPath: resource.nameChain.join('.'),
    restPath: ''
  })
});

const baseResource = {
  name: 'target',
  nameChain: ['target']
};

describe('connectTo target classification', () => {
  test.each([
    'agentcore-runtime',
    'agentcore-memory',
    'agentcore-gateway',
    'agentcore-browser',
    'agentcore-code-interpreter'
  ] as const)('scopes IAM permissions for %s', (type) => {
    const resource = {
      ...baseResource,
      type,
      configParentResourceType: type
    } as StpResource;

    const result = resolveConnectToList({
      stpResourceNameOfReferencer: 'consumer',
      connectTo: ['target'],
      activeConfig: configContaining(resource)
    });

    expect(result.accessToResourcesRequiringRoleChanges).toEqual([
      resource as StpResourceScopableByConnectToAffectingRole
    ]);
  });

  test('scopes a hosting resource to its nested S3 bucket', () => {
    const bucket = {
      name: 'website-bucket',
      nameChain: ['website', 'bucket'],
      type: 'bucket',
      configParentResourceType: 'hosting-bucket'
    } as StpBucket;
    const hosting = {
      ...baseResource,
      name: 'website',
      nameChain: ['website'],
      type: 'hosting-bucket',
      configParentResourceType: 'hosting-bucket',
      _nestedResources: { bucket }
    } as StpResource;

    const result = resolveConnectToList({
      stpResourceNameOfReferencer: 'consumer',
      connectTo: ['website'],
      activeConfig: configContaining(hosting)
    });

    expect(result.accessToResourcesRequiringRoleChanges).toEqual([bucket]);
  });

  test('accepts EFS as an environment-only target without implying a mount', () => {
    const filesystem = {
      ...baseResource,
      type: 'efs-filesystem',
      configParentResourceType: 'efs-filesystem'
    } as StpResource;

    const result = resolveConnectToList({
      stpResourceNameOfReferencer: 'consumer',
      connectTo: ['target'],
      activeConfig: configContaining(filesystem)
    });

    expect(result).toMatchObject({
      accessToResourcesRequiringRoleChanges: [],
      accessToResourcesPotentiallyRequiringSecurityGroupCreation: [],
      accessToAtlasMongoClusterResources: []
    });
  });
});
