import type { _InstanceType, EC2Client, InstanceTypeInfo, RouteTable, Subnet, Vpc } from '@aws-sdk/client-ec2';
import {
  DescribeInstanceTypesCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand
} from '@aws-sdk/client-ec2';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsEc2 {
  readonly #createClient: () => EC2Client;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => EC2Client;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  getInstanceTypes = async ({ instanceTypes }: { instanceTypes: _InstanceType[] }) => {
    const errorHandler = this.#getErrorHandler('Could not list EC2 instance types.');
    const result: InstanceTypeInfo[] = [];
    let { InstanceTypes, NextToken } = await this.#createClient()
      .send(new DescribeInstanceTypesCommand({ InstanceTypes: instanceTypes }))
      .catch(errorHandler);
    result.push(...(InstanceTypes || []));
    while (NextToken) {
      ({ InstanceTypes, NextToken } = await this.#createClient()
        .send(new DescribeInstanceTypesCommand({ InstanceTypes: instanceTypes, NextToken }))
        .catch(errorHandler));
      result.push(...(InstanceTypes || []));
    }
    return result;
  };

  describeSubnets = async (params: { subnetIds?: string[]; vpcId?: string }): Promise<Subnet[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe subnets.');
    const filters = params.vpcId ? [{ Name: 'vpc-id', Values: [params.vpcId] }] : undefined;
    const result = await this.#createClient()
      .send(new DescribeSubnetsCommand({ SubnetIds: params.subnetIds, Filters: filters }))
      .catch(errorHandler);
    return result.Subnets || [];
  };

  describeRouteTables = async (vpcId: string): Promise<RouteTable[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe route tables.');
    const result = await this.#createClient()
      .send(new DescribeRouteTablesCommand({ Filters: [{ Name: 'vpc-id', Values: [vpcId] }] }))
      .catch(errorHandler);
    return result.RouteTables || [];
  };

  describeVpcs = async (vpcIds: string[]): Promise<Vpc[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe VPCs.');
    const result = await this.#createClient()
      .send(new DescribeVpcsCommand({ VpcIds: vpcIds }))
      .catch(errorHandler);
    return result.Vpcs || [];
  };
}
