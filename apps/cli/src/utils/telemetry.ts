import { PostHog } from 'posthog-node';
import { globalStateManager } from '@application-services/global-state-manager';
import { getTimeSinceProcessStart } from '@utils/misc';
import { getStacktapeVersion } from '@utils/versioning';

const POSTHOG_TOKEN = 'phc_FZgbDY1hF9qM8u2qg2Y9Q0j65qniei5XSAvV62HZs3U';
const POSTHOG_HOST = 'https://form-submissions.stacktape.com';

const posthogClient = new PostHog(POSTHOG_TOKEN, {
  host: POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0
});

export const capturePostHogEvent = (
  distinctId: string,
  event: string,
  properties: Record<string, any> = {},
  options: { processPersonProfile?: boolean } = {}
) => {
  const props = { ...properties };
  if (options.processPersonProfile === false) {
    props.$process_person_profile = false;
  }
  posthogClient.capture({ distinctId, event, properties: props });
};

export const identifyPostHogUser = (distinctId: string, properties: Record<string, any> = {}) => {
  posthogClient.identify({ distinctId, properties });
};

export const aliasPostHogUser = (distinctId: string, alias: string) => {
  posthogClient.alias({ distinctId, alias });
};

export const shutdownPostHog = async () => {
  try {
    await posthogClient.shutdown();
  } catch {
    // Telemetry must never make a CLI operation fail.
  }
};

export const reportTelemetryEvent = async ({
  outcome,
  args,
  command,
  invokedFrom,
  invocationId
}: {
  outcome: string;
  args: StacktapeArgs;
  command: StacktapeCommand;
  invokedFrom: InvokedFrom;
  invocationId: string;
}) => {
  const userId = globalStateManager.userData?.id;
  const distinctId = userId || globalStateManager.systemId;

  capturePostHogEvent(
    distinctId,
    'cli command executed',
    {
      command,
      args_keys: args ? Object.keys(args) : null,
      duration_ms: getTimeSinceProcessStart(),
      outcome,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: getStacktapeVersion(),
      platform: process.platform,
      invoked_from: invokedFrom,
      invocation_id: invocationId
    },
    // only create person profiles for identified users
    { processPersonProfile: !!userId }
  );

  return shutdownPostHog();
};
