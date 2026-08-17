import { describe, expect, it } from 'bun:test';
import type { Stack } from '@aws-sdk/client-cloudformation';
import {
  assertDeployTargetExpectation,
  classifyDeployTarget,
  INIT_TARGET_SCHEMA_VERSION,
  parseDeployTargetExpectation,
  type DeployTargetExpectation
} from './stack-expectation';

const target = {
  schemaVersion: INIT_TARGET_SCHEMA_VERSION,
  accountId: '123456789012',
  stackName: 'orders-dev',
  projectName: 'orders',
  stage: 'dev',
  region: 'eu-west-1'
} as const;

const STACK_ID = 'arn:aws:cloudformation:eu-west-1:123456789012:stack/orders-dev/one';

const stack = (overrides: Partial<Stack> = {}): Stack => {
  const result: Stack = {
    StackName: 'orders-dev',
    StackId: STACK_ID,
    StackStatus: 'UPDATE_COMPLETE',
    CreationTime: new Date('2026-01-01T00:00:00.000Z'),
    Description: 'STP-stack_orders_dev_hash',
    Tags: [
      { Key: 'stp:project-name', Value: 'orders' },
      { Key: 'stp:stage', Value: 'dev' }
    ]
  };
  Object.assign(result, overrides);
  return result;
};

const observation = (value: Stack | null = stack()) =>
  classifyDeployTarget({
    accountId: target.accountId,
    projectName: target.projectName,
    stage: target.stage,
    region: target.region,
    stack: value
  });

describe('classifying an init deploy target', () => {
  it('distinguishes an absent target and an updateable Stacktape stack', () => {
    expect(observation(null)).toEqual({ ...target, status: 'absent' });
    expect(observation()).toMatchObject({
      ...target,
      status: 'updateable',
      stackId: STACK_ID,
      stackStatus: 'UPDATE_COMPLETE'
    });
  });

  it('blocks foreign, mismatched, incomplete, in-progress, and failed-create stacks', () => {
    expect(observation(stack({ Description: 'another tool' }))).toMatchObject({
      status: 'blocked',
      reason: 'foreign-stack'
    });
    expect(observation(stack({ Tags: [{ Key: 'stp:project-name', Value: 'another-project' }] }))).toMatchObject({
      status: 'blocked',
      reason: 'identity-mismatch'
    });
    expect(observation(stack({ StackId: undefined }))).toMatchObject({
      status: 'blocked',
      reason: 'incomplete-stack-data'
    });
    expect(observation(stack({ StackStatus: 'UPDATE_IN_PROGRESS' }))).toMatchObject({
      status: 'blocked',
      reason: 'unsafe-status'
    });
    // CloudFormation permits only delete from ROLLBACK_COMPLETE after a failed create; presenting
    // it as an update would collect consent for an operation AWS cannot perform.
    expect(observation(stack({ StackStatus: 'ROLLBACK_COMPLETE' }))).toMatchObject({
      status: 'blocked',
      reason: 'unsafe-status'
    });
  });
});

describe('enforcing the reviewed target inside deploy', () => {
  const approveCreate = (): DeployTargetExpectation => ({ ...target, expected: 'create' });
  const approveUpdate = (stackId: string): DeployTargetExpectation => ({ ...target, expected: 'update', stackId });

  it('allows only the exact approved create or stack-id-bound update', () => {
    expect(() =>
      assertDeployTargetExpectation({
        expectation: approveCreate(),
        observation: observation(null)
      })
    ).not.toThrow();
    expect(() =>
      assertDeployTargetExpectation({
        expectation: approveUpdate(STACK_ID),
        observation: observation()
      })
    ).not.toThrow();

    expect(() =>
      assertDeployTargetExpectation({
        expectation: approveCreate(),
        observation: observation()
      })
    ).toThrow('now exists');
    expect(() =>
      assertDeployTargetExpectation({
        expectation: approveUpdate(`${STACK_ID}-replacement`),
        observation: observation()
      })
    ).toThrow('not the same stack');
  });

  it('parses a closed expectation shape and rejects malformed input', () => {
    const expected = approveCreate();
    expect(parseDeployTargetExpectation(JSON.stringify(expected))).toEqual(expected);
    expect(() => parseDeployTargetExpectation('{"expected":"anything"}')).toThrow('malformed');
    expect(() => parseDeployTargetExpectation(JSON.stringify({ ...expected, accountId: ' ' }))).toThrow('malformed');
    expect(() => parseDeployTargetExpectation('not json')).toThrow('not valid JSON');
  });
});
