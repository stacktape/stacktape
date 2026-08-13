import { expect, test } from 'bun:test';
import { diffTemplate, ResourceImpact } from '@aws-cdk/cloudformation-diff';
import type { StackInfoMap } from '@domain-services/stack-info/types';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from './stack-info-map-diff';

const stackInfoMap = ({ withDsql }: { withDsql: boolean }): StackInfoMap => ({
  metadata: {},
  customOutputs: {},
  resources: withDsql
    ? {
        database: {
          resourceType: 'dsql-database',
          referencableParams: {},
          cloudformationChildResources: {
            DatabaseDsqlCluster: { cloudformationResourceType: 'AWS::DSQL::Cluster' }
          },
          links: {},
          outputs: {}
        }
      }
    : {}
});

test('treats removal of an Aurora DSQL cluster as a protected-resource risk', () => {
  const oldTemplate = {
    Resources: {
      DatabaseDsqlCluster: {
        Type: 'AWS::DSQL::Cluster',
        Properties: { DeletionProtectionEnabled: false }
      }
    }
  };
  const newTemplate = { Resources: {} };

  expect(
    getCriticalResourcesPotentiallyEndangeredByOperation({
      calculatedStackInfoMap: stackInfoMap({ withDsql: false }),
      deployedStackInfoMap: stackInfoMap({ withDsql: true }),
      cfTemplateDiff: diffTemplate(oldTemplate, newTemplate)
    })
  ).toEqual([
    {
      stpResourceName: 'database',
      resourceType: 'dsql-database',
      impactedCfResources: {
        DatabaseDsqlCluster: {
          cfResourceType: 'AWS::DSQL::Cluster',
          impact: ResourceImpact.WILL_DESTROY
        }
      }
    }
  ]);
});
