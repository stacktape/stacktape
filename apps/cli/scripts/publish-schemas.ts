import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCHEMAS_BUCKET_NAME } from '@config';
import { CONFIG_SCHEMA_PATH, JSON_SCHEMAS_FOLDER_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess } from '@scripts/support/logging';
import { copy } from 'fs-extra';
import { syncBucket } from './release/stacktape';

export const publishSchemas = async () => {
  logInfo('Publishing schemas to the schemas hosting bucket...');
  const publishDirectory = await mkdtemp(join(tmpdir(), 'stacktape-schemas-'));

  try {
    await copy(JSON_SCHEMAS_FOLDER_PATH, publishDirectory);
    await copy(CONFIG_SCHEMA_PATH, join(publishDirectory, 'config-schema.json'));
    await syncBucket({ bucketName: SCHEMAS_BUCKET_NAME, sourcePath: publishDirectory });
    logSuccess('Schemas successfully published.');
  } finally {
    await rm(publishDirectory, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  publishSchemas();
}
