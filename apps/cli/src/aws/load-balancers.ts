import type { ElasticLoadBalancingV2Client, LoadBalancer } from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  DeleteLoadBalancerCommand,
  DescribeLoadBalancerAttributesCommand,
  DescribeLoadBalancersCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';

const isNotFound = (error: unknown) => error instanceof Error && error.name === 'LoadBalancerNotFoundException';

export class AwsLoadBalancers {
  readonly #createClient: () => ElasticLoadBalancingV2Client;

  constructor({ createClient }: { createClient: () => ElasticLoadBalancingV2Client }) {
    this.#createClient = createClient;
  }

  /** The load balancer with its deletion protection setting, or undefined when it does not exist. */
  getLoadBalancer = async ({
    loadBalancerArn
  }: {
    loadBalancerArn: string;
  }): Promise<(LoadBalancer & { deletionProtection: boolean }) | undefined> => {
    try {
      const client = this.#createClient();
      const [{ LoadBalancers }, { Attributes }] = await Promise.all([
        client.send(new DescribeLoadBalancersCommand({ LoadBalancerArns: [loadBalancerArn] })),
        client.send(new DescribeLoadBalancerAttributesCommand({ LoadBalancerArn: loadBalancerArn }))
      ]);
      const loadBalancer = LoadBalancers?.[0];
      if (!loadBalancer) return undefined;
      const protection = Attributes?.find(({ Key }) => Key === 'deletion_protection.enabled')?.Value;
      return { ...loadBalancer, deletionProtection: protection !== 'false' };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  };

  /** Starts deleting a load balancer with its listeners and returns at once. AWS errors are passed through unchanged. */
  deleteLoadBalancer = async ({ loadBalancerArn }: { loadBalancerArn: string }) => {
    await this.#createClient().send(new DeleteLoadBalancerCommand({ LoadBalancerArn: loadBalancerArn }));
  };

  /** Whether the load balancer still exists. A load balancer that is being deleted still exists. */
  exists = async ({ loadBalancerArn }: { loadBalancerArn: string }) => {
    try {
      const { LoadBalancers } = await this.#createClient().send(
        new DescribeLoadBalancersCommand({ LoadBalancerArns: [loadBalancerArn] })
      );
      return !!LoadBalancers?.length;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  };
}
