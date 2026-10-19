import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ECRClient, ImageIdentifier } from '@aws-sdk/client-ecr';
import {
  BatchCheckLayerAvailabilityCommand,
  CompleteLayerUploadCommand,
  InitiateLayerUploadCommand,
  UploadLayerPartCommand,
  LayerAlreadyExistsException,
  BatchDeleteImageCommand,
  BatchGetImageCommand,
  GetAuthorizationTokenCommand,
  ImageAlreadyExistsException,
  ListImagesCommand,
  PutImageCommand
} from '@aws-sdk/client-ecr';
import { chunkArray } from '@utils/misc';
import { Buffer } from 'node:buffer';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsEcr {
  readonly #createClient: () => ECRClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => ECRClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  listImages = async (repositoryName: string): Promise<ImageIdentifier[]> => {
    const errorHandler = this.#getErrorHandler(`Failed to list images in ECR repository ${repositoryName}.`);
    const pagedImageIds: ImageIdentifier[][] = [];
    let { nextToken, imageIds } = await this.#createClient()
      .send(new ListImagesCommand({ repositoryName }))
      .catch(errorHandler);
    pagedImageIds.push(imageIds);
    while (nextToken) {
      ({ nextToken, imageIds } = await this.#createClient()
        .send(new ListImagesCommand({ repositoryName, nextToken }))
        .catch(errorHandler));
      pagedImageIds.push(imageIds);
    }
    return pagedImageIds.flat();
  };

  deleteImages = async (repositoryName: string, imageTags: string[], imageDigests: string[]) => {
    const errorHandler = this.#getErrorHandler(
      `Failed to batch delete images with tags/digests: ${imageTags.join(', ')}, ${imageDigests.join(', ')}.`
    );
    const imageIds = [
      ...imageTags.map((tag) => ({ imageTag: tag })),
      ...imageDigests.map((digest) => ({ imageDigest: digest }))
    ];
    if (imageIds.length) {
      for (const imageIdsBatch of chunkArray(imageIds, 100)) {
        await this.#createClient()
          .send(new BatchDeleteImageCommand({ repositoryName, imageIds: imageIdsBatch }))
          .catch(errorHandler);
      }
      return;
    }
    return Promise.resolve();
  };

  /** Adds `targetTag` to the image tagged `sourceTag`, without pulling or pushing it. */
  tagImage = async ({
    repositoryName,
    sourceTag,
    targetTag
  }: {
    repositoryName: string;
    sourceTag: string;
    targetTag: string;
  }) => {
    const errorHandler = this.#getErrorHandler(
      `Failed to tag image ${sourceTag} as ${targetTag} in ${repositoryName}.`
    );
    const { images } = await this.#createClient()
      .send(new BatchGetImageCommand({ repositoryName, imageIds: [{ imageTag: sourceTag }] }))
      .catch(errorHandler);
    const image = images?.[0];
    if (!image?.imageManifest) {
      errorHandler(new Error(`Image ${sourceTag} was not found.`));
    }
    await this.#createClient()
      .send(
        new PutImageCommand({
          repositoryName,
          imageManifest: image.imageManifest,
          imageManifestMediaType: image.imageManifestMediaType,
          imageTag: targetTag
        })
      )
      .catch((error: Error) => {
        // A retried rollback finds the tag already in place.
        if (error instanceof ImageAlreadyExistsException) return;
        errorHandler(error);
      });
  };

  /** Copy a small pinned public image into the deployment repository without a Docker daemon.
   * A matching private tag is a cache hit: no public registry requests or layer transfers on later deploys.
   */
  copyPublicImage = async ({
    repositoryName,
    sourceRepository,
    digest,
    tag
  }: {
    repositoryName: string;
    sourceRepository: string;
    digest: string;
    tag: string;
  }): Promise<void> => {
    const client = this.#createClient();
    const existing = await client.send(new BatchGetImageCommand({ repositoryName, imageIds: [{ imageTag: tag }] }));
    if (existing.images?.[0]?.imageId?.imageDigest === digest) return;
    if (existing.failures?.some(({ failureCode }) => failureCode !== 'ImageNotFound')) {
      throw new Error('Failed to check cached drain image in private ECR.');
    }
    const tokenResponse = await fetch(
      'https://public.ecr.aws/token/?service=public.ecr.aws&scope=repository:' + sourceRepository + ':pull',
      {
        signal: AbortSignal.timeout(60_000)
      }
    );
    if (!tokenResponse.ok) throw new Error(`Drain image registry authorization failed (${tokenResponse.status}).`);
    const { token } = z.object({ token: z.string() }).parse(await tokenResponse.json());
    const read = async (path: string, expectedDigest: string) => {
      const response = await fetch(`https://public.ecr.aws/v2/${sourceRepository}/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.oci.image.manifest.v1+json' },
        signal: AbortSignal.timeout(60_000)
      });
      if (!response.ok) throw new Error(`Drain image download failed (${response.status}).`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== expectedDigest) {
        throw new Error('Drain image download did not match its pinned SHA-256 digest.');
      }
      return bytes;
    };
    const manifestBytes = await read(`manifests/${digest}`, digest);
    const descriptor = z.object({
      digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      size: z
        .number()
        .int()
        .positive()
        .max(10 * 1024 * 1024)
    });
    const manifest = z
      .object({
        schemaVersion: z.literal(2),
        mediaType: z.literal('application/vnd.oci.image.manifest.v1+json'),
        config: descriptor,
        layers: z.array(descriptor).max(10)
      })
      .parse(JSON.parse(manifestBytes.toString()));
    // ECR requires the config blob as well as filesystem layers before accepting the manifest.
    for (const blob of [manifest.config, ...manifest.layers]) {
      const availability = await client.send(
        new BatchCheckLayerAvailabilityCommand({ repositoryName, layerDigests: [blob.digest] })
      );
      if (availability.layers?.some(({ layerAvailability }) => layerAvailability === 'AVAILABLE')) continue;
      const bytes = await read(`blobs/${blob.digest}`, blob.digest);
      if (bytes.length !== blob.size) throw new Error('Drain image blob size did not match its manifest.');
      const { uploadId } = await client.send(new InitiateLayerUploadCommand({ repositoryName }));
      await client.send(
        new UploadLayerPartCommand({
          repositoryName,
          uploadId,
          partFirstByte: 0,
          partLastByte: bytes.length - 1,
          layerPartBlob: bytes
        })
      );
      await client
        .send(new CompleteLayerUploadCommand({ repositoryName, uploadId, layerDigests: [blob.digest] }))
        .catch((error: unknown) => {
          if (!(error instanceof LayerAlreadyExistsException)) throw error;
        });
    }
    await client
      .send(
        new PutImageCommand({
          repositoryName,
          imageTag: tag,
          imageDigest: digest,
          imageManifest: manifestBytes.toString(),
          imageManifestMediaType: manifest.mediaType
        })
      )
      .catch((error: unknown) => {
        if (!(error instanceof ImageAlreadyExistsException)) throw error;
      });
  };

  getAuthorization = async () => {
    const errorHandler = this.#getErrorHandler('Failed to get authorization data for Docker registry from AWS ECR.');
    const getAuthResponse = await this.#createClient().send(new GetAuthorizationTokenCommand({})).catch(errorHandler);
    const { authorizationToken, proxyEndpoint } = getAuthResponse.authorizationData[0];
    const [user, password] = Buffer.from(authorizationToken, 'base64').toString().split(':');
    return { user, password, proxyEndpoint };
  };
}
