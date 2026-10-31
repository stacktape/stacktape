import { cfnResource } from '@stacktape/cloudformation/resource';
import { sub } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { addFinalTemplatePolicies, stackIdentifierPolicies, stackReadPolicies } from '../stack-read-policies';

const DEV_AGENT_ROLE_LOGICAL_NAME = 'StpDevAgentRole';

/**
 * Creates the IAM role the dev agent reads AWS with (`/aws/sdk`, deployed tables, Batch job runs), in dev stacks only:
 * nothing else assumes it. It reads only this stack's resources in this stack's region (see `stackReadPolicies`); the
 * agent's executor sends nothing outside the read-only catalog, and the role grants no write either.
 */
export const resolveDevAgentRole = () => {
  const { stackName, globallyUniqueStackHash, command } = calculatedStackOverviewManager.context;
  if (command !== 'dev') return;

  const roleName = `${stackName}-dev-agent`;
  const role = cfnResource('AWS::IAM::Role', {
    RoleName: roleName,
    Description: `Dev agent role for stack ${stackName}`,
    MaxSessionDuration: 43200,
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: sub('arn:aws:iam::${AWS::AccountId}:root') },
          Action: 'sts:AssumeRole',
          Condition: { StringEquals: { 'sts:ExternalId': globallyUniqueStackHash } }
        }
      ]
    },
    Policies: stackReadPolicies()
  });
  addFinalTemplatePolicies(DEV_AGENT_ROLE_LOGICAL_NAME, stackIdentifierPolicies);

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: DEV_AGENT_ROLE_LOGICAL_NAME,
    resource: role
  });

  // Export role ARN and external ID for the dev agent
  calculatedStackOverviewManager.addUserCustomStackOutput({
    cloudformationOutputName: 'DevAgentRoleArn',
    // Built from the role name rather than `Fn::GetAtt`: an output that depends on the role adds several seconds to
    // every stack update.
    value: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${roleName}`),
    description: 'ARN of the dev agent IAM role'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.devAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
