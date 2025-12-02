import {
  AcceptVpcPeeringConnectionCommand,
  DescribeVpcPeeringConnectionsCommand,
  EC2Client
} from '@aws-sdk/client-ec2';
import { wait } from '@shared/utils/misc';

const peeringStatusCodes = {
  peeringIsActive: ['active'],
  waitingForConfirmationAction: ['pending-acceptance'],
  waitingForAwsAction: ['initiating-request', 'provisioning'],
  invalidPeeringState: ['deleted', 'deleting', 'expired', 'failed', 'rejected']
};

export const acceptVpcPeeringConnections: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['acceptVpcPeeringConnections']
> = async (demandedVpcPeeringConnections, _previousVpcPeeringConnections, operation) => {
  console.info(
    `Resolver acceptVpcPeeringConnections, event type: ${operation}\n` +
      `Properties: ${JSON.stringify(demandedVpcPeeringConnections, null, 2)}\n` +
      `Previous properties: ${JSON.stringify(_previousVpcPeeringConnections, null, 2)}\n`
  );
  // in this resolver, we are ONLY accepting VPC peering connections
  // deletion of VPC peering connection should be handled on the requester side.
  // that being said, if you want to create VPC peering connection in stacktape,
  // you should create it as cloudformation resource and then use this custom resource resolver to accept the connection.
  // that is also why we do not care about previousVpcPeeringsConnections. Their deletion is out of scope of this resolver.
  if (operation === 'Delete') {
    return { data: {} };
  }
  const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
  if (demandedVpcPeeringConnections.length) {
    const stateOfDemandedVpcPeerings = await ec2Client.send(
      new DescribeVpcPeeringConnectionsCommand({
        VpcPeeringConnectionIds: demandedVpcPeeringConnections.map(
          ({ vpcPeeringConnectionId }) => vpcPeeringConnectionId
        )
      })
    );
    // accept all incoming peerings that were specified in payload
    await Promise.all(
      stateOfDemandedVpcPeerings.VpcPeeringConnections.map(async ({ Status, VpcPeeringConnectionId }) => {
        let peeringStatus = Status;
        let acceptanceRequestSent = false;
        while (!peeringStatusCodes.peeringIsActive.includes(peeringStatus?.Code)) {
          // if peering is in "waiting for aws" type of state we will sleep between 2 and 3 seconds (random jitter to avoid api overload) and then refresh state
          // also if peering is unknown state (sometimes this happens), we will refresh
          if (!peeringStatus || peeringStatusCodes.waitingForAwsAction.includes(peeringStatus.Code)) {
            console.info(`Vpc peering "${VpcPeeringConnectionId}" is in state "${peeringStatus?.Code}". Refreshing...`);
            await wait(Math.random() * 1000 + 2000);
            peeringStatus = (
              await ec2Client.send(
                new DescribeVpcPeeringConnectionsCommand({ VpcPeeringConnectionIds: [VpcPeeringConnectionId] })
              )
            ).VpcPeeringConnections[0].Status;
            continue;
          }
          // if peering is in invalid state, we have nothing to do but throw error
          if (peeringStatusCodes.invalidPeeringState.includes(peeringStatus.Code)) {
            console.error(
              `Vpc peering "${VpcPeeringConnectionId}" is in state "${peeringStatus.Code}" and therefore cannot be accepted.`
            );
            throw new Error(
              `Vpc peering "${VpcPeeringConnectionId}" is in state "${peeringStatus.Code}" and therefore cannot be accepted.`
            );
          }
          // if peering is in state waiting for our acceptance. We will accept
          // if it is still in this state but we have already sent the request, we will simply refresh
          if (peeringStatusCodes.waitingForConfirmationAction.includes(peeringStatus.Code)) {
            if (!acceptanceRequestSent) {
              console.info(
                `Vpc peering "${VpcPeeringConnectionId}" is in state "${peeringStatus.Code}". Sending accept request...`
              );
              await ec2Client.send(new AcceptVpcPeeringConnectionCommand({ VpcPeeringConnectionId }));
              acceptanceRequestSent = true;
            }
            await wait(Math.random() * 1000 + 2000);
            peeringStatus = (
              await ec2Client.send(
                new DescribeVpcPeeringConnectionsCommand({ VpcPeeringConnectionIds: [VpcPeeringConnectionId] })
              )
            ).VpcPeeringConnections[0].Status;
          }
        }
        console.info(`Vpc peering "${VpcPeeringConnectionId}" is in state "${peeringStatus.Code}". SUCCESS`);
        return peeringStatus;
      })
    );
  }

  return { data: {} };
  //
};
