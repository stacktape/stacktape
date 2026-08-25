import type { StpUptimeCheck } from '@domain-services/config-manager/resolved-types/uptime-checks';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import type { NotificationChannel } from '@stacktape/config/notification-channels';
import type { SyncUptimeChecksParams } from '@stacktape/console-api/api-key';
import { createHash } from 'node:crypto';
import { isSupportedAwsRegion } from '@stacktape/config/aws-regions';
import { configErrors } from '../errors';

type ResolvedUptimeCheck = StpUptimeCheck & {
  regions: SupportedAWSRegion[];
  method: NonNullable<StpUptimeCheck['method']>;
  intervalSeconds: NonNullable<StpUptimeCheck['intervalSeconds']>;
  timeoutSeconds: number;
  followRedirects: boolean;
  enabled: boolean;
};

/**
 * Preference order for the probe regions added when the user doesn't configure any. Spread across
 * continents so the default gives a genuinely distant second and third vantage point.
 */
const DEFAULT_DISTANT_REGION_CANDIDATES: SupportedAWSRegion[] = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];

export const MAX_UPTIME_CHECK_REGIONS = 5;
/** Mirrors the Console sync contract's per-stack cap; validated before synthesis so deploys fail early. */
export const MAX_UPTIME_CHECKS_PER_STACK = 100;

/**
 * Matches Stacktape directive invocations (`$ResourceParam(...)`, `$Secret(...)`, custom directives).
 * A url containing one cannot be format-validated until directives resolve during synthesis.
 */
const DIRECTIVE_PATTERN = /\$[A-Za-z_][A-Za-z0-9_]*\(/;

/**
 * Content-hash identity of a check definition. The SSM manifest (read by probers) and the Console
 * projection (used to drop stale probe results) must carry the byte-identical value, so both derive
 * it from this one function. The key order below is the canonical serialization.
 */
export const computeUptimeCheckRevision = (check: ResolvedUptimeCheck) => {
  const definition = {
    url: check.url,
    method: check.method,
    intervalSeconds: check.intervalSeconds,
    timeoutSeconds: check.timeoutSeconds,
    followRedirects: check.followRedirects,
    assertions: check.assertions ?? null,
    evaluation: check.evaluation ?? null,
    enabled: check.enabled,
    regions: check.regions
  };
  return createHash('sha256').update(JSON.stringify(definition)).digest('hex').slice(0, 24);
};

/** Config channel vocabulary (`ms-teams`, `email`, `console-channel`) to the Console wire vocabulary. */
export const translateNotificationChannelsForConsole = (channels: NotificationChannel[] | undefined) =>
  (channels || []).map((channel) => {
    if (channel.type === 'console-channel') {
      return { name: channel.properties.channelName, type: 'console-channel' as const, properties: {} };
    }
    return {
      name: channel.type === 'slack' ? 'Slack' : channel.type === 'email' ? 'Email' : channel.type,
      type:
        channel.type === 'ms-teams'
          ? ('ms_teams' as const)
          : channel.type === 'email'
            ? ('e_mail' as const)
            : channel.type,
      properties: channel.properties
    };
  });

/**
 * A stale Console projection silently drops probe results for a changed revision, so the deploy/delete
 * sync is worth a few attempts before falling back to a warning.
 */
export const withSyncRetries = async <T>(request: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
};

export const buildUptimeChecksSyncPayload = ({
  checks,
  projectName,
  stage
}: {
  checks: ResolvedUptimeCheck[];
  projectName: string;
  stage: string;
}): SyncUptimeChecksParams => ({
  project: projectName,
  stage,
  checks: checks.map((check) => ({
    name: check.name,
    revision: computeUptimeCheckRevision(check),
    enabled: check.enabled,
    url: check.url,
    method: check.method,
    intervalSeconds: check.intervalSeconds,
    timeoutSeconds: check.timeoutSeconds,
    followRedirects: check.followRedirects,
    ...(check.assertions
      ? { assertions: check.assertions as unknown as SyncUptimeChecksParams['checks'][number]['assertions'] }
      : {}),
    regions: check.regions,
    consecutiveFailures: check.evaluation?.consecutiveFailures ?? 2,
    consecutiveSuccesses: check.evaluation?.consecutiveSuccesses ?? 2,
    notificationChannels: translateNotificationChannelsForConsole(check.notificationChannels)
  }))
});

export const resolveUptimeCheckRegions = ({
  configuredRegions,
  stackRegion
}: {
  configuredRegions: SupportedAWSRegion[] | undefined;
  stackRegion: string;
}): SupportedAWSRegion[] => {
  if (configuredRegions?.length) {
    return configuredRegions;
  }
  const distantRegions = DEFAULT_DISTANT_REGION_CANDIDATES.filter((region) => region !== stackRegion).slice(0, 2);
  return isSupportedAwsRegion(stackRegion) ? [stackRegion, ...distantRegions] : distantRegions;
};

const assertIntegerInRange = ({
  checkName,
  property,
  min,
  max,
  value
}: {
  checkName: string;
  property: string;
  min: number;
  max: number;
  value: number | undefined;
}) => {
  if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
    throw configErrors.uptimeCheckValueOutOfRange({ checkName, property, min, max, actual: value });
  }
};

export const validateUptimeCheck = ({ check }: { check: StpUptimeCheck & { regions: SupportedAWSRegion[] } }) => {
  const containsDirective = DIRECTIVE_PATTERN.test(check.url);
  if (!containsDirective && !/^https?:\/\//.test(check.url)) {
    throw configErrors.uptimeCheckUrlInvalid({ checkName: check.name, url: check.url });
  }
  for (const assertion of check.assertions || []) {
    if (assertion.type === 'body-contains') {
      if (check.method === 'HEAD') {
        throw configErrors.uptimeCheckBodyAssertionRequiresGet({ checkName: check.name });
      }
      if (!assertion.properties.value.trim()) {
        throw configErrors.uptimeCheckAssertionInvalid({
          checkName: check.name,
          reason: 'a `body-contains` assertion requires a non-empty `value`.'
        });
      }
    }
    if (assertion.type === 'status-code') {
      if (!assertion.properties.accepted.length) {
        throw configErrors.uptimeCheckAssertionInvalid({
          checkName: check.name,
          reason: 'a `status-code` assertion requires at least one entry in `accepted`.'
        });
      }
      for (const statusCode of assertion.properties.accepted) {
        if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
          throw configErrors.uptimeCheckAssertionInvalid({
            checkName: check.name,
            reason: `\`accepted\` status codes must be integers between 100 and 599 (got ${statusCode}).`
          });
        }
      }
    }
  }
  // A probe must finish before the next one starts, so the timeout is additionally capped by the interval.
  assertIntegerInRange({
    checkName: check.name,
    property: 'timeoutSeconds',
    min: 1,
    max: Math.min(30, check.intervalSeconds ?? 60),
    value: check.timeoutSeconds
  });
  for (const property of ['consecutiveFailures', 'consecutiveSuccesses'] as const) {
    assertIntegerInRange({
      checkName: check.name,
      property: `evaluation.${property}`,
      min: 1,
      max: 10,
      value: check.evaluation?.[property]
    });
  }
  if (check.regions.length > MAX_UPTIME_CHECK_REGIONS) {
    throw configErrors.uptimeCheckRegionsInvalid({
      checkName: check.name,
      reason: `at most ${MAX_UPTIME_CHECK_REGIONS} probe regions are supported (got ${check.regions.length}).`
    });
  }
  if (new Set(check.regions).size !== check.regions.length) {
    throw configErrors.uptimeCheckRegionsInvalid({
      checkName: check.name,
      reason: `\`regions\` contains duplicate entries (${check.regions.join(', ')}).`
    });
  }
};
