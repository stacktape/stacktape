/**
 * Dev box control for the prototype measurements.
 *   bun box.ts idle [--min-idle-seconds N]   idle-check stand-in: scale to 0 when no laptop is connected
 *   bun box.ts wait-empty                     wait until the group has no instances
 *   bun box.ts status
 * The product version runs the idle check in the stack's service Lambda (it already runs every minute for NAT failover).
 */
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  SetDesiredCapacityCommand
} from '@aws-sdk/client-auto-scaling';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getNatInstanceHeartbeatParameterName } from '@stacktape/naming/ssm-parameter-paths';
import { assertAccount, record, REGION, stackName } from './lib';

await assertAccount();
const stack = stackName('box');
const groupName = awsResourceNames.natInstanceAutoscalingGroup({ stackName: stack, azIndex: 0 });
const autoScaling = new AutoScalingClient({ region: REGION });
const ssm = new SSMClient({ region: REGION });
const group = async () =>
  (await autoScaling.send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [groupName] }))).AutoScalingGroups![0];
const heartbeat = async () => {
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: getNatInstanceHeartbeatParameterName({ stackName: stack, region: REGION, azIndex: 0 }) })
  );
  return JSON.parse(Parameter?.Value ?? '{}');
};
const [command] = process.argv.slice(2);
const minIdle = Number(process.argv[process.argv.indexOf('--min-idle-seconds') + 1] ?? 0) || 0;

if (command === 'status') {
  const g = await group();
  console.log(JSON.stringify({ desired: g.DesiredCapacity, min: g.MinSize, instances: g.Instances?.map((i) => [i.InstanceId, i.LifecycleState]), heartbeat: await heartbeat() }));
} else if (command === 'idle') {
  const hb = await heartbeat();
  const idleFor = Date.now() / 1000 - (hb.relay?.lastActiveAt ?? 0);
  const idle = hb.relay && hb.relay.clients === 0 && idleFor >= minIdle;
  console.log(`relay clients ${hb.relay?.clients}, idle for ${idleFor.toFixed(0)} s -> ${idle ? 'scale to 0' : 'keep'}`);
  if (idle) {
    await autoScaling.send(new SetDesiredCapacityCommand({ AutoScalingGroupName: groupName, DesiredCapacity: 0 }));
    record('box-timings.jsonl', { phase: 'idle-scale-to-zero', idleFor });
  }
} else if (command === 'wait-empty') {
  const start = Date.now();
  while ((await group()).Instances?.length) await new Promise((r) => setTimeout(r, 2000));
  record('box-timings.jsonl', { phase: 'group-empty', waitedS: (Date.now() - start) / 1000 });
  console.log(`group empty after ${((Date.now() - start) / 1000).toFixed(1)} s`);
}
