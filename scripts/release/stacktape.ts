import { exec } from '@shared/utils/exec';
import { config as loadDotenv } from 'dotenv';

loadDotenv();

export const syncBucket = async ({ bucketName, sourcePath }: { bucketName: string; sourcePath: string }) => {
  return await exec(
    'stacktape',
    [
      'bucket:sync',
      '--bucketId',
      bucketName,
      '--sourcePath',
      sourcePath,
      '--invalidateCdnCache',
      '--headersPreset',
      'static-website',
      '--region',
      'eu-west-1'
    ],
    {
      disableStdout: true
    }
  );
};
