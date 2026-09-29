import type { StacktapeArgs } from 'src/config/cli/types';
import { reportTelemetryEvent } from './telemetry';

// Each invocation is a fresh process so telemetry's import-time opt-out and client state cannot leak between cases.
void reportTelemetryEvent({
  outcome: 'SUCCESS',
  command: 'version',
  invocationId: 'synthetic-invocation',
  args: {
    apiKey: 'synthetic-api-key-value',
    projectName: 'synthetic-private-project-value',
    stage: 'synthetic-private-stage-value'
  } as StacktapeArgs,
  waitForDelivery: true
}).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
