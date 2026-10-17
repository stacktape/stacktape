import type { AutoScalingGroup, Instance } from '@aws-sdk/client-auto-scaling';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { AutoScalingClient } from '@aws-sdk/client-auto-scaling';
import { forceDeleteAsg } from './force-delete-asg';

const ASG_NAME = 'stack-web-asg';

const instance = (id: number, LifecycleState: string = 'InService'): Instance =>
  ({ InstanceId: `i-${id}`, LifecycleState, ProtectedFromScaleIn: true }) as Instance;

/** On Delete the resolver must unprotect every protectable instance and must never fail on a normal empty or gone group. */
describe('forceDeleteAsg', () => {
  const sends: { name: string; input: Record<string, unknown> }[] = [];
  afterEach(() => {
    sends.length = 0;
  });

  // Later Describe calls return the last entry of `describes`, so a test can model an instance launching mid-delete.
  const stubAutoScaling = (...describes: AutoScalingGroup[][]) => {
    let describeCount = 0;
    return spyOn(AutoScalingClient.prototype, 'send').mockImplementation((async (command: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }) => {
      sends.push({ name: command.constructor.name, input: command.input });
      if (command.constructor.name === 'DescribeAutoScalingGroupsCommand') {
        return { AutoScalingGroups: describes[Math.min(describeCount++, describes.length - 1)] };
      }
      if (command.constructor.name === 'SetInstanceProtectionCommand') {
        const ids = command.input.InstanceIds as string[];
        if (!ids.length) throw new Error('Must specify at least one instance');
        if (ids.length > 50) throw new Error('Too many instance IDs');
      }
      return {};
    }) as never);
  };

  const runDelete = async (...describes: AutoScalingGroup[][]) => {
    const stub = stubAutoScaling(...describes);
    try {
      return await forceDeleteAsg({ asgName: ASG_NAME }, undefined, 'Delete');
    } finally {
      stub.mockRestore();
    }
  };

  const protectionCalls = () => sends.filter(({ name }) => name === 'SetInstanceProtectionCommand');
  const updateCalls = () => sends.filter(({ name }) => name === 'UpdateAutoScalingGroupCommand');

  test('turns off default protection before listing the instances to unprotect', async () => {
    // i-2 launches after the first Describe, for example as a health-check replacement.
    await runDelete(
      [{ AutoScalingGroupName: ASG_NAME, Instances: [instance(1)] } as AutoScalingGroup],
      [{ AutoScalingGroupName: ASG_NAME, Instances: [instance(1), instance(2, 'Pending')] } as AutoScalingGroup]
    );
    expect(sends.map(({ name }) => name)).toEqual([
      'DescribeAutoScalingGroupsCommand',
      'UpdateAutoScalingGroupCommand',
      'DescribeAutoScalingGroupsCommand',
      'SetInstanceProtectionCommand'
    ]);
    expect(updateCalls()[0].input).toEqual({ AutoScalingGroupName: ASG_NAME, NewInstancesProtectedFromScaleIn: false });
    expect(protectionCalls()[0].input.InstanceIds).toEqual(['i-1', 'i-2']);
  });

  test('succeeds on an empty group without calling SetInstanceProtection', async () => {
    const result = await runDelete([{ AutoScalingGroupName: ASG_NAME, Instances: [] } as AutoScalingGroup]);
    expect(result.physicalResourceId).toBe(`${ASG_NAME}-fd`);
    expect(protectionCalls()).toEqual([]);
  });

  test('succeeds when the group no longer exists', async () => {
    const result = await runDelete([]);
    expect(result.physicalResourceId).toBe(`${ASG_NAME}-fd`);
    expect(updateCalls()).toEqual([]);
    expect(protectionCalls()).toEqual([]);
  });

  test('skips a group that is already being deleted', async () => {
    await runDelete([
      { AutoScalingGroupName: ASG_NAME, Status: 'Delete in progress', Instances: [instance(1)] } as AutoScalingGroup
    ]);
    expect(updateCalls()).toEqual([]);
    expect(protectionCalls()).toEqual([]);
  });

  test('unprotects a large group in batches of 50', async () => {
    const instances = Array.from({ length: 120 }, (_, index) => instance(index));
    await runDelete([{ AutoScalingGroupName: ASG_NAME, Instances: instances } as AutoScalingGroup]);
    const batches = protectionCalls().map(({ input }) => input.InstanceIds as string[]);
    expect(batches.map((ids) => ids.length)).toEqual([50, 50, 20]);
    expect(batches.flat()).toEqual(instances.map(({ InstanceId }) => InstanceId as string));
    expect(protectionCalls().every(({ input }) => input.ProtectedFromScaleIn === false)).toBe(true);
  });

  test('leaves out instances that are already leaving the group', async () => {
    await runDelete([
      {
        AutoScalingGroupName: ASG_NAME,
        Instances: [
          instance(1),
          instance(2, 'Terminating:Wait'),
          instance(3, 'Terminated'),
          instance(4, 'Detaching'),
          instance(5, 'Pending')
        ]
      } as AutoScalingGroup
    ]);
    expect(protectionCalls().map(({ input }) => input)).toEqual([
      { AutoScalingGroupName: ASG_NAME, InstanceIds: ['i-1', 'i-5'], ProtectedFromScaleIn: false }
    ]);
  });

  test('leaves out instances that are already unprotected', async () => {
    await runDelete([
      {
        AutoScalingGroupName: ASG_NAME,
        Instances: [instance(1), { ...instance(2), ProtectedFromScaleIn: false }, instance(3)]
      } as AutoScalingGroup
    ]);
    expect(protectionCalls().map(({ input }) => input)).toEqual([
      { AutoScalingGroupName: ASG_NAME, InstanceIds: ['i-1', 'i-3'], ProtectedFromScaleIn: false }
    ]);
  });

  test('succeeds when the group disappears after protection is turned off', async () => {
    const result = await runDelete(
      [{ AutoScalingGroupName: ASG_NAME, Instances: [instance(1)] } as AutoScalingGroup],
      []
    );
    expect(result.physicalResourceId).toBe(`${ASG_NAME}-fd`);
    expect(protectionCalls()).toEqual([]);
  });

  test('succeeds when every instance is already terminating', async () => {
    await runDelete([
      { AutoScalingGroupName: ASG_NAME, Instances: [instance(1, 'Terminating:Wait')] } as AutoScalingGroup
    ]);
    expect(protectionCalls()).toEqual([]);
  });

  test('does nothing on Create', async () => {
    const stub = stubAutoScaling([]);
    try {
      await forceDeleteAsg({ asgName: ASG_NAME }, undefined, 'Create');
      expect(sends).toEqual([]);
    } finally {
      stub.mockRestore();
    }
  });
});
