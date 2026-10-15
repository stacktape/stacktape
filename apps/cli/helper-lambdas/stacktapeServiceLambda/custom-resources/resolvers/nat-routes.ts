import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { DescribeRouteTablesCommand, EC2Client, ReplaceRouteCommand } from '@aws-sdk/client-ec2';

const INTERNET_CIDR = '0.0.0.0/0';

/**
 * Puts every private route table back on its home NAT interface at the end of a deploy.
 *
 * The failover handler moves routes between zones while instances are replaced, and CloudFormation only rewrites a
 * route whose template properties changed, so a route moved during a deploy would otherwise stay on the other zone's
 * interface, which the same deploy may remove (ha-ec2 → ec2). This runs after the zones' Auto Scaling groups have
 * signalled, so the home instances are verified at that moment.
 */
export const natRoutes: ServiceLambdaResolver<StpServiceCustomResourceProperties['natRoutes']> = async (
  properties,
  _previousProperties,
  operation
) => {
  if (operation === 'Delete') return { data: {}, physicalResourceId: 'nat-routes' };
  const ec2 = new EC2Client({ region: process.env.AWS_REGION });
  const routeTableIds = properties.routes.map(({ routeTableId }) => routeTableId as string);
  const { RouteTables } = await ec2.send(new DescribeRouteTablesCommand({ RouteTableIds: routeTableIds }));
  for (const { routeTableId, networkInterfaceId } of properties.routes) {
    const current = RouteTables?.find(({ RouteTableId }) => RouteTableId === routeTableId)?.Routes?.find(
      ({ DestinationCidrBlock }) => DestinationCidrBlock === INTERNET_CIDR
    )?.NetworkInterfaceId;
    if (current === networkInterfaceId) continue;
    console.info(`[nat-routes] ${String(routeTableId)}: ${current ?? 'none'} -> ${String(networkInterfaceId)}`);
    await ec2.send(
      new ReplaceRouteCommand({
        RouteTableId: routeTableId as string,
        DestinationCidrBlock: INTERNET_CIDR,
        NetworkInterfaceId: networkInterfaceId as string
      })
    );
  }
  return { data: {}, physicalResourceId: 'nat-routes' };
};
