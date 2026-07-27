import { GetAtt } from '@cloudform/functions';
import Role from '@cloudform/iam/role';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';

export const resolveCodeDeploySharedResources = async () => {
  if (configManager.allWorkloadsUsingCustomDeployment.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.codeDeployServiceRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
      resource: new Role({
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
                        GetAtt(cfLogicalName, 'Arn')
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
