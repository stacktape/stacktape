import { cfnResource } from '@stacktape/cloudformation/resource';

import { awsResourceNames } from '@stacktape/naming/aws-resource-names';

export const getEcrRepositoryResource = (globallyUniqueStackHash: string) => {
  return cfnResource('AWS::ECR::Repository', {
    RepositoryName: awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash),
    LifecyclePolicy: {
      LifecyclePolicyText: JSON.stringify({
        rules: [
          {
            rulePriority: 1,
            description: 'Remove untagged images',
            selection: {
              tagStatus: 'untagged',
              countType: 'sinceImagePushed',
              countUnit: 'days',
              countNumber: 1
            },
            action: { type: 'expire' }
          }
        ]
      })
    }
  });
};
