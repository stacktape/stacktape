import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
import { randomUUID } from 'node:crypto';
import type { ProductAnalyticsEventMap } from '@stacktape/analytics/events';
import { ANALYTICS_EVENTS, getCommonEventProperties } from '@stacktape/analytics/events';
import {
  getPostHogEnvironment,
  getPostHogIngestionHost,
  POSTHOG_PRODUCTION_PROJECT_TOKEN
} from '@stacktape/analytics/posthog';
import {
  sanitizeErrorForTelemetry,
  sanitizeExceptionTelemetryValue,
  sanitizeTelemetryValue
} from '@stacktape/analytics/privacy';
import { PostHog } from 'posthog-node';
import { globalStateManager } from '@application-services/global-state-manager';
import { IS_DEV, IS_TELEMETRY_DISABLED } from '@config';
import { getTimeSinceProcessStart } from '@utils/misc';
import { getStacktapeVersion } from '@utils/versioning';

const explicitProjectToken = process.env.POSTHOG_PROJECT_TOKEN || process.env.STP_POSTHOG_PROJECT_TOKEN;
const version = (() => {
  try {
    return getStacktapeVersion();
  } catch {
    // STACKTAPE_VERSION is injected by the dev/release bundlers and is intentionally absent in source-level tests.
    return 'dev';
  }
})();
const environment = getPostHogEnvironment({
  explicitEnvironment: process.env.POSTHOG_ENVIRONMENT || process.env.STP_POSTHOG_ENVIRONMENT,
  version,
  isDevelopment: IS_DEV
});
const projectToken = explicitProjectToken || (environment === 'production' ? POSTHOG_PRODUCTION_PROJECT_TOKEN : null);
const telemetryEnabled = !IS_TELEMETRY_DISABLED && Boolean(projectToken);
const fallbackDistinctId = `cli:${randomUUID()}`;

const posthogClient = telemetryEnabled
  ? new PostHog(projectToken!, {
      host: process.env.POSTHOG_HOST || process.env.STP_POSTHOG_HOST || getPostHogIngestionHost(environment),
      flushAt: 1,
      flushInterval: 0,
      requestTimeout: 1500,
      before_send: (event) =>
        event
          ? ({
              ...event,
              properties:
                event.event === '$exception'
                  ? sanitizeExceptionTelemetryValue(event.properties)
                  : sanitizeTelemetryValue(event.properties)
            } as typeof event)
          : null
    })
  : null;

/** The identity events are attributed to, exported for feature modules that capture their own. */
export const getTelemetryIdentity = () => getIdentity();

const getIdentity = () => {
  const userId = globalStateManager.userData?.id;
  const organizationId = globalStateManager.organizationData?.id;
  return {
    distinctId: userId || globalStateManager.systemId || fallbackDistinctId,
    hasIdentifiedUser: Boolean(userId),
    groups: organizationId ? { organization: organizationId } : undefined
  };
};

const getCommonProperties = () => getCommonEventProperties({ app: 'cli', environment, version });

export const capturePostHogEvent = <TEvent extends keyof ProductAnalyticsEventMap>(
  distinctId: string,
  event: TEvent,
  properties: ProductAnalyticsEventMap[TEvent],
  options: { processPersonProfile?: boolean } = {}
) => {
  if (!posthogClient) return;
  const props: Record<string, any> = { ...getCommonProperties(), ...properties };
  if (options.processPersonProfile === false) {
    props.$process_person_profile = false;
  }
  posthogClient.capture({ distinctId, event, properties: props });
};

export const identifyPostHogUser = (distinctId: string, properties: Record<string, any> = {}) => {
  posthogClient?.identify({ distinctId, properties: sanitizeTelemetryValue(properties) as Record<string, any> });
};

export const aliasPostHogUser = (distinctId: string, alias: string) => {
  if (distinctId !== alias) posthogClient?.alias({ distinctId, alias });
};

export const flushPostHog = async () => {
  try {
    await posthogClient?.flush();
  } catch {
    // Telemetry must never make a CLI operation fail.
  }
};

export const reportTelemetryEvent = async ({
  outcome,
  args,
  command,
  invocationId
}: {
  outcome: string;
  args: StacktapeArgs;
  command: StacktapeCommand;
  invocationId: string;
}) => {
  if (!posthogClient) return;
  const { distinctId, hasIdentifiedUser, groups } = getIdentity();
  const normalizedOutcome =
    outcome === 'SUCCESS' ? 'success' : outcome === 'USER_INTERRUPTION' ? 'user_interruption' : 'error';

  capturePostHogEvent(
    distinctId,
    ANALYTICS_EVENTS.cliCommandCompleted,
    {
      command,
      args_keys: args ? Object.keys(args).sort() : null,
      duration_ms: getTimeSinceProcessStart(),
      outcome: normalizedOutcome,
      ...(normalizedOutcome === 'error' ? { error_code: outcome } : {}),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: process.platform,
      invocation_id: invocationId,
      ...(groups ? { $groups: groups } : {})
    },
    // only create person profiles for identified users
    { processPersonProfile: hasIdentifiedUser }
  );

  return flushPostHog();
};

export const reportErrorToPostHog = async ({
  error,
  command,
  invocationId,
  mechanism
}: {
  error: unknown;
  command?: StacktapeCommand;
  invocationId?: string;
  mechanism: 'command_handler' | 'uncaught_exception' | 'unhandled_rejection';
}) => {
  if (!posthogClient) return null;

  const errorTrackingId = randomUUID();
  const { distinctId, hasIdentifiedUser, groups } = getIdentity();
  try {
    await posthogClient.captureExceptionImmediate(sanitizeErrorForTelemetry(error), distinctId, {
      ...getCommonProperties(),
      error_tracking_id: errorTrackingId,
      mechanism,
      command,
      invocation_id: invocationId,
      ...(groups ? { $groups: groups } : {}),
      ...(!hasIdentifiedUser ? { $process_person_profile: false } : {})
    });
    return errorTrackingId;
  } catch {
    return null;
  }
};
