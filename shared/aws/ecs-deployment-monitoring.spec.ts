import type { Deployment, Task } from '@aws-sdk/client-ecs';
import { describe, expect, test } from 'bun:test';
import { findFailedTaskForEcsDeployment } from './ecs-deployment-monitoring';

const targetDeployment: Deployment = {
  createdAt: new Date('2026-08-11T09:20:34.000Z'),
  status: 'PRIMARY',
  taskDefinition: 'arn:aws:ecs:eu-central-1:123456789012:task-definition/service:40'
};
const serviceName = 'service';

const task = (overrides: Partial<Task>): Task => ({
  createdAt: new Date('2026-08-11T09:21:00.000Z'),
  group: `service:${serviceName}`,
  stopCode: 'EssentialContainerExited',
  taskArn: 'arn:aws:ecs:eu-central-1:123456789012:task/cluster/task-id',
  taskDefinitionArn: targetDeployment.taskDefinition,
  ...overrides
});

describe('findFailedTaskForEcsDeployment', () => {
  test('ignores scheduler drains and tasks from an old task-definition revision', () => {
    const oldRevisionDrain = task({
      stopCode: 'ServiceSchedulerInitiated',
      taskDefinitionArn: 'arn:aws:ecs:eu-central-1:123456789012:task-definition/service:37'
    });
    const targetRevisionDrain = task({ stopCode: 'ServiceSchedulerInitiated' });
    const oldRevisionFailure = task({
      taskDefinitionArn: 'arn:aws:ecs:eu-central-1:123456789012:task-definition/service:37'
    });
    const otherServiceFailure = task({ group: 'service:other-service' });

    expect(
      findFailedTaskForEcsDeployment({
        serviceName,
        tasks: [oldRevisionDrain, targetRevisionDrain, oldRevisionFailure, otherServiceFailure],
        targetDeploymentOrTaskSet: targetDeployment
      })
    ).toBeUndefined();
  });

  test('returns a failed task from the target deployment', () => {
    const targetRevisionFailure = task({});

    expect(
      findFailedTaskForEcsDeployment({
        serviceName,
        tasks: [targetRevisionFailure],
        targetDeploymentOrTaskSet: targetDeployment
      })
    ).toBe(targetRevisionFailure);
  });

  test('ignores target-revision tasks created before the deployment', () => {
    const taskFromBeforeDeployment = task({ createdAt: new Date('2026-08-11T09:20:33.000Z') });

    expect(
      findFailedTaskForEcsDeployment({
        serviceName,
        tasks: [taskFromBeforeDeployment],
        targetDeploymentOrTaskSet: targetDeployment
      })
    ).toBeUndefined();
  });
});
