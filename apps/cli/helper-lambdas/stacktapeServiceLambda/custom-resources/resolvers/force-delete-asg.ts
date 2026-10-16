import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  SetInstanceProtectionCommand
} from '@aws-sdk/client-auto-scaling';

const autoscalingClient = new AutoScalingClient({});

// SetInstanceProtection accepts at most 50 instance IDs per call.
const MAX_INSTANCES_PER_CALL = 50;

// Instances already leaving the group need no protection change, and AWS can reject the call for them.
const LEAVING_STATE_PREFIXES = ['Terminating', 'Terminated', 'Detaching', 'Detached'];

/**
 * On Delete, removes scale-in protection from the instances in the container workload's Auto Scaling group, so
 * CloudFormation can scale the group in when it deletes it. We no longer force-delete the group itself.
 *
 * An empty group, a group that is already gone and a group already being deleted are all normal during a stack
 * delete and succeed without calling SetInstanceProtection.
 */
export const forceDeleteAsg: ServiceLambdaResolver<StpServiceCustomResourceProperties['forceDeleteAsg']> = async (
  currentProps,
  _previousProps,
  operation,
  _physicalResourceId
) => {
  const asgName = currentProps.asgName as string;
  if (operation === 'Delete') {
    const { AutoScalingGroups } = await autoscalingClient.send(
      new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [asgName] })
    );
    const asg = AutoScalingGroups?.[0];
    if (!asg || asg.Status) {
      console.info(`Auto Scaling group ${asgName} is ${asg ? asg.Status : 'already deleted'}, nothing to unprotect.`);
      return { data: {}, physicalResourceId: `${asgName}-fd` };
    }
    const instanceIds = (asg.Instances ?? [])
      .filter(
        ({ LifecycleState, ProtectedFromScaleIn }) =>
          ProtectedFromScaleIn !== false && !LEAVING_STATE_PREFIXES.some((prefix) => LifecycleState?.startsWith(prefix))
      )
      .map(({ InstanceId }) => InstanceId as string);
    console.info(`Removing scale-in protection from ${instanceIds.length} instance(s) in ${asgName}.`);
    for (let index = 0; index < instanceIds.length; index += MAX_INSTANCES_PER_CALL) {
      await autoscalingClient.send(
        new SetInstanceProtectionCommand({
          AutoScalingGroupName: asgName,
          InstanceIds: instanceIds.slice(index, index + MAX_INSTANCES_PER_CALL),
          ProtectedFromScaleIn: false
        })
      );
    }
  }
  return { data: {}, physicalResourceId: `${asgName}-fd` };
};
