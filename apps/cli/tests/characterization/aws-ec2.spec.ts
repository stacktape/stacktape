import { describe, expect, test } from 'bun:test';
import type { EC2Client } from '@aws-sdk/client-ec2';
import {
  DescribeInstanceTypesCommand,
  DescribeRouteTablesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand
} from '@aws-sdk/client-ec2';
import { AwsEc2 } from '../../src/aws/ec2';

type Send = EC2Client['send'];

const ec2With = (send: Send) =>
  new AwsEc2({
    createClient: () => ({ send }) as EC2Client,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS EC2 discovery', () => {
  test('paginates instance-type metadata while retaining the requested type filter', async () => {
    const requests: DescribeInstanceTypesCommand[] = [];
    const ec2 = ec2With((async (command: DescribeInstanceTypesCommand) => {
      requests.push(command);
      return command.input.NextToken
        ? { InstanceTypes: [{ InstanceType: 'm7g.large', VCpuInfo: { DefaultVCpus: 2 } }] }
        : {
            InstanceTypes: [{ InstanceType: 't3.micro', VCpuInfo: { DefaultVCpus: 2 } }],
            NextToken: 'page-2'
          };
    }) as Send);

    await expect(ec2.getInstanceTypes({ instanceTypes: ['t3.micro', 'm7g.large'] })).resolves.toHaveLength(2);
    expect(requests.map(({ input }) => input)).toEqual([
      { InstanceTypes: ['t3.micro', 'm7g.large'] },
      { InstanceTypes: ['t3.micro', 'm7g.large'], NextToken: 'page-2' }
    ]);
  });

  test('maps VPC, subnet, and route-table discovery to their established filters', async () => {
    const requests: (DescribeRouteTablesCommand | DescribeSubnetsCommand | DescribeVpcsCommand)[] = [];
    const ec2 = ec2With((async (command: (typeof requests)[number]) => {
      requests.push(command);
      if (command instanceof DescribeSubnetsCommand) {
        return { Subnets: [{ SubnetId: 'subnet-1', VpcId: 'vpc-1' }] };
      }
      if (command instanceof DescribeRouteTablesCommand) {
        return { RouteTables: [{ RouteTableId: 'rtb-1', VpcId: 'vpc-1' }] };
      }
      return { Vpcs: [{ VpcId: 'vpc-1' }] };
    }) as Send);

    await expect(ec2.describeSubnets({ subnetIds: ['subnet-1'], vpcId: 'vpc-1' })).resolves.toHaveLength(1);
    await expect(ec2.describeRouteTables('vpc-1')).resolves.toHaveLength(1);
    await expect(ec2.describeVpcs(['vpc-1'])).resolves.toHaveLength(1);

    expect(requests.map(({ input }) => input)).toEqual([
      {
        Filters: [{ Name: 'vpc-id', Values: ['vpc-1'] }],
        SubnetIds: ['subnet-1']
      },
      { Filters: [{ Name: 'vpc-id', Values: ['vpc-1'] }] },
      { VpcIds: ['vpc-1'] }
    ]);
  });

  test('omits the VPC filter for subnet-ID-only lookup and normalizes absent collections', async () => {
    const requests: DescribeSubnetsCommand[] = [];
    const ec2 = ec2With((async (command: DescribeSubnetsCommand) => {
      requests.push(command);
      return {};
    }) as Send);

    await expect(ec2.describeSubnets({ subnetIds: ['subnet-1'] })).resolves.toEqual([]);
    expect(requests[0].input).toEqual({ Filters: undefined, SubnetIds: ['subnet-1'] });
  });
});
