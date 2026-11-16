import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';

export const CLOUDFORMATION_RESOURCE_LIMIT = 500;
const RESOURCE_LIMIT_WARNING_THRESHOLD = 470;

/**
 * Resources that error tracking (`deploymentConfig.errorTracking`, on by default) adds: a log subscription filter for
 * each function and container whose errors it reads, and one shared permission that lets the logs invoke the service
 * Lambda.
 */
export const countErrorTrackingResources = (resources: CloudFormationTemplate['Resources']) => {
  const permissionLogicalName = cfLogicalNames.issueDetectionLogsPermission();
  return Object.entries(resources).filter(
    ([logicalName, resource]) =>
      logicalName === permissionLogicalName ||
      (resource.Type === 'AWS::Logs::SubscriptionFilter' && logicalName.endsWith('IssueDetectionSubscriptionFilter'))
  ).length;
};

const errorTrackingShare = (errorTrackingResources: number) =>
  errorTrackingResources ? `, ${errorTrackingResources} of them added by error tracking` : '';

export const resourceLimitWarning = (resources: CloudFormationTemplate['Resources']): string | undefined => {
  const count = Object.keys(resources).length;
  if (count <= RESOURCE_LIMIT_WARNING_THRESHOLD) return undefined;
  return `Approaching CloudFormation's ${CLOUDFORMATION_RESOURCE_LIMIT}-resource limit (used: ${count}${errorTrackingShare(
    countErrorTrackingResources(resources)
  )}).`;
};

export const resourceLimitExceededError = (resources: CloudFormationTemplate['Resources']): CliError | undefined => {
  const count = Object.keys(resources).length;
  if (count <= CLOUDFORMATION_RESOURCE_LIMIT) return undefined;
  const errorTrackingResources = countErrorTrackingResources(resources);
  const withoutErrorTracking = count - errorTrackingResources;
  const errorTrackingHints = errorTrackingResources
    ? [
        `Error tracking added ${errorTrackingResources} resources: a log subscription filter for each function and container, and one shared permission. Without it, this template has ${withoutErrorTracking} resources${
          withoutErrorTracking <= CLOUDFORMATION_RESOURCE_LIMIT ? ', within the limit' : ', still over the limit'
        }.`,
        'To turn error tracking off for this stack, set `deploymentConfig.errorTracking.enabled: false`. To keep it only on the stages that have room for it, list them in `deploymentConfig.errorTracking.stages: [...]`.'
      ]
    : [];
  return new CliError({
    category: 'CLOUDFORMATION',
    code: 'CLOUDFORMATION_RESOURCE_LIMIT_EXCEEDED',
    message: `CloudFormation templates cannot contain more than ${CLOUDFORMATION_RESOURCE_LIMIT} resources. This template contains ${count}${errorTrackingShare(errorTrackingResources)}.`,
    hints: [
      ...errorTrackingHints,
      'Split the infrastructure across multiple stacks or remove resources that are no longer needed.'
    ]
  });
};
