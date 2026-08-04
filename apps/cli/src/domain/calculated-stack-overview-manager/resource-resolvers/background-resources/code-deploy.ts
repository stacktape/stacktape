import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';

export const resolveCodeDeploySharedResources = async () => {
  if (configManager.allWorkloadsUsingCustomDeployment.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.codeDeployServiceRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: cfnResource('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: ['sts:AssumeRole'],
              Effect: 'Allow',
              Principal: { Service: ['codedeploy.amazonaws.com'] }
            }
          ]
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda',
          'arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS'
        ],
        Policies: configManager.allLambdasUsedInDeploymentHooks.length
          ? [
              {
                PolicyName: 'allow-hook-invoke',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Action: ['lambda:InvokeFunction'],
                      Resource: configManager.allLambdasUsedInDeploymentHooks.map(({ cfLogicalName }) =>
                        getAtt(cfLogicalName, 'Arn')
                      ),
                      Effect: 'Allow'
                    }
                  ]
                }
              }
            ]
          : undefined
      })
    });
  }
};
