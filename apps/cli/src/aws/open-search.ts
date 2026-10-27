import type { OpenSearchClient, OpenSearchPartitionInstanceType } from '@aws-sdk/client-opensearch';
import {
  DeleteDomainCommand,
  DescribeDomainCommand,
  DescribeInstanceTypeLimitsCommand
} from '@aws-sdk/client-opensearch';

export class AwsOpenSearch {
  readonly #createClient: () => OpenSearchClient;

  constructor({ createClient }: { createClient: () => OpenSearchClient }) {
    this.#createClient = createClient;
  }

  getInstanceTypeLimits = async ({
    instanceType,
    openSearchVersion
  }: {
    instanceType: OpenSearchPartitionInstanceType;
    openSearchVersion: string;
  }) => {
    return this.#createClient().send(
      new DescribeInstanceTypeLimitsCommand({
        InstanceType: instanceType,
        EngineVersion: `OpenSearch_${openSearchVersion}`
      })
    );
  };

  getDomain = async ({ domainName }: { domainName: string }) => {
    const response = await this.#createClient().send(new DescribeDomainCommand({ DomainName: domainName }));
    return response.DomainStatus;
  };

  /** Starts deleting a domain and returns at once. AWS errors are passed through unchanged. */
  deleteDomain = async ({ domainName }: { domainName: string }) => {
    const response = await this.#createClient().send(new DeleteDomainCommand({ DomainName: domainName }));
    return response.DomainStatus;
  };
}
