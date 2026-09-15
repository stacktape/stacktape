import { cfnResource } from '@stacktape/cloudformation/resource';

import { awsResourceNames } from '@stacktape/naming/aws-resource-names';

export const getEcrRepositoryResource = (globallyUniqueStackHash: string) => {
  return cfnResource('AWS::ECR::Repository', {
    RepositoryName: awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash),
    // ECR's free basic scan of every pushed image: operating-system packages only, a backstop behind the inventory
    // the CLI records for the security section.
    ImageScanningConfiguration: { ScanOnPush: true },
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
