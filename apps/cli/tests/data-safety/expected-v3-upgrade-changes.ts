import { ResourceImpact } from '@aws-cdk/cloudformation-diff';

/**
 * CloudFormation resources that the v3 → v4 upgrade intentionally replaces or removes, per baseline case. Each entry is
 * documented in the upgrade guide (`apps/docs/content/getting-started/upgrading-from-v3.mdx`). Stateful resources
 * never belong here: the spec fails on them before consulting this list.
 */
export const expectedV3UpgradeChanges: Record<string, Record<string, ResourceImpact>> = {
  // A stack with nothing to tag no longer gets the internal tagging schedule.
  'serverless-api': {
    StpStpCustomTaggingScheduleRule: ResourceImpact.WILL_DESTROY,
    StpStpCustomTaggingScheduleRulePermission: ResourceImpact.WILL_DESTROY
  },
  // The default container `stopTimeout` changed from 2 to 30 seconds. A task definition is immutable, so the upgrade
  // registers a new revision and the service rolls to it, exactly as for a code change.
  'container-platform': {
    WebTaskDefinition: ResourceImpact.WILL_REPLACE,
    WorkerTaskDefinition: ResourceImpact.WILL_REPLACE
  }
};
