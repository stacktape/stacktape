import { ResourceImpact } from '@aws-cdk/cloudformation-diff';

/**
 * CloudFormation resources that the v3 → v4 upgrade intentionally replaces or removes, per baseline case. Each entry is
 * documented in the upgrade guide (`apps/docs/content/getting-started/upgrading-from-v3.mdx`). Stateful resources
 * never belong here: the spec fails on them before consulting this list.
 */
export const expectedV3UpgradeChanges: Record<string, Record<string, ResourceImpact>> = {};
