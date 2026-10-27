import { cfnResource } from '@stacktape/cloudformation/resource';

import { awsResourceNames } from '@stacktape/naming/aws-resource-names';

// The CLI creates the image repository of a new stack itself (see `deploymentArtifactManager.createArtifactStore`).
// Older stacks have it as a CloudFormation resource. Both get these settings.

export const DEPLOYMENT_REPOSITORY_LIFECYCLE_POLICY_TEXT = JSON.stringify({
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
});

export const getEcrRepositoryResource = (globallyUniqueStackHash: string) => {
  return cfnResource('AWS::ECR::Repository', {
    RepositoryName: awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash),
    // ECR's free basic scan of every pushed image: operating-system packages only, a backstop behind the inventory
    // the CLI records for the security section.
    ImageScanningConfiguration: { ScanOnPush: true },
    LifecyclePolicy: { LifecyclePolicyText: DEPLOYMENT_REPOSITORY_LIFECYCLE_POLICY_TEXT }
  });
};
