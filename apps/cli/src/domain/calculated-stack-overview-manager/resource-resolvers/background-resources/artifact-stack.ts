import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { getInitialCfTemplate } from '@domain-services/template-manager/utils';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getStackCfTemplateDescription } from '@stacktape/naming/stacks';
import { getLambdaLogGroup } from '../functions/utils';
import { deploymentBucketPolicyResource, getDeploymentBucketResource } from './deployment-bucket/utils';
import { getEcrRepositoryResource } from './deployment-image-repository/utils';

/**
 * The template of a new stack's first operation: the deployment bucket, the image repository and the service Lambda's
 * log group, which the artifacts are uploaded to before the full template is deployed.
 *
 * It needs no build output, so a first deploy creates it while the workloads build. The resolvers add the same
 * resources (marked `initial`) to the full template.
 */
export const getArtifactStackTemplate = (): CloudFormationTemplate => {
  const { globallyUniqueStackHash, projectName, stage } = calculatedStackOverviewManager.context;
  const serviceLambda = configManager.stacktapeServiceLambdaProps;
  return {
    ...getInitialCfTemplate(),
    Description: getStackCfTemplateDescription(projectName, stage, globallyUniqueStackHash),
    Resources: {
      [cfLogicalNames.deploymentBucket()]: getDeploymentBucketResource(deploymentArtifactManager.deploymentBucketName),
      [cfLogicalNames.deploymentBucketPolicy()]: deploymentBucketPolicyResource(cfLogicalNames.deploymentBucket()),
      [cfLogicalNames.ecrRepo()]: getEcrRepositoryResource(globallyUniqueStackHash),
      [cfLogicalNames.lambdaLogGroup(serviceLambda.name)]: getLambdaLogGroup(
        awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: serviceLambda.resourceName }),
        serviceLambda.logging?.retentionDays,
        serviceLambda.logging?.logClass
      )
    }
  };
};
