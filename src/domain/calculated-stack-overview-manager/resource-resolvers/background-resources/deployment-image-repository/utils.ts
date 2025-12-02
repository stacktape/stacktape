import Repository from '@cloudform/ecr/repository';
import { awsResourceNames } from '@shared/naming/aws-resource-names';

export const getEcrRepositoryResource = (globallyUniqueStackHash: string) => {
  return new Repository({
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
