import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  CreateRepositoryCommand,
  DeleteRepositoryCommand,
  DescribeImagesCommand,
  ECRClient,
  ListImagesCommand,
  PutImageCommand
} from '@aws-sdk/client-ecr';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { AwsEcr } from '../../src/aws/ecr';

let ministack: MiniStack | undefined;
let client: ECRClient;
let ecr: AwsEcr;
const repositoryName = 'image-builder-metadata';

beforeAll(async () => {
  ministack = await startMiniStack({ label: 't12-ecr' });
  client = new ECRClient(ministack.clientConfig(ministack.account()));
  // MiniStack accepts oversized delete requests. Deliberately reject them at the SDK boundary so this scenario
  // also detects a regression in Stacktape's required 100-image batches.
  client.middlewareStack.add(
    (next, context) => async (args) => {
      const input = args.input as { imageIds?: unknown[] };
      if (context.commandName === 'BatchDeleteImageCommand' && (input.imageIds?.length ?? 0) > 100) {
        throw new Error('Injected ECR rejection: a delete batch exceeds 100 images');
      }
      return next(args);
    },
    { step: 'initialize', name: 'rejectOversizedEcrDelete' }
  );
  ecr = new AwsEcr({
    createClient: () => client,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });
  await client.send(new CreateRepositoryCommand({ repositoryName }));
}, 120_000);

afterAll(async () => {
  try {
    if (client) await client.send(new DeleteRepositoryCommand({ repositoryName, force: true }));
  } finally {
    client?.destroy();
    await ministack?.stop();
  }
});

test('lists stored images, deletes tags and digests beyond one ECR batch, and decodes registry authorization', async () => {
  const tags = Array.from({ length: 101 }, (_, index) => `version-${index}`);
  // Metadata only: no registry push, image layer upload or Docker daemon is impersonated.
  for (let start = 0; start < tags.length; start += 20) {
    await Promise.all(
      tags.slice(start, start + 20).map((imageTag) =>
        client.send(
          new PutImageCommand({
            repositoryName,
            imageTag,
            imageManifest: JSON.stringify({
              schemaVersion: 2,
              mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
              config: {
                mediaType: 'application/vnd.docker.container.image.v1+json',
                size: 1,
                digest: `sha256:${createHash('sha256').update(imageTag).digest('hex')}`
              },
              layers: []
            })
          })
        )
      )
    );
  }
  const listed = await ecr.listImages(repositoryName);
  expect(
    listed
      .map((image) => image.imageTag)
      .filter(Boolean)
      .sort()
  ).toEqual([...tags].sort());
  const last = await client.send(new DescribeImagesCommand({ repositoryName, imageIds: [{ imageTag: tags[100] }] }));
  const lastDigest = last.imageDetails?.[0]?.imageDigest;
  expect(lastDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  await ecr.deleteImages(repositoryName, tags.slice(0, 100), [lastDigest!]);
  expect((await client.send(new ListImagesCommand({ repositoryName }))).imageIds).toEqual([]);
  await ecr.deleteImages(repositoryName, [], []);
  const authorization = await ecr.getAuthorization();
  expect(authorization.user).toBe('AWS');
  expect(authorization.password).toBe('ministack-auth-token');
  expect(authorization.proxyEndpoint).toContain('.dkr.ecr.');
}, 120_000);
