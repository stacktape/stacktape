import type { CloudFrontClient, DistributionSummary } from '@aws-sdk/client-cloudfront';
import {
  CreateInvalidationCommand,
  GetInvalidationCommand,
  ListDistributionsCommand
} from '@aws-sdk/client-cloudfront';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import { resourceURIs } from 'src/utils/aws-resource-uris';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsCloudFront {
  readonly #createClient: () => CloudFrontClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #region: SupportedAWSRegion;
  readonly #wait: (milliseconds: number) => Promise<unknown>;

  constructor({
    createClient,
    getErrorHandler,
    region,
    wait
  }: {
    createClient: () => CloudFrontClient;
    getErrorHandler: ErrorHandlerFactory;
    region: SupportedAWSRegion;
    wait: (milliseconds: number) => Promise<unknown>;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#region = region;
    this.#wait = wait;
  }

  invalidateCache = async ({
    distributionId,
    invalidatePaths
  }: {
    distributionId: string;
    invalidatePaths: string[];
  }) => {
    const errorHandler = this.#getErrorHandler('Invalidation of CloudFront CDN cache has failed.');
    const {
      Invalidation: { Id }
    } = await this.#createClient()
      .send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `stacktape_invalidation${Date.now()}`,
            Paths: { Quantity: invalidatePaths.length, Items: invalidatePaths }
          }
        })
      )
      .catch(errorHandler);
    await this.#wait(1500);
    // Confirm that AWS accepted the invalidation. Completion is intentionally not awaited.
    await this.#createClient()
      .send(new GetInvalidationCommand({ DistributionId: distributionId, Id }))
      .catch(errorHandler);
    return distributionId;
  };

  findDistributionsForBucket = async ({ bucketName }: { bucketName: string }) => {
    const bucketDomainName = resourceURIs.bucket({ bucketName, region: this.#region });
    const errorHandler = this.#getErrorHandler('Failed to fetch CloudFront distribution ids.');
    const result: DistributionSummary[][] = [];

    let {
      DistributionList: { Items, NextMarker }
    } = await this.#createClient().send(new ListDistributionsCommand({})).catch(errorHandler);
    result.push(Items);
    while (NextMarker) {
      ({
        DistributionList: { Items, NextMarker }
      } = await this.#createClient()
        .send(new ListDistributionsCommand({ Marker: NextMarker }))
        .catch(errorHandler));
      result.push(Items);
    }

    return result.flat().filter((item) =>
      item?.Origins.Items.find((originItem) => {
        return originItem.DomainName === bucketDomainName;
      })
    );
  };
}
