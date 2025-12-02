import { globalStateManager } from '@application-services/global-state-manager';
import { getLambdaRuntime } from '@domain-services/config-manager/utils/lambdas';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { NOT_YET_KNOWN_IDENTIFIER } from '@shared/utils/constants';
import { getStpServiceCustomResource } from './custom-resource';
import { getPoliciesForRoles } from './role-helpers';

export const getEdgeLambdaBucketCustomResource = () => {
  return getStpServiceCustomResource<'edgeLambdaBucket'>({
    edgeLambdaBucket: { globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash }
  });
};

export const getEdgeLambdaCustomResource = (lambdaProps: StpEdgeLambdaFunction | StpHelperEdgeLambdaFunction) => {
  const cfLogicalName = cfLogicalNames.customResourceEdgeLambda(lambdaProps.name);

  const resource = getStpServiceCustomResource<'edgeLambda'>({
    edgeLambda: getEdgeLambdaCustomResourceProperties(lambdaProps)
  });

  resource.DependsOn = [cfLogicalNames.customResourceEdgeLambdaBucket()];
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    const customResourceProperties = template.Resources[cfLogicalName].Properties as StpServiceCustomResourceProperties;
    customResourceProperties.edgeLambda = {
      ...customResourceProperties.edgeLambda,
      artifactS3Key: deploymentArtifactManager.getLambdaS3UploadInfo({
        artifactName: customResourceProperties.edgeLambda.artifactName,
        packaging: customResourceProperties.edgeLambda.packaging
      }).s3Key,
      runtime: getLambdaRuntime({
        name: customResourceProperties.edgeLambda.name,
        packaging: customResourceProperties.edgeLambda.packaging,
        runtime: customResourceProperties.edgeLambda.runtime as LambdaRuntime
      }) as any
    };
  });
  return { cfLogicalName, resource, nameChain: lambdaProps.nameChain };
};

const getEdgeLambdaCustomResourceProperties = (lambdaProps: StpEdgeLambdaFunction | StpHelperEdgeLambdaFunction) => {
  const {
    accessToResourcesRequiringRoleChanges,
    accessToAtlasMongoClusterResources,
    accessToResourcesPotentiallyRequiringSecurityGroupCreation,
    accessToAwsServices
  } = resolveConnectToList({
    connectTo: lambdaProps.connectTo,
    stpResourceNameOfReferencer: lambdaProps.name
  });
  if (accessToAtlasMongoClusterResources.length || accessToResourcesPotentiallyRequiringSecurityGroupCreation.length) {
    const referencedResource = [
      ...accessToAtlasMongoClusterResources,
      ...accessToResourcesPotentiallyRequiringSecurityGroupCreation
    ][0];
    throw stpErrors.e37({
      stpResourceName: lambdaProps.name,
      referencedResourceStpName: referencedResource.name,
      referencedResourceType: referencedResource.type
    });
  }
  return {
    ...lambdaProps,
    artifactBucketName: awsResourceNames.deploymentBucket(globalStateManager.targetStack.globallyUniqueStackHash),
    globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
    artifactS3Key: NOT_YET_KNOWN_IDENTIFIER,
    lambdaLogGroupName: awsResourceNames.lambdaLogGroup({
      lambdaAwsResourceName: lambdaProps.resourceName,
      edgeLambda: true
    }),
    lambdaRoleResourceName: awsResourceNames.edgeLambdaRole(
      globalStateManager.targetStack.stackName,
      globalStateManager.region,
      lambdaProps.name
    ),
    preprocessedRolePolicies: getPoliciesForRoles({
      iamRoleStatements: lambdaProps.iamRoleStatements,
      accessToResourcesRequiringRoleChanges,
      accessToAwsServices
    })
  };
};
