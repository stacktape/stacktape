import { expect, test } from 'bun:test';
import type { StpDsqlDatabase } from '@domain-services/config-manager/resolved-types/dsql-databases';
import { AURORA_DSQL_REGIONS } from '@stacktape/config/dsql-databases';
import { CliError } from '@utils/errors';
import { assertDsqlRegionSupported, getDsqlCluster, getDsqlEndpoint } from '.';

const resource = (properties: Partial<StpDsqlDatabase> = {}): StpDsqlDatabase => ({
  name: 'primary',
  nameChain: ['primary'],
  type: 'dsql-database',
  configParentResourceType: 'dsql-database',
  ...properties
});

test('DSQL uses the safe AWS defaults without asking for capacity or credentials', () => {
  expect(getDsqlCluster({ resource: resource(), tags: [] })).toMatchObject({
    Type: 'AWS::DSQL::Cluster',
    Properties: {
      DeletionProtectionEnabled: false
    }
  });
});

test('DSQL forwards only the deliberate advanced settings', () => {
  expect(
    getDsqlCluster({
      resource: resource({
        deletionProtection: true,
        kmsKeyArn: 'arn:aws:kms:eu-west-1:123456789012:key/example'
      }),
      tags: []
    })
  ).toMatchObject({
    Type: 'AWS::DSQL::Cluster',
    Properties: {
      DeletionProtectionEnabled: true,
      KmsEncryptionKey: 'arn:aws:kms:eu-west-1:123456789012:key/example'
    }
  });
});

test('DSQL consumes the service-provided endpoint instead of reconstructing its suffix', () => {
  expect(getDsqlEndpoint('PrimaryDsqlCluster')).toEqual({
    'Fn::GetAtt': ['PrimaryDsqlCluster', 'Endpoint']
  });
});

test('DSQL fails early with a stable actionable error in unsupported Stacktape regions', () => {
  expect(() => assertDsqlRegionSupported('eu-west-1')).not.toThrow();
  expect(() => assertDsqlRegionSupported('eu-south-1')).toThrow(CliError);
  try {
    assertDsqlRegionSupported('eu-south-1');
    throw new Error('Expected unsupported DSQL region to fail');
  } catch (error) {
    expect(error).toMatchObject({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_DSQL_REGION_UNSUPPORTED',
      message: 'Amazon Aurora DSQL is not available in region `eu-south-1`.'
    });
    expect((error as CliError).hints).toEqual([`Choose one of: ${AURORA_DSQL_REGIONS.join(', ')}.`]);
  }
});
