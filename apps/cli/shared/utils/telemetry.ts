import { PostHog } from 'posthog-node';

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
    // telemetry is not mission critical
  }
};
