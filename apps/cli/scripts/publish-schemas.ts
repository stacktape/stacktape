import { SCHEMAS_BUCKET_NAME } from '@config';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { syncBucket } from './release/stacktape';

export const publishSchemas = async () => {
  logInfo('Publishing schemas to the schemas hosting bucket...');
  await syncBucket({ bucketName: SCHEMAS_BUCKET_NAME, sourcePath: '@generated/schemas' });
  logSuccess('Schemas successfully published.');
};

if (import.meta.main) {
  publishSchemas();
}
