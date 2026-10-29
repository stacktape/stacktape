import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import isEqual from 'lodash/isEqual';

/**
 * Resource types whose CloudFormation express-mode completion was measured to mean "it works" (29 Oct 2026). A new
 * EventBridge rule had its target at once and fired in its first minute; a standard-mode create waits 61.5 s for it.
 * A Lambda permission completes in about a second in either mode.
 */
const EXPRESS_UPDATE_RESOURCE_TYPES = new Set(['AWS::Events::Rule', 'AWS::Lambda::Permission']);

/**
 * The CloudFormation deployment mode of a stack update. Express mode completes once the resources' configuration is
 * applied, without waiting for them to become ready. For most resource types Stacktape creates, express mode either
 * still waits (databases, caches, load balancers, VPC links, CloudFront distributions with an alias, VPC Lambda network
 * interfaces) or reports a deploy done before it works (an ECS service behind an HTTP API that runs a crashing image).
 * So an update uses it only when it creates an EventBridge rule and changes nothing but rules and Lambda permissions,
 * such as a new schedule.
 *
 * A changed stack setting can update every resource (new stack tags reach every tagged resource), and a transform makes
 * the processed template unknown here, so both keep the standard mode.
 */
export const chooseUpdateDeploymentMode = ({
  oldTemplate,
  newTemplate,
  stackSettingChanged
}: {
  oldTemplate: Pick<CloudFormationTemplate, 'Resources' | 'Transform'> | undefined;
  newTemplate: Pick<CloudFormationTemplate, 'Resources' | 'Transform'>;
  stackSettingChanged: boolean;
}): 'EXPRESS' | 'STANDARD' => {
  if (!oldTemplate || stackSettingChanged || oldTemplate.Transform || newTemplate.Transform) return 'STANDARD';
  const oldResources = oldTemplate.Resources ?? {};
  const newResources = newTemplate.Resources ?? {};
  const changed = [...new Set([...Object.keys(oldResources), ...Object.keys(newResources)])].filter(
    (logicalId) => !isEqual(oldResources[logicalId], newResources[logicalId])
  );
  const createsRule = changed.some(
    (logicalId) => !oldResources[logicalId] && newResources[logicalId]?.Type === 'AWS::Events::Rule'
  );
  const changesOnlyExpressTypes = changed.every((logicalId) =>
    [oldResources[logicalId]?.Type, newResources[logicalId]?.Type]
      .filter((type): type is string => !!type)
      .every((type) => EXPRESS_UPDATE_RESOURCE_TYPES.has(type))
  );
  return createsRule && changesOnlyExpressTypes ? 'EXPRESS' : 'STANDARD';
};
