import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMAS_BUCKET_NAME } from '@config';
import { CONFIG_SCHEMA_PATH, JSON_SCHEMAS_FOLDER_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { exec } from '@utils/exec';
import { copy } from 'fs-extra';

/**
 * Publishes this checkout's committed schemas to https://schemas.stacktape-dev.com (bucket `SCHEMAS_BUCKET_NAME`).
 * Uses the source CLI in dev mode, so the result does not depend on the Stacktape installed on PATH. Like the other
 * `pnpm dev:cli` commands it signs in with the dev Console API key from `.env.local` and uploads with the AWS credentials
 * of the environment. Run it from `apps/cli` after `build:dev-artifacts`.
 */
export const publishSchemas = async () => {
  logInfo(`Publishing schemas to ${SCHEMAS_BUCKET_NAME}...`);
  const publishDirectory = await mkdtemp(join(tmpdir(), 'stacktape-schemas-'));

  try {
    await copy(JSON_SCHEMAS_FOLDER_PATH, publishDirectory);
    await copy(CONFIG_SCHEMA_PATH, join(publishDirectory, 'config-schema.json'));
    await exec(
      'bun',
      [
        'run',
        'scripts/dev.ts',
        'bucket:sync',
        '--bucketId',
        SCHEMAS_BUCKET_NAME,
        '--sourcePath',
        publishDirectory,
        '--invalidateCdnCache',
        '--headersPreset',
        'static-website',
        '--region',
        'eu-west-1'
      ],
      {}
    );
    logSuccess('Schemas successfully published.');
  } finally {
    await rm(publishDirectory, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  publishSchemas().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
