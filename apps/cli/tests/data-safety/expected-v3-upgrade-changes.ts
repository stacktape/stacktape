import { ResourceImpact } from '@aws-cdk/cloudformation-diff';

// Only `stacktape dev` uses the dev agent role, so a stack it did not create no longer has one.
const everyStack = { StpDevAgentRole: ResourceImpact.WILL_DESTROY };

/**
 * CloudFormation resources that the v3 → v4 upgrade intentionally replaces or removes, per baseline case. Each entry is
 * documented in the upgrade guide (`apps/docs/content/getting-started/upgrading-from-v3.mdx`). Stateful resources
 * never belong here: the spec fails on them before consulting this list.
 */
export const expectedV3UpgradeChanges: Record<string, Record<string, ResourceImpact>> = {
  'aurora-streaming': everyStack,
  // A stack with nothing to tag no longer gets the internal tagging schedule.
  'serverless-api': {
    ...everyStack,
    StpStpCustomTaggingScheduleRule: ResourceImpact.WILL_DESTROY,
    StpStpCustomTaggingScheduleRulePermission: ResourceImpact.WILL_DESTROY
  },
  // The default container `stopTimeout` changed from 2 to 30 seconds. A task definition is immutable, so the upgrade
  // registers a new revision and the service rolls to it, exactly as for a code change.
  'container-platform': {
    ...everyStack,
    WebTaskDefinition: ResourceImpact.WILL_REPLACE,
    WorkerTaskDefinition: ResourceImpact.WILL_REPLACE,
    // A CDN gets the origin-response edge Lambda only when a bucket sets custom metadata headers, its only use.
    CdnOriginResponseLambdaEdgeLambdaCustomResource: ResourceImpact.WILL_DESTROY,
    // A service with a fixed instance count (1 and 1 here) gets no scaling policies; they could never act.
    WebEcsServiceAverageCpuUtilizationScalingPolicy: ResourceImpact.WILL_DESTROY,
    WebEcsServiceAverageMemoryUtilizationScalingPolicy: ResourceImpact.WILL_DESTROY,
    WorkerEcsServiceAverageCpuUtilizationScalingPolicy: ResourceImpact.WILL_DESTROY,
    WorkerEcsServiceAverageMemoryUtilizationScalingPolicy: ResourceImpact.WILL_DESTROY
  }
};
