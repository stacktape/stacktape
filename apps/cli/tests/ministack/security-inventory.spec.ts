import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client
} from '@aws-sdk/client-s3';
import { startMiniStack } from '@stacktape/ministack/fixture';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { fsPaths } from '../../src/config/runtime-paths';
import { startSecurityInventory, uploadSecurityInventory } from '../../src/commands/_utils/security-inventory-step';

// Only Trivy's external scan is substituted. Inventory construction, previous-object reads, hashing, upload and reuse
// are the deploy path, with the artifact manager's real upload and the AWS SDK against MiniStack.
test('deploy inventories upload real bytes and digests, reuse unchanged packages and publish changed packages', async () => {
  const ministack = await startMiniStack({ label: 't25-inventory' });
  const clientConfig = ministack.clientConfig(ministack.account());
  const s3 = new S3Client(clientConfig);
  const directory = await mkdtemp(join(tmpdir(), 'stp-inventory-'));
  Object.assign(globalThis, { STACKTAPE_VERSION: '4.0.0-test' });
  const previousTrivy = process.env.STACKTAPE_TRIVY_PATH;
  const outputDirectory = fsPaths.absoluteTempFolderPath({ invocationId: globalStateManager.invocationId });
  try {
    const scanner = join(directory, 'trivy');
    await writeFile(
      scanner,
      `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.copyFileSync('scanner-input.json', args[args.indexOf('--output') + 1]);
`,
      { mode: 0o755 }
    );
    process.env.STACKTAPE_TRIVY_PATH = scanner;
    awsSdkManager.init({ ...clientConfig, region: 'eu-west-1', plugins: [] });
    configManager.config = { resources: {}, deploymentConfig: { disableS3TransferAcceleration: true } };
    deploymentArtifactManager.deploymentBucketName = 'stp-deployment-bucket-t25-inventory';
    await s3.send(new CreateBucketCommand({ Bucket: deploymentArtifactManager.deploymentBucketName }));
    const tui = {
      info: () => {},
      debug: () => {},
      warn: (message: string) => {
        throw new Error(message);
      }
    };
    const stackContext = {
      accountId: clientConfig.credentials.accessKeyId,
      command: 'deploy' as const,
      globallyUniqueStackHash: 't25',
      invocationId: globalStateManager.invocationId,
      projectName: 'shop',
      region: 'eu-west-1' as const,
      stackName: 'shop-production',
      stage: 'production',
      workingDir: directory
    };
    configManager.setStackContext(stackContext);
    const scan = async (packages: string[], version: string) => {
      await writeFile(
        join(directory, 'scanner-input.json'),
        JSON.stringify({
          bomFormat: 'CycloneDX',
          specVersion: '1.6',
          components: packages.map((name) => ({
            type: 'library',
            name,
            version: '1.0.0',
            purl: `pkg:npm/${name}@1.0.0`,
            'bom-ref': name
          }))
        })
      );
      const inventory = await startSecurityInventory({
        deploymentArtifacts: deploymentArtifactManager,
        stackContext,
        version,
        tui
      });
      expect(inventory).not.toBeNull();
      return {
        inventory: inventory!,
        pointer: (await uploadSecurityInventory({
          inventory,
          deploymentArtifacts: deploymentArtifactManager,
          version,
          tui
        }))!
      };
    };
    const first = await scan(['express', 'pg'], 'v000001');
    expect(first.inventory.summary).toEqual({
      componentCount: 2,
      workloads: [{ name: 'project', source: 'filesystem', componentCount: 2 }],
      ecosystems: { npm: 2 }
    });
    const bytes = await readFile(first.inventory.filePath);
    expect(first.pointer.key).toBe('security-inventory/v000001.json');
    const stored = await s3.send(new GetObjectCommand({ Bucket: first.pointer.bucket, Key: first.pointer.key }));
    expect(await stored.Body!.transformToString()).toBe(bytes.toString());
    const firstHash = createHash('sha256').update(bytes).digest('hex');
    expect(first.pointer.sha256).toBe(firstHash);
    expect(first.pointer.sizeBytes).toBe(bytes.length);
    const metadata = await s3.send(new HeadObjectCommand({ Bucket: first.pointer.bucket, Key: first.pointer.key }));
    expect(metadata.Metadata).toEqual({
      'stacktape-sha256': firstHash,
      'stacktape-content-sha256': first.inventory.contentSha256
    });
    await deploymentArtifactManager.loadPreviousBucketObjects(first.pointer.bucket, 'update');
    const unchanged = await scan(['pg', 'express'], 'v000002');
    expect(unchanged.pointer).toEqual(first.pointer);
    expect(
      (await s3.send(new ListObjectsV2Command({ Bucket: first.pointer.bucket }))).Contents?.map(({ Key }) => Key)
    ).toEqual([first.pointer.key]);
    const changed = await scan(['pg', 'express', 'left-pad'], 'v000003');
    expect(changed.pointer.key).toBe('security-inventory/v000003.json');
    expect(changed.pointer.sha256).not.toBe(firstHash);
    expect(changed.pointer.componentCount).toBe(3);
    const changedObject = await s3.send(
      new GetObjectCommand({ Bucket: changed.pointer.bucket, Key: changed.pointer.key })
    );
    const changedText = await changedObject.Body!.transformToString();
    expect(
      JSON.parse(changedText)
        .components.map(({ name }: { name: string }) => name)
        .toSorted()
    ).toEqual(['express', 'left-pad', 'pg']);
    // With several inventories in the bucket, the newest one decides whether the packages changed.
    await deploymentArtifactManager.loadPreviousBucketObjects(first.pointer.bucket, 'update');
    const unchangedAgain = await scan(['left-pad', 'pg', 'express'], 'v000004');
    expect(unchangedAgain.pointer).toEqual(changed.pointer);
  } finally {
    if (previousTrivy === undefined) delete process.env.STACKTAPE_TRIVY_PATH;
    else process.env.STACKTAPE_TRIVY_PATH = previousTrivy;
    s3.destroy();
    await rm(directory, { recursive: true, force: true });
    await rm(outputDirectory, { recursive: true, force: true });
    await ministack.stop();
  }
}, 90_000);
