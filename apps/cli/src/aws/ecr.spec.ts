import { afterAll, afterEach, expect, spyOn, test } from 'bun:test';
import { ECRClient } from '@aws-sdk/client-ecr';
import { createHash } from 'node:crypto';
import { AwsEcr } from './ecr';
import { ExpectedError } from '@utils/errors';

const digestOf = (bytes: string) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const config = '{"architecture":"amd64","os":"linux"}';
const layer = 'compressed filesystem bytes';
const descriptor = (bytes: string) => ({ digest: digestOf(bytes), size: Buffer.byteLength(bytes) });
const manifest = JSON.stringify({
  schemaVersion: 2,
  mediaType: 'application/vnd.oci.image.manifest.v1+json',
  config: descriptor(config),
  layers: [descriptor(layer)]
});
const digest = digestOf(manifest);
const input = { repositoryName: 'stack-images', sourceRepository: 'docker/library/busybox', digest, tag: 'drain-pin' };
const originalFetch = globalThis.fetch;
const fetchSpy = spyOn(globalThis, 'fetch');
afterAll(() => fetchSpy.mockRestore());
afterEach(() => fetchSpy.mockReset());

const registry = (cached = false, races = false, missingRepository = false) => {
  const operations: { operation: string; body: Record<string, unknown> }[] = [];
  const client = new ECRClient({
    region: 'eu-west-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    requestHandler: {
      async handle(request) {
        const operation = request.headers['x-amz-target']!.split('.').at(-1)!;
        const body: Record<string, unknown> = JSON.parse(
          typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body)
        );
        operations.push({ operation, body });
        const result =
          operation === 'BatchGetImage'
            ? cached
              ? { images: [{ imageId: { imageDigest: digest } }] }
              : { failures: [{ failureCode: 'ImageNotFound' }] }
            : operation === 'InitiateLayerUpload'
              ? { uploadId: 'upload-id' }
              : {};
        const exception = missingRepository
          ? 'RepositoryNotFoundException'
          : races && operation === 'CompleteLayerUpload'
            ? 'LayerAlreadyExistsException'
            : races && operation === 'PutImage'
              ? 'ImageAlreadyExistsException'
              : undefined;
        return {
          response: {
            statusCode: exception ? 400 : 200,
            headers: { 'content-type': 'application/x-amz-json-1.1' },
            body: Buffer.from(JSON.stringify(exception ? { __type: exception, message: exception } : result))
          }
        };
      }
    }
  });
  const ecr = new AwsEcr({
    createClient: () => client,
    getErrorHandler: () => (error) => {
      throw error;
    }
  });
  return { ecr, operations };
};

const serve = (corruptLayer = false, manifestBody = manifest) => {
  fetchSpy.mockImplementation(
    Object.assign(
      async (url: Parameters<typeof fetch>[0]) => {
        const path = String(url);
        if (path.includes('/token/')) return Response.json({ token: 'test-token' });
        if (path.includes('/manifests/')) return new Response(manifestBody);
        if (path.endsWith(digestOf(config))) return new Response(config);
        return new Response(corruptLayer ? 'corrupt' : layer);
      },
      { preconnect: originalFetch.preconnect }
    )
  );
};

test('a cached private digest deploys without contacting the public registry or uploading layers', async () => {
  const { ecr, operations } = registry(true);
  fetchSpy.mockImplementation(
    Object.assign(
      async () => {
        throw new Error('public registry unavailable');
      },
      { preconnect: originalFetch.preconnect }
    )
  );
  await ecr.copyPublicImage(input);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(operations.map(({ operation }) => operation)).toEqual(['BatchGetImage']);
});

test('registry copy uploads config and layer bytes before publishing the exact pinned manifest', async () => {
  const { ecr, operations } = registry();
  serve();
  await ecr.copyPublicImage(input);
  const uploaded = operations.filter(({ operation }) => operation === 'UploadLayerPart');
  expect(uploaded.map(({ body }) => Buffer.from(String(body.layerPartBlob), 'base64').toString())).toEqual([
    config,
    layer
  ]);
  expect(operations.at(-1)).toEqual({
    operation: 'PutImage',
    body: {
      repositoryName: input.repositoryName,
      imageTag: input.tag,
      imageDigest: digest,
      imageManifest: manifest,
      imageManifestMediaType: 'application/vnd.oci.image.manifest.v1+json'
    }
  });
});

test('a corrupted public layer cannot be published into the private repository', async () => {
  const { ecr, operations } = registry();
  serve(true);
  await expect(ecr.copyPublicImage(input)).rejects.toThrow('pinned SHA-256');
  expect(operations.some(({ operation }) => operation === 'PutImage')).toBe(false);
});

test('a tampered manifest is rejected before any blob upload', async () => {
  const { ecr, operations } = registry();
  serve(false, manifest + ' ');
  await expect(ecr.copyPublicImage(input)).rejects.toThrow('pinned SHA-256');
  expect(operations.map(({ operation }) => operation)).toEqual(['BatchGetImage']);
});

test('a blob whose verified bytes differ from the manifest size cannot be published', async () => {
  const { ecr, operations } = registry();
  const wrongSizeManifest = JSON.stringify({
    ...JSON.parse(manifest),
    config: { ...descriptor(config), size: Buffer.byteLength(config) + 1 }
  });
  serve(false, wrongSizeManifest);
  await expect(ecr.copyPublicImage({ ...input, digest: digestOf(wrongSizeManifest) })).rejects.toThrow('blob size');
  expect(operations.some(({ operation }) => operation === 'InitiateLayerUpload' || operation === 'PutImage')).toBe(
    false
  );
});

test('concurrent layer and image publication succeeds when another copy finishes first', async () => {
  const { ecr, operations } = registry(false, true);
  serve();
  await ecr.copyPublicImage(input);
  expect(operations.filter(({ operation }) => operation === 'CompleteLayerUpload')).toHaveLength(2);
  expect(operations.at(-1)?.operation).toBe('PutImage');
});

test('a missing private repository reports an actionable expected error', async () => {
  const { ecr } = registry(false, false, true);
  try {
    await ecr.copyPublicImage(input);
    throw new Error('Copy unexpectedly succeeded');
  } catch (error) {
    expect(error).toBeInstanceOf(ExpectedError);
    expect((error as ExpectedError).message).toContain(input.repositoryName);
    expect((error as ExpectedError).hint).toContain('Deploy again');
    expect((error as ExpectedError).cause).toBeInstanceOf(Error);
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

for (const failure of ['503', '429', 'network', 'body']) {
  test(`public ECR ${failure} failures recover within three attempts`, async () => {
    const { ecr, operations } = registry();
    serve();
    const healthyFetch = fetchSpy.getMockImplementation()!;
    let attempts = 0;
    fetchSpy.mockImplementation(
      Object.assign(
        async (...args: Parameters<typeof fetch>) => {
          // Exercise token, manifest and blob requests independently.
          attempts++;
          if (attempts % 3 !== 0) {
            if (failure === 'network') throw new TypeError('connection reset');
            if (failure === 'body') {
              return new Response(
                new ReadableStream({
                  start(controller) {
                    controller.error(new Error('body interrupted'));
                  }
                })
              );
            }
            return new Response('', { status: Number(failure) });
          }
          return healthyFetch(...args);
        },
        { preconnect: originalFetch.preconnect }
      )
    );
    await ecr.copyPublicImage(input);
    expect(attempts).toBe(12);
    expect(operations.at(-1)?.operation).toBe('PutImage');
  }, 20_000);
}

for (const status of [403, 503]) {
  test(`public ECR ${status} stops the deploy with a retry hint`, async () => {
    const { ecr, operations } = registry();
    fetchSpy.mockImplementation(
      Object.assign(async () => new Response('', { status }), {
        preconnect: originalFetch.preconnect
      })
    );
    await expect(ecr.copyPublicImage(input)).rejects.toBeInstanceOf(ExpectedError);
    expect(fetchSpy).toHaveBeenCalledTimes(status === 403 ? 1 : 3);
    expect(operations.map(({ operation }) => operation)).toEqual(['BatchGetImage']);
  });
}
