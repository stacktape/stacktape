import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { EC2Client } from '@aws-sdk/client-ec2';
import { natRoutes } from './nat-routes';

/** The reconcile only touches tables that drifted from their home interface, and never touches anything on Delete. */
describe('natRoutes', () => {
  const sends: { name: string; input: Record<string, unknown> }[] = [];
  afterEach(() => {
    sends.length = 0;
  });

  const stubEc2 = () =>
    spyOn(EC2Client.prototype, 'send').mockImplementation(
      async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
        sends.push({ name: command.constructor.name, input: command.input });
        if (command.constructor.name === 'DescribeRouteTablesCommand') {
          return {
            RouteTables: [
              { RouteTableId: 'rtb-0', Routes: [{ DestinationCidrBlock: '0.0.0.0/0', NetworkInterfaceId: 'eni-1' }] },
              { RouteTableId: 'rtb-1', Routes: [{ DestinationCidrBlock: '0.0.0.0/0', NetworkInterfaceId: 'eni-1' }] }
            ]
          };
        }
        return {};
      }
    );

  test('moves only the drifted table back home', async () => {
    const stub = stubEc2();
    try {
      const result = await natRoutes(
        {
          routes: [
            { routeTableId: 'rtb-0', networkInterfaceId: 'eni-0' },
            { routeTableId: 'rtb-1', networkInterfaceId: 'eni-1' }
          ],
          launchTemplateVersions: ['1']
        },
        undefined,
        'Update'
      );
      expect(result.physicalResourceId).toBe('nat-routes');
      expect(sends.map(({ name }) => name)).toEqual(['DescribeRouteTablesCommand', 'ReplaceRouteCommand']);
      expect(sends[1].input).toEqual({
        RouteTableId: 'rtb-0',
        DestinationCidrBlock: '0.0.0.0/0',
        NetworkInterfaceId: 'eni-0'
      });
    } finally {
      stub.mockRestore();
    }
  });

  test('does nothing on Delete', async () => {
    const stub = stubEc2();
    try {
      await natRoutes(
        { routes: [{ routeTableId: 'rtb-0', networkInterfaceId: 'eni-0' }], launchTemplateVersions: ['1'] },
        undefined,
        'Delete'
      );
      expect(sends).toEqual([]);
    } finally {
      stub.mockRestore();
    }
  });
});
