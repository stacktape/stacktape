import { globalStateManager } from '@application-services/global-state-manager';
import { getTimeSinceProcessStart } from '@shared/utils/misc';
import { capturePostHogEvent, shutdownPostHog } from '@shared/utils/telemetry';
import { getStacktapeVersion } from '@utils/versioning';

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
