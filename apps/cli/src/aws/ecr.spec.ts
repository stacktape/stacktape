import { afterAll, afterEach, expect, spyOn, test } from 'bun:test';
import { ECRClient } from '@aws-sdk/client-ecr';
import { createHash } from 'node:crypto';
import { AwsEcr } from './ecr';

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

const registry = (cached = false) => {
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
        return {
          response: {
            statusCode: 200,
            headers: { 'content-type': 'application/x-amz-json-1.1' },
            body: Buffer.from(JSON.stringify(result))
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

const serve = (corruptLayer = false) => {
  fetchSpy.mockImplementation(
    Object.assign(
      async (url: Parameters<typeof fetch>[0]) => {
        const path = String(url);
        if (path.includes('/token/')) return Response.json({ token: 'test-token' });
        if (path.includes('/manifests/')) return new Response(manifest);
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
