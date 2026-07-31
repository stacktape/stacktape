import { appendFileSync } from 'node:fs';

const markerPath = process.env.STACKTAPE_CONFIG_EXECUTION_MARKER;
if (markerPath) {
  appendFileSync(markerPath, 'executed\n');
}

throw new Error('intentional config execution failure');
