import type { OpenSearchClient, OpenSearchPartitionInstanceType } from '@aws-sdk/client-opensearch';
import { DescribeInstanceTypeLimitsCommand } from '@aws-sdk/client-opensearch';

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
}
