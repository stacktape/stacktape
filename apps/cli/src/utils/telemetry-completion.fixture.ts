import type { StacktapeArgs } from 'src/config/cli/types';
import { reportErrorToPostHog, reportTelemetryEvent } from './telemetry';

// Each invocation has fresh import-time opt-out and SDK state.
const run = async () => {
  if (process.argv[2] === 'exception') {
    const id = await reportErrorToPostHog({
      error: new Error('Failed for user@example.com in account 123456789012 with token=secret-value'),
      mechanism: 'command_handler'
    });
    console.log(JSON.stringify({ id }));
  } else {
    await reportTelemetryEvent({
      outcome: 'SUCCESS',
      command: 'version',
      invocationId: 'synthetic-invocation',
      args: {
        apiKey: 'synthetic-api-key-value',
        projectName: 'synthetic-private-project-value',
        stage: 'synthetic-private-stage-value'
      } as StacktapeArgs,
      waitForDelivery: true
    });
    console.log('command-completed');
  }
};
void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
