import {
  DeregisterTargetsCommand,
  DescribeTargetHealthCommand,
  ElasticLoadBalancingV2Client,
  ModifyTargetGroupAttributesCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { getError } from '@shared/utils/misc';

const elbv2Client = new ElasticLoadBalancingV2Client({});

export const deregisterTargets: ServiceLambdaResolver<StpServiceCustomResourceProperties['deregisterTargets']> = async (
  currentProps,
  _previousProps,
  operation,
  _physicalResourceId
) => {
  if (operation !== 'Delete') {
    return { data: {}, physicalResourceId: 'deregister-targets' };
  }

  const targetGroupArns = (currentProps?.targetGroupArns || []).filter(Boolean) as string[];
  if (!targetGroupArns.length) {
    console.info('No target groups provided, skipping deregistration.');
    return { data: {}, physicalResourceId: 'deregister-targets' };
  }

  for (const targetGroupArn of targetGroupArns) {
    if (typeof targetGroupArn !== 'string' || !targetGroupArn.trim()) {
      continue;
    }

    console.info(`Deregistering targets from target group: ${targetGroupArn}`);

    // Best-effort: reduce deregistration delay to speed up draining during deletes.
    try {
      await elbv2Client.send(
        new ModifyTargetGroupAttributesCommand({
          TargetGroupArn: targetGroupArn,
          Attributes: [{ Key: 'deregistration_delay.timeout_seconds', Value: '0' }]
        })
      );
    } catch (err) {
      // Ignore; not all TG types/accounts allow this, and deletion can still proceed.
      console.warn(`Failed to set deregistration delay to 0 for ${targetGroupArn}: ${err}`);
    }

    let targets;
    try {
      const res = await elbv2Client.send(new DescribeTargetHealthCommand({ TargetGroupArn: targetGroupArn }));
      targets = (res.TargetHealthDescriptions || []).map((d) => d.Target).filter(Boolean);
    } catch (err) {
      // If target group is already gone, ignore.
      console.warn(`Failed to describe target health for ${targetGroupArn}: ${err}`);
      continue;
    }

    if (!targets.length) {
      console.info(`No registered targets found for target group: ${targetGroupArn}`);
      continue;
    }

    try {
      await elbv2Client.send(new DeregisterTargetsCommand({ TargetGroupArn: targetGroupArn, Targets: targets }));
      console.info(`Deregistered ${targets.length} targets from target group: ${targetGroupArn}`);
    } catch (err) {
      throw getError({
        type: 'AWS',
        message: `Failed to deregister targets from target group ${targetGroupArn}. Error: ${err}`
      });
    }
  }

  return { data: {}, physicalResourceId: 'deregister-targets' };
};
