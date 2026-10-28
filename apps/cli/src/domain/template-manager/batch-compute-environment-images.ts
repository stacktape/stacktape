import { isDeepStrictEqual } from 'node:util';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

/** The image configurations Stacktape gives new compute environments, for CPU and GPU jobs. */
const DEFAULT_EC2_CONFIGURATIONS = [[{ ImageType: 'ECS_AL2023' }], [{ ImageType: 'ECS_AL2023_NVIDIA' }]];

/** The value as CloudFormation stores it, without `undefined` properties. */
const asTemplateJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

/**
 * Keeps the image configuration a deployed Batch compute environment was created with, typically Amazon Linux 2
 * (`ECS_AL2`, `ECS_AL2_NVIDIA`), while nothing else in it changes.
 *
 * AWS Batch has refused to create compute environments with its Amazon Linux 2 images since 30 June 2026, so new ones
 * use Amazon Linux 2023. Existing ones keep working. With the `BEST_FIT` allocation strategy, CloudFormation replaces a
 * compute environment for any image change, and deleting the old one can interrupt the jobs running on it. When another
 * change replaces the compute environment anyway, it gets the new image: AWS would reject an Amazon Linux 2 replacement.
 *
 * Runs after overrides and transforms, so it compares the compute environment as it will be deployed. An image
 * configuration other than Stacktape's default was set on purpose and is left alone. The deployed template of a stack
 * whose update failed without a rollback can name an environment that was never created; only an environment that
 * exists keeps its image.
 */
export const keepDeployedBatchComputeEnvironmentImages = ({
  template,
  deployedTemplate,
  existingLogicalIds
}: {
  template: CloudFormationTemplate;
  deployedTemplate: CloudFormationTemplate | undefined;
  existingLogicalIds: Set<string>;
}) => {
  for (const [logicalId, resource] of Object.entries(template.Resources)) {
    if (resource.Type !== 'AWS::Batch::ComputeEnvironment' || !existingLogicalIds.has(logicalId)) {
      continue;
    }
    const deployed = deployedTemplate?.Resources?.[logicalId];
    const properties = resource.Properties as { ComputeResources?: Record<string, unknown> } | undefined;
    const deployedProperties = deployed?.Properties as { ComputeResources?: Record<string, unknown> } | undefined;
    const computeResources = properties?.ComputeResources;
    const deployedComputeResources = deployedProperties?.ComputeResources;
    if (
      deployed?.Type !== resource.Type ||
      !computeResources ||
      !deployedComputeResources ||
      !DEFAULT_EC2_CONFIGURATIONS.some((configuration) =>
        isDeepStrictEqual(asTemplateJson(computeResources.Ec2Configuration), configuration)
      )
    ) {
      continue;
    }
    const deployedEc2Configuration = deployedComputeResources.Ec2Configuration;
    const keptProperties = {
      ...properties,
      ComputeResources: { ...computeResources, Ec2Configuration: deployedEc2Configuration }
    };
    if (!isDeepStrictEqual(asTemplateJson(keptProperties), asTemplateJson(deployedProperties))) {
      continue;
    }
    if (deployedEc2Configuration === undefined) {
      delete computeResources.Ec2Configuration;
    } else {
      computeResources.Ec2Configuration = deployedEc2Configuration;
    }
  }
};
