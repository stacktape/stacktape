import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted
} from '@aws-sdk/client-cloudfront';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { validateReleaseInput, type ReleaseChannel } from './release/validate-release-input';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INSTALL_SCRIPTS_PATH } from 'src/config/project-paths';
import yargsParser from 'yargs-parser';

export const PUBLISHED_INSTALL_ASSET_FILES = [
  '_data.json',
  'alpine.sh',
  'linux-arm.sh',
  'linux.sh',
  'macos-arm.sh',
  'macos.sh',
  'windows.ps1'
] as const;

const CACHE_CONTROL = 'public, max-age=0, s-maxage=31536000, must-revalidate';

type InstallAsset = {
  body: Buffer;
  checksumSha256: string;
  contentType: string;
  key: (typeof PUBLISHED_INSTALL_ASSET_FILES)[number];
};

type PublishInstallScriptsOptions = {
  baseUrl: string;
  bucketName: string;
  channel: ReleaseChannel;
  distributionId: string;
  version: string;
};

const contentTypeFor = (fileName: InstallAsset['key']) => {
  if (fileName === '_data.json') return 'application/json';
  if (fileName.endsWith('.sh')) return 'application/x-sh';
  return 'application/octet-stream';
};

export const prepareInstallAssets = async ({ version }: { version: string }): Promise<InstallAsset[]> =>
  Promise.all(
    PUBLISHED_INSTALL_ASSET_FILES.map(async (key) => {
      const source = await readFile(join(INSTALL_SCRIPTS_PATH, key), 'utf8');
      if (!source.includes('<<DEFAULT_VERSION>>')) {
        throw new Error(`Installer source ${key} does not contain the release-version placeholder.`);
      }
      const body = Buffer.from(source.replaceAll('<<DEFAULT_VERSION>>', version));
      return {
        body,
        checksumSha256: createHash('sha256').update(body).digest('base64'),
        contentType: contentTypeFor(key),
        key
      };
    })
  );

const verifyPublicAssets = async ({ assets, baseUrl }: { assets: InstallAsset[]; baseUrl: string }) => {
  for (const asset of assets) {
    const expectedHash = asset.checksumSha256;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}/${asset.key}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(30_000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const actualHash = createHash('sha256')
          .update(Buffer.from(await response.arrayBuffer()))
          .digest('base64');
        if (actualHash !== expectedHash) throw new Error('content checksum does not match');
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 6) await Bun.sleep(attempt * 1_000);
      }
    }
    if (lastError) {
      throw new Error(`Could not verify published installer ${baseUrl}/${asset.key}.`, { cause: lastError });
    }
  }
};

export const publishInstallScripts = async ({
  baseUrl,
  bucketName,
  channel,
  distributionId,
  version
}: PublishInstallScriptsOptions) => {
  validateReleaseInput({ channel, version });
  if (!bucketName) throw new Error('STACKTAPE_INSTALLS_BUCKET_NAME is required.');
  if (!distributionId) throw new Error('STACKTAPE_INSTALLS_DISTRIBUTION_ID is required.');
  if (!URL.canParse(baseUrl) || new URL(baseUrl).protocol !== 'https:') {
    throw new Error('STACKTAPE_INSTALLS_BASE_URL must be an HTTPS URL.');
  }

  const assets = await prepareInstallAssets({ version });
  const s3 = new S3Client({});
  for (const asset of assets) {
    await s3.send(
      new PutObjectCommand({
        Body: asset.body,
        Bucket: bucketName,
        CacheControl: CACHE_CONTROL,
        ChecksumSHA256: asset.checksumSha256,
        ContentType: asset.contentType,
        Key: asset.key
      })
    );
    const uploaded = await s3.send(
      new HeadObjectCommand({ Bucket: bucketName, ChecksumMode: 'ENABLED', Key: asset.key })
    );
    if (uploaded.ChecksumSHA256 !== asset.checksumSha256) {
      throw new Error(`S3 did not preserve the checksum for installer ${asset.key}.`);
    }
  }

  const cloudFront = new CloudFrontClient({});
  const invalidation = await cloudFront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `stacktape-${channel}-${randomUUID()}`,
        Paths: { Items: assets.map(({ key }) => `/${key}`), Quantity: assets.length }
      }
    })
  );
  const invalidationId = invalidation.Invalidation?.Id;
  if (!invalidationId) throw new Error('CloudFront did not return an invalidation ID.');
  await waitUntilInvalidationCompleted(
    { client: cloudFront, maxWaitTime: 300, minDelay: 2, maxDelay: 15 },
    { DistributionId: distributionId, Id: invalidationId }
  );
  await verifyPublicAssets({ assets, baseUrl: baseUrl.replace(/\/$/, '') });
  console.info(`Published and verified ${assets.length} ${channel} installer assets for Stacktape ${version}.`);
};

if (import.meta.main) {
  const args = yargsParser(process.argv.slice(2));
  publishInstallScripts({
    baseUrl: process.env.STACKTAPE_INSTALLS_BASE_URL || '',
    bucketName: process.env.STACKTAPE_INSTALLS_BUCKET_NAME || '',
    channel: String(args.channel || '') as ReleaseChannel,
    distributionId: process.env.STACKTAPE_INSTALLS_DISTRIBUTION_ID || '',
    version: String(args.version || '')
  }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
