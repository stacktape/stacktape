import { globalStateManager } from '@application-services/global-state-manager';
import { getTimeSinceProcessStart } from '@shared/utils/misc';
import { trackEventToMixpanel } from '@shared/utils/telemetry';
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
  const telemetryData: TelemetryData = {
    distinct_id: globalStateManager.systemId,
    command,
    cliArgs: args ? Object.keys(args) : null,
    duration: getTimeSinceProcessStart(),
    outcome,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    version: getStacktapeVersion(),
    platform: process.platform,
    invokedFrom,
    invocationId
  };

  return trackEventToMixpanel('execute command', telemetryData);
};
