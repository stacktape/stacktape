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

const asNumber = (value: unknown): number => Number(value);
const asBoolean = (value: unknown): boolean => value === true || value === 'true';

/**
 * Restores the manifest entry's scalar types. The entry travels to the provisioning resolver as
 * CloudFormation custom-resource properties, and CloudFormation stringifies EVERY leaf scalar on
 * that path — `v: 1` arrives as `"1"`, `enabled: true` as `"true"`, accepted status codes as
 * strings the prober's `includes(statusCode)` would never match. The resolver normalizes with this
 * before writing the SSM parameters the probers consume.
 */
export const normalizeUptimeManifestEntry = (entry: UptimeCheckManifestEntry): UptimeCheckManifestEntry => ({
  v: UPTIME_MANIFEST_VERSION,
  revision: String(entry.revision),
  project: String(entry.project),
  stage: String(entry.stage),
  stackName: String(entry.stackName),
  checkName: String(entry.checkName),
  enabled: asBoolean(entry.enabled),
  url: String(entry.url),
  method: entry.method === 'HEAD' ? 'HEAD' : 'GET',
  intervalSeconds: asNumber(entry.intervalSeconds) === 30 ? 30 : 60,
  timeoutSeconds: asNumber(entry.timeoutSeconds),
  followRedirects: asBoolean(entry.followRedirects),
  ...(entry.assertions
    ? {
        assertions: entry.assertions.map((assertion) =>
          assertion.type === 'status-code'
            ? {
                type: 'status-code',
                properties: { accepted: (assertion.properties.accepted || []).map(asNumber) }
              }
            : { type: 'body-contains', properties: { value: String(assertion.properties.value) } }
        )
      }
    : {})
});
