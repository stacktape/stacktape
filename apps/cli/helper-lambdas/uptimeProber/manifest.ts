import type { UptimeCheckAssertion } from '@stacktape/config/uptime-checks';

/**
 * The JSON value of one `/stacktape/uptime-checks/{stackName}/{checkName}` SSM parameter.
 *
 * Written into each region the check is assigned to by the uptimeMonitoring custom resource, read
 * back by the prober running in that region. The CLI computes `revision` as a content hash of the
 * check definition, so the Console can drop probe results reported against a definition that a later
 * deploy replaced.
 */
export type UptimeCheckManifestEntry = {
  v: 1;
  revision: string;
  project: string;
  stage: string;
  stackName: string;
  checkName: string;
  enabled: boolean;
  url: string;
  method: 'GET' | 'HEAD';
  intervalSeconds: 30 | 60;
  timeoutSeconds: number;
  followRedirects: boolean;
  assertions?: UptimeCheckAssertion[];
};

export const UPTIME_MANIFEST_VERSION = 1 as const;

/** The checks one probe region runs for this stack. A check appears only under its assigned regions. */
export type UptimeRegionAssignment = {
  region: string;
  checks: UptimeCheckManifestEntry[];
};
