import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { operationReporter } from '@application-services/operation-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { vpcManager } from './index';

afterEach(() => {
  mock.restore();
});

test('a reused VPC gets one subnet per availability zone its public and, when used, private subnets cover', async () => {
  operationReporter.setSilentMode(true);
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'us-east-1' });
  spyOn(awsSdkManager.ec2, 'describeVpcs').mockResolvedValue([{ VpcId: 'vpc-1', CidrBlock: '10.0.0.0/16' }]);
  spyOn(awsSdkManager.ec2, 'describeSubnets').mockResolvedValue(
    [
      ['subnet-public-a1', 'us-east-1a'],
      ['subnet-public-a2', 'us-east-1a'],
      ['subnet-private-b', 'us-east-1b'],
      ['subnet-public-b', 'us-east-1b'],
      ['subnet-public-c', 'us-east-1c'],
      ['subnet-private-d', 'us-east-1d']
    ].map(([SubnetId, AvailabilityZone]) => ({ SubnetId, AvailabilityZone }))
  );
  spyOn(awsSdkManager.ec2, 'describeRouteTables').mockResolvedValue([
    { RouteTableId: 'rtb-main', Associations: [{ Main: true }], Routes: [] },
    {
      RouteTableId: 'rtb-public',
      Associations: ['subnet-public-a1', 'subnet-public-a2', 'subnet-public-b', 'subnet-public-c'].map((SubnetId) => ({
        SubnetId
      })),
      Routes: [{ DestinationCidrBlock: '0.0.0.0/0', GatewayId: 'igw-1' }]
    }
  ]);

  await vpcManager.init({ reuseVpc: { vpcId: 'vpc-1' } });

  // A filesystem's mount targets: EFS allows one per zone, and every zone a workload runs in needs one.
  expect(vpcManager.getSubnetIdPerAvailabilityZone({ includePrivateSubnets: false })).toEqual([
    'subnet-public-a1',
    'subnet-public-b',
    'subnet-public-c'
  ]);
  expect(vpcManager.getSubnetIdPerAvailabilityZone({ includePrivateSubnets: true })).toEqual([
    'subnet-public-a1',
    'subnet-public-b',
    'subnet-public-c',
    'subnet-private-d'
  ]);
});
