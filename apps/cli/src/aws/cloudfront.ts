import type { CloudFrontClient, DistributionSummary } from '@aws-sdk/client-cloudfront';
import {
  CreateInvalidationCommand,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand
} from '@aws-sdk/client-cloudfront';
import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import { resourceURIs } from 'src/utils/aws-resource-uris';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsCloudFront {
  readonly #createClient: () => CloudFrontClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #region: SupportedAWSRegion;

  constructor({
    createClient,
    getErrorHandler,
    region
  }: {
    createClient: () => CloudFrontClient;
    getErrorHandler: ErrorHandlerFactory;
    region: SupportedAWSRegion;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#region = region;
  }

  invalidateCache = async ({
    distributionId,
    invalidatePaths
  }: {
    distributionId: string;
    invalidatePaths: string[];
  }) => {
    const errorHandler = this.#getErrorHandler('Invalidation of CloudFront CDN cache has failed.');
    // CloudFront accepted the invalidation when it returns it. Completion is intentionally not awaited.
    await this.#createClient()
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
    return distributionId;
  };

  /**
   * Turns a distribution on or off. Resolves to false when it already was in that state, so nothing changed.
   * CloudFront applies the change at every edge location over the next minutes (the distribution reads InProgress).
   */
  setDistributionEnabled = async ({ distributionId, enabled }: { distributionId: string; enabled: boolean }) => {
    const client = this.#createClient();
    const { DistributionConfig, ETag } = await client.send(new GetDistributionConfigCommand({ Id: distributionId }));
    if (!DistributionConfig || DistributionConfig.Enabled === enabled) {
      return false;
    }
    await client.send(
      new UpdateDistributionCommand({
        Id: distributionId,
        IfMatch: ETag,
        DistributionConfig: { ...DistributionConfig, Enabled: enabled }
      })
    );
    return true;
  };

  /** Whether the distribution serves no requests: it is disabled, or it no longer exists. */
  isDistributionDisabled = async ({ distributionId }: { distributionId: string }) => {
    try {
      const { DistributionConfig } = await this.#createClient().send(
        new GetDistributionConfigCommand({ Id: distributionId })
      );
      return DistributionConfig?.Enabled === false;
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchDistribution') return true;
      throw error;
    }
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
