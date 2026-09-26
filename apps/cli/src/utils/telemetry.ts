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
import { canHandOffTelemetry, handOffTelemetryRequest } from '@utils/telemetry-sender';
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

const posthogOptions: ConstructorParameters<typeof PostHog>[1] = {
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
};

const posthogClient = telemetryEnabled ? new PostHog(projectToken!, posthogOptions) : null;

/**
 * Builds a request exactly as the shared client does, then hands it to the detached telemetry sender instead of
 * sending it (`utils/telemetry-sender.ts`). Uncompressed, so the request passes to the sender as text; the sender makes
 * the one attempt.
 */
const createHandOffClient = () =>
  new PostHog(projectToken!, {
    ...posthogOptions,
    disableCompression: true,
    fetchRetryCount: 0,
    fetch: async (url, { headers, body }) => {
      if (typeof body === 'string') handOffTelemetryRequest({ url, headers, body });
      return new Response(null, { status: 200 });
    }
  });

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

const toCaptureMessage = <TEvent extends keyof ProductAnalyticsEventMap>(
  distinctId: string,
  event: TEvent,
  properties: ProductAnalyticsEventMap[TEvent],
  options: { processPersonProfile?: boolean }
) => {
  const props: Record<string, any> = { ...getCommonProperties(), ...properties };
  if (options.processPersonProfile === false) {
    props.$process_person_profile = false;
  }
  return { distinctId, event, properties: props };
};

export const capturePostHogEvent = <TEvent extends keyof ProductAnalyticsEventMap>(
  distinctId: string,
  event: TEvent,
  properties: ProductAnalyticsEventMap[TEvent],
  options: { processPersonProfile?: boolean } = {}
) => {
  posthogClient?.capture(toCaptureMessage(distinctId, event, properties, options));
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

/**
 * The completion report of a command. By default the exit does not wait for it: the detached sender posts it after the
 * CLI has exited. `waitForDelivery` sends it from this process and waits, for exits that end the CLI's own process tree;
 * so does a CLI run from source. Either way, events captured earlier in the command that are still being sent, such as
 * login's alias and identify, are waited for.
 */
export const reportTelemetryEvent = async ({
  outcome,
  args,
  command,
  invocationId,
  waitForDelivery = false
}: {
  outcome: string;
  args: StacktapeArgs;
  command: StacktapeCommand;
  invocationId: string;
  waitForDelivery?: boolean;
}) => {
  if (!posthogClient) return;
  const { distinctId, hasIdentifiedUser, groups } = getIdentity();
  const normalizedOutcome =
    outcome === 'SUCCESS' ? 'success' : outcome === 'USER_INTERRUPTION' ? 'user_interruption' : 'error';

  const message = toCaptureMessage(
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
  if (waitForDelivery || !canHandOffTelemetry()) {
    posthogClient.capture(message);
  } else {
    await createHandOffClient().captureImmediate(message);
  }

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
