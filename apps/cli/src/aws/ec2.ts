import type {
  _InstanceType,
  EC2Client,
  InstanceTypeInfo,
  NetworkInterface,
  RouteTable,
  SecurityGroup,
  Subnet,
  Vpc,
  VpcEndpoint
} from '@aws-sdk/client-ec2';
import {
  AssociateIamInstanceProfileCommand,
  DescribeInstancesCommand,
  DescribeInstanceTypesCommand,
  DescribeNetworkInterfacesCommand,
  DescribeSecurityGroupsCommand,
  DescribeVpcEndpointsCommand,
  StartInstancesCommand,
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

  describeNetworkInterfaces = async (vpcId: string): Promise<NetworkInterface[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe network interfaces.');
    const result: NetworkInterface[] = [];
    let nextToken: string | undefined;
    do {
      const page = await this.#createClient()
        .send(
          new DescribeNetworkInterfacesCommand({
            Filters: [{ Name: 'vpc-id', Values: [vpcId] }],
            NextToken: nextToken
          })
        )
        .catch(errorHandler);
      result.push(...(page.NetworkInterfaces ?? []));
      nextToken = page.NextToken;
    } while (nextToken);
    return result;
  };

  describeSecurityGroups = async (vpcId: string): Promise<SecurityGroup[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe security groups.');
    const result: SecurityGroup[] = [];
    let nextToken: string | undefined;
    do {
      const page = await this.#createClient()
        .send(
          new DescribeSecurityGroupsCommand({ Filters: [{ Name: 'vpc-id', Values: [vpcId] }], NextToken: nextToken })
        )
        .catch(errorHandler);
      result.push(...(page.SecurityGroups ?? []));
      nextToken = page.NextToken;
    } while (nextToken);
    return result;
  };

  describeVpcEndpoints = async (vpcId: string): Promise<VpcEndpoint[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe VPC endpoints.');
    const result: VpcEndpoint[] = [];
    let nextToken: string | undefined;
    do {
      const page = await this.#createClient()
        .send(new DescribeVpcEndpointsCommand({ Filters: [{ Name: 'vpc-id', Values: [vpcId] }], NextToken: nextToken }))
        .catch(errorHandler);
      result.push(...(page.VpcEndpoints ?? []));
      nextToken = page.NextToken;
    } while (nextToken);
    return result;
  };

  describeVpcs = async (vpcIds: string[]): Promise<Vpc[]> => {
    const errorHandler = this.#getErrorHandler('Could not describe VPCs.');
    const result = await this.#createClient()
      .send(new DescribeVpcsCommand({ VpcIds: vpcIds }))
      .catch(errorHandler);
    return result.Vpcs || [];
  };

  describeInstance = async (instanceId: string) => {
    const errorHandler = this.#getErrorHandler(`Could not describe instance ${instanceId}.`);
    const result = await this.#createClient()
      .send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }))
      .catch(errorHandler);
    return result.Reservations?.[0]?.Instances?.[0];
  };

  /** Attaches an instance profile to an instance that has none. An instance that has one already is left as it is. */
  associateInstanceProfile = async ({
    instanceId,
    instanceProfileName
  }: {
    instanceId: string;
    instanceProfileName: string;
  }) => {
    const errorHandler = this.#getErrorHandler(`Could not attach instance profile ${instanceProfileName}.`);
    await this.#createClient()
      .send(
        new AssociateIamInstanceProfileCommand({
          InstanceId: instanceId,
          IamInstanceProfile: { Name: instanceProfileName }
        })
      )
      .catch((error: Error) => {
        // Another session attached it meanwhile.
        if (error.name === 'IncorrectState' && /existing association/i.test(error.message)) return;
        return errorHandler(error);
      });
  };

  startInstance = async (instanceId: string) => {
    const errorHandler = this.#getErrorHandler(`Could not start instance ${instanceId}.`);
    await this.#createClient()
      .send(new StartInstancesCommand({ InstanceIds: [instanceId] }))
      .catch(errorHandler);
  };
}
