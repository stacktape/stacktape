import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  SetInstanceProtectionCommand
} from '@aws-sdk/client-auto-scaling';

const autoscalingClient = new AutoScalingClient({});

export const forceDeleteAsg: ServiceLambdaResolver<StpServiceCustomResourceProperties['forceDeleteAsg']> = async (
  currentProps,
  _previousProps,
  operation,
  _physicalResourceId
) => {
  if (operation === 'Delete') {
    // we are not force deleting ASG no more. Instead we remove scale in protection for instances in ASG
    const {
      AutoScalingGroups: [asgInfo]
    } = await autoscalingClient.send(
      new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [currentProps.asgName as string] })
    );

    const instanceIds = asgInfo.Instances.map(({ InstanceId }) => InstanceId);

    await autoscalingClient.send(
      new SetInstanceProtectionCommand({
        AutoScalingGroupName: currentProps.asgName as string,
        InstanceIds: instanceIds,
        ProtectedFromScaleIn: false
      })
    );

    // console.info(`Force deleting ASG (${currentProps.asgName})...`);
    // try {
    //   await autoscalingClient.send(
    //     new DeleteAutoScalingGroupCommand({ AutoScalingGroupName: currentProps.asgName as string, ForceDelete: true })
    //   );
    //   console.info(`Force deleting ASG (${currentProps.asgName}) started - SUCCESS`);
    // } catch (err) {
    //   console.error(`Force delete of ASG failed: ${err}`);
    // }
  }
  return { data: {}, physicalResourceId: `${currentProps.asgName}-fd` };
};
