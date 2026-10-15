import { describe, expect, test } from 'bun:test';
import type { ConfigManager } from '..';
import type { StpDsqlDatabase } from '../resolved-types/dsql-databases';
import type { StpResource, StpResourceScopableByConnectToAffectingRole } from '../resolved-types/resources';
import type { ResourcePropsFromConfig } from '@domain-services/stack-info/types';
import { resolveConnectToList } from './resource-references';

const configContaining = (
  resource: StpResource
): Pick<ConfigManager, 'findResourceInConfig' | 'deploymentContext'> => ({
  deploymentContext: { command: 'synth', remoteResourceNames: new Set<string>() },
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
  test('keeps DSQL in the resolved resource-props contract', () => {
    const resource: ResourcePropsFromConfig<'dsql-database'> = {
      ...baseResource,
      type: 'dsql-database',
      configParentResourceType: 'dsql-database'
    } satisfies StpDsqlDatabase;

    expect(resource.type).toBe('dsql-database');
  });

  test.each([
    'agentcore-runtime',
    'agentcore-memory',
    'agentcore-gateway',
    'agentcore-browser',
    'agentcore-code-interpreter',
    'websocket-api-gateway',
    'dsql-database'
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

  // A hosting bucket's connectTo scoping to its nested S3 bucket is proved by the config-loading scenario's IAM.
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
