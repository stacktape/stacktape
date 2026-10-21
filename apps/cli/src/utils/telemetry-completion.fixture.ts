import type { StacktapeArgs } from 'src/config/cli/types';
import { reportErrorToPostHog, reportTelemetryEvent } from './telemetry';

// Each invocation has fresh import-time opt-out and SDK state.
const run = async () => {
  if (process.argv[2] === 'exception') {
    const error = new Error(
      'Failed for user@example.com in account 123456789012 with token=secret-value at /home/synthetic-user/app'
    );
    // The frames of a compiled executable. The SDK rewrites absolute paths relative to the working directory, which
    // the report must undo so the frames match the uploaded source map from any directory.
    error.stack = `${error.name}: ${error.message}\n    at run (/$bunfs/root/stacktape:10:5)\n    at main (/$bunfs/root/stacktape:20:3)`;
    const id = await reportErrorToPostHog({ error, mechanism: 'command_handler' });
    console.log(JSON.stringify({ id }));
  } else {
    await reportTelemetryEvent({
      outcome: process.argv[2] === 'failure' ? 'DEPLOY_FAILED' : 'SUCCESS',
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
