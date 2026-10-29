import { cfnResource } from '@stacktape/cloudformation/resource';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { sub } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import {
  addFinalTemplatePolicies,
  ownResourceArns,
  policy,
  regionalArn,
  stackIdentifierPolicies,
  stackReadPolicies
} from '../stack-read-policies';

const DEBUG_AGENT_ROLE_LOGICAL_NAME = 'StpDebugAgentRole';

/** What only the debug commands read, by the identifiers of this stack's search domains and canaries. */
const debugOnlyPolicies = (template: CloudFormationTemplate) => {
  const domains = ownResourceArns(template, 'AWS::OpenSearchService::Domain', 'DomainName', (name) => [name]);
  const canaries = ownResourceArns(template, 'AWS::Synthetics::Canary', 'Name', (name) => [name]);
  return [
    // `query opensearch`. Its search is a POST, which IAM cannot tell from a write by the method alone, so POST is
    // allowed for `_search` paths only.
    ...(domains.length
      ? [
          policy('opensearch-http-access', [
            {
              Effect: 'Allow',
              Action: ['es:ESHttpGet', 'es:ESHttpHead'],
              Resource: domains.map((name) => regionalArn('es', `domain/${name}/*`))
            },
            {
              Effect: 'Allow',
              Action: ['es:ESHttpPost'],
              Resource: domains.map((name) => regionalArn('es', `domain/${name}/*/_search`))
            }
          ])
        ]
      : []),
    // Synthetics creates a canary's function and log group itself, without the stack tag; both carry the canary's
    // name.
    ...(canaries.length
      ? [
          policy('synthetics-access', [
            {
              Effect: 'Allow',
              Action: ['synthetics:GetCanary', 'synthetics:GetCanaryRuns'],
              Resource: canaries.map((name) => regionalArn('synthetics', `canary:${name}`))
            },
            {
              Effect: 'Allow',
              Action: [
                'logs:DescribeLogStreams',
                'logs:GetLogEvents',
                'logs:FilterLogEvents',
                'logs:GetLogGroupFields',
                'logs:StartQuery'
              ],
              Resource: canaries.map((name) => regionalArn('logs', `log-group:/aws/lambda/cwsyn-${name}-*`))
            }
          ])
        ]
      : [])
  ];
};

/**
 * Creates the IAM role `aws call`, `query dynamodb` and `query opensearch` read a deployed stack with, also after a
 * failed `stacktape dev` start. It reads only this stack's resources in this stack's region (see `stackReadPolicies`).
 * The only request it can send that IAM counts as a write is an OpenSearch `_search` POST.
 */
export const resolveDebugAgentRole = () => {
  const { stackName, globallyUniqueStackHash } = calculatedStackOverviewManager.context;

  const roleName = `${stackName}-debug-agent`;
  const role = cfnResource('AWS::IAM::Role', {
    RoleName: roleName,
    Description: `Read-only debug agent role for stack ${stackName}`,
    MaxSessionDuration: 3600, // 1 hour max
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
  addFinalTemplatePolicies(DEBUG_AGENT_ROLE_LOGICAL_NAME, (template) => [
    ...stackIdentifierPolicies(template),
    ...debugOnlyPolicies(template)
  ]);

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: DEBUG_AGENT_ROLE_LOGICAL_NAME,
    resource: role
  });

  // Export role ARN and external ID for the debug agent
  calculatedStackOverviewManager.addUserCustomStackOutput({
    cloudformationOutputName: 'DebugAgentRoleArn',
    // Built from the role name rather than `Fn::GetAtt`: an output that depends on the role adds several seconds to
    // every stack update.
    value: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${roleName}`),
    description: 'ARN of the debug agent IAM role (read-only)'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.debugAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
