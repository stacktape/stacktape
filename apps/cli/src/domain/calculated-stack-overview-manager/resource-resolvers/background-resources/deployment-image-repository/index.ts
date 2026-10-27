import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getEcrRepositoryResource } from './utils';

export const resolveImageRepository = () => {
  // A new stack's repository is created by the CLI with the bucket (see `artifactStoreIsStackResource`).
  if (!deploymentArtifactManager.artifactStoreIsStackResource) return;
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: cfLogicalNames.ecrRepo(),
    resource: getEcrRepositoryResource(calculatedStackOverviewManager.context.globallyUniqueStackHash),
    initial: true
  });
};
