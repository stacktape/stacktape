import { expect, test } from 'bun:test';
import { toRegisterTaskDefinitionInput, toSessionManagerSession } from './ecs';

test('hot-swap task definitions translate nested CloudFormation fields into the ECS SDK contract', () => {
  const definition = {
    Type: 'AWS::ECS::TaskDefinition' as const,
    Properties: {
      Family: 'worker',
      Cpu: '256',
      Memory: '512',
      RequiresCompatibilities: ['FARGATE'],
      NetworkMode: 'awsvpc',
      ContainerDefinitions: [
        {
          Name: 'worker',
          Image: 'image:v2',
          Essential: true,
          Environment: [{ Name: 'MODE', Value: 'jobs' }],
          PortMappings: [{ ContainerPort: 8080, Protocol: 'tcp' }],
          LogConfiguration: { LogDriver: 'awslogs', Options: { 'awslogs-group': '/worker' } }
        }
      ]
    }
  };
  const original = structuredClone(definition);
  expect(toRegisterTaskDefinitionInput(definition)).toEqual({
    family: 'worker',
    cpu: '256',
    memory: '512',
    requiresCompatibilities: ['FARGATE'],
    networkMode: 'awsvpc',
    containerDefinitions: [
      {
        name: 'worker',
        image: 'image:v2',
        essential: true,
        environment: [{ name: 'MODE', value: 'jobs' }],
        portMappings: [{ containerPort: 8080, protocol: 'tcp' }],
        logConfiguration: { logDriver: 'awslogs', options: { 'awslogs-group': '/worker' } }
      }
    ]
  });
  expect(definition).toEqual(original);
});

test('ECS Exec credentials retain the session-manager plugin field names and values', () => {
  expect(
    toSessionManagerSession({ sessionId: 'ecs-session', streamUrl: 'wss://local/session', tokenValue: 'test-token' })
  ).toEqual({ SessionId: 'ecs-session', StreamUrl: 'wss://local/session', TokenValue: 'test-token' });
});
