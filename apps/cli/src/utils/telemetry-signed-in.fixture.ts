import { globalStateManager } from '@application-services/global-state-manager';

// Preloaded by `telemetry.spec.ts` for the signed-in rules: a CLI with an API key reports as it always has.
globalStateManager.apiKey = 'synthetic-signed-in-fixture';
