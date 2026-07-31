import type { AutoScaling } from '@aws-sdk/client-auto-scaling';
import { DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsAutoScaling {
  readonly #createClient: () => AutoScaling;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => AutoScaling;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  getGroup = async ({ name }: { name: string }) => {
    const errorHandler = this.#getErrorHandler(`Unable to get information for autoscaling group ${name}`);
    const result = await this.#createClient()
      .send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [name] }))
      .catch(errorHandler);
    return result.AutoScalingGroups[0];
  };
}
