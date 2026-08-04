import type { ECRClient, ImageIdentifier } from '@aws-sdk/client-ecr';
import { BatchDeleteImageCommand, GetAuthorizationTokenCommand, ListImagesCommand } from '@aws-sdk/client-ecr';
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

  getAuthorization = async () => {
    const errorHandler = this.#getErrorHandler('Failed to get authorization data for Docker registry from AWS ECR.');
    const getAuthResponse = await this.#createClient().send(new GetAuthorizationTokenCommand({})).catch(errorHandler);
    const { authorizationToken, proxyEndpoint } = getAuthResponse.authorizationData[0];
    const [user, password] = Buffer.from(authorizationToken, 'base64').toString().split(':');
    return { user, password, proxyEndpoint };
  };
}
