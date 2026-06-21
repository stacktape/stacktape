import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const mountPath = process.env.S3_FILES_MOUNT_PATH || '/mnt/s3files';
const testDir = join(mountPath, 'lambda-smoke-test');

export const handler = async () => {
  const requestId = crypto.randomUUID();
  const filePath = join(testDir, `${requestId}.json`);
  const payload = {
    requestId,
    writtenAt: new Date().toISOString(),
    message: 'S3 Files Lambda mount smoke test'
  };

  await mkdir(testDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2));

  const [contents, fileStats, entries] = await Promise.all([
    readFile(filePath, 'utf8'),
    stat(filePath),
    readdir(testDir)
  ]);
  const parsed = JSON.parse(contents);

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: parsed.requestId === requestId,
      mountPath,
      filePath,
      fileSize: fileStats.size,
      entries: entries.slice(-10),
      payload: parsed
    })
  };
};
