import { ref } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { deploymentBucketPolicyResource, getDeploymentBucketResource } from './utils';

export const resolveDeploymentBucket = () => {
  const deploymentBucketLogicalName = cfLogicalNames.deploymentBucket();
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: deploymentBucketLogicalName,
    resource: getDeploymentBucketResource(deploymentArtifactManager.deploymentBucketName),
    initial: true
  });
  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.deploymentBucket(),
    metaValue: deploymentArtifactManager.deploymentBucketName,
    showDuringPrint: false
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'deployment-bucket-contents',
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    linkValue: cfEvaluatedLinks.s3Bucket(ref(deploymentBucketLogicalName), 'objects')
  });

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: cfLogicalNames.deploymentBucketPolicy(),
    resource: deploymentBucketPolicyResource(deploymentBucketLogicalName),
    initial: true
  });
};
