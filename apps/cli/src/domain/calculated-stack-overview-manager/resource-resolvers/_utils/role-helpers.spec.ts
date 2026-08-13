import { describe, expect, test } from 'bun:test';
import {
  getStatementsForAccessingAgentCoreResource,
  getStatementsForAccessingDsqlDatabase,
  getStatementsForAccessingWebsocketApiGateway,
  getStatementsForAccessingEmailSender,
  getStatementsForAccessingKafkaCluster,
  type StpAgentCoreConnectToTarget
} from './role-helpers';

const baseResource = {
  name: 'target',
  nameChain: ['target']
};

describe('AgentCore connectTo IAM permissions', () => {
  test('allows invoking a runtime and each configured endpoint', () => {
    const [statement] = getStatementsForAccessingAgentCoreResource({
      ...baseResource,
      type: 'agentcore-runtime',
      configParentResourceType: 'agentcore-runtime',
      jobName: 'target',
      packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/image:tag' } },
      endpoints: ['default', { name: 'stable', runtimeVersion: '1' }],
      connectTo: []
    });

    expect(statement.Action).toContain('bedrock-agentcore:InvokeAgentRuntime');
    expect(statement.Resource as unknown).toEqual([
      { 'Fn::GetAtt': ['TargetRuntime', 'AgentRuntimeArn'] },
      { Ref: 'TargetDefaultRuntimeEndpoint' },
      { Ref: 'TargetStableRuntimeEndpoint' }
    ]);
  });

  test.each([
    ['agentcore-memory', 'bedrock-agentcore:RetrieveMemoryRecords', { Ref: 'TargetMemory' }],
    ['agentcore-gateway', 'bedrock-agentcore:InvokeGateway', { 'Fn::GetAtt': ['TargetGateway', 'GatewayArn'] }],
    [
      'agentcore-browser',
      'bedrock-agentcore:StartBrowserSession',
      { 'Fn::GetAtt': ['TargetBrowserCustom', 'BrowserArn'] }
    ],
    [
      'agentcore-code-interpreter',
      'bedrock-agentcore:InvokeCodeInterpreter',
      { 'Fn::GetAtt': ['TargetCodeInterpreterCustom', 'CodeInterpreterArn'] }
    ]
  ] as const)('uses scoped data-plane access for %s', (type, action, resourceArn) => {
    const resource = { ...baseResource, type, configParentResourceType: type } as StpAgentCoreConnectToTarget;
    const statements = getStatementsForAccessingAgentCoreResource(resource);
    const statement = statements.find(({ Action }) => (Action as string[]).includes(action));

    expect(statement?.Action).toContain(action);
    expect(statement?.Resource as unknown).toEqual([resourceArn]);
  });

  test('uses Resource * only for browser actions that AWS does not support resource-scoping', () => {
    const statements = getStatementsForAccessingAgentCoreResource({
      ...baseResource,
      type: 'agentcore-browser',
      configParentResourceType: 'agentcore-browser'
    } as StpAgentCoreConnectToTarget);

    expect(statements as unknown).toEqual([
      {
        Effect: 'Allow',
        Action: [
          'bedrock-agentcore:StartBrowserSession',
          'bedrock-agentcore:GetBrowserSession',
          'bedrock-agentcore:StopBrowserSession',
          'bedrock-agentcore:UpdateBrowserStream'
        ],
        Resource: [{ 'Fn::GetAtt': ['TargetBrowserCustom', 'BrowserArn'] }]
      },
      {
        Effect: 'Allow',
        Action: [
          'bedrock-agentcore:ListBrowserSessions',
          'bedrock-agentcore:ConnectBrowserAutomationStream',
          'bedrock-agentcore:ConnectBrowserLiveViewStream'
        ],
        Resource: ['*']
      }
    ]);
  });
});

test('WebSocket connectTo grants only connection management on the managed stage', () => {
  expect(
    getStatementsForAccessingWebsocketApiGateway({
      accountId: '123456789012',
      region: 'eu-west-1',
      stackName: 'app-production',
      stacktapeResourceName: 'realtime'
    }) as unknown
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['execute-api:ManageConnections'],
      Resource: [
        {
          'Fn::Join': [
            '',
            [
              'arn:aws:execute-api:eu-west-1:123456789012:',
              { Ref: 'RealtimeWebsocketApi' },
              '/default/POST/@connections'
            ]
          ]
        }
      ]
    }
  ]);
});

test('DSQL connectTo grants built-in admin access to exactly the connected cluster', () => {
  expect(
    getStatementsForAccessingDsqlDatabase({
      accountId: '123456789012',
      region: 'eu-west-1',
      stackName: 'app-production',
      stacktapeResourceName: 'primary'
    }) as unknown
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['dsql:DbConnectAdmin'],
      Resource: [{ 'Fn::GetAtt': ['PrimaryDsqlCluster', 'ResourceArn'] }]
    }
  ]);
});

test('Kafka connectTo grants direct client access without control-plane or destructive actions', () => {
  const statements = getStatementsForAccessingKafkaCluster(
    {
      ...baseResource,
      type: 'kafka-cluster',
      configParentResourceType: 'kafka-cluster'
    },
    {
      accountId: '123456789012',
      region: 'eu-west-1',
      stackName: 'app-production',
      stacktapeResourceName: 'target'
    }
  );
  expect(statements.map(({ Action }) => Action)).toEqual([
    ['kafka-cluster:Connect', 'kafka-cluster:DescribeCluster'],
    [
      'kafka-cluster:CreateTopic',
      'kafka-cluster:DescribeTopic',
      'kafka-cluster:DescribeTopicDynamicConfiguration',
      'kafka-cluster:ReadData',
      'kafka-cluster:WriteData'
    ],
    ['kafka-cluster:DescribeGroup', 'kafka-cluster:AlterGroup']
  ]);
  expect(statements.flatMap(({ Action }) => Action)).not.toContain('kafka:GetBootstrapBrokers');
  expect(statements.flatMap(({ Action }) => Action)).not.toContain('kafka:DescribeClusterV2');
  expect(JSON.stringify(statements)).not.toContain('DeleteTopic');
  expect(JSON.stringify(statements)).not.toContain('AlterTopic');
  expect(JSON.stringify(statements)).not.toContain('kafka-cluster:*');
  expect(statements[1].Resource as unknown).toEqual([
    {
      'Fn::Join': [
        '',
        [
          'arn:aws:kafka:eu-west-1:123456789012:topic/',
          { 'Fn::Select': [1, { 'Fn::Split': ['/', { Ref: 'TargetKafkaServerlessCluster' }] }] },
          '/',
          { 'Fn::Select': [2, { 'Fn::Split': ['/', { Ref: 'TargetKafkaServerlessCluster' }] }] },
          '/*'
        ]
      ]
    }
  ]);
});

test('EmailSender connectTo scopes sending to the exact identity and managed configuration set', () => {
  expect(
    getStatementsForAccessingEmailSender(
      {
        ...baseResource,
        type: 'email-sender',
        configParentResourceType: 'email-sender',
        identity: 'example.com'
      },
      { accountId: '123456789012', region: 'eu-west-1' }
    )
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['ses:SendEmail', 'ses:SendRawEmail'],
      Resource: [
        'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
        'arn:aws:ses:eu-west-1:123456789012:configuration-set/stacktape-email-8b39fcf1d2677aac5e71'
      ]
    }
  ]);
});

test('external EmailSender connectTo includes only an explicitly configured configuration set', () => {
  const externalSender = {
    ...baseResource,
    type: 'email-sender' as const,
    configParentResourceType: 'email-sender' as const,
    identity: 'Billing@example.com',
    manageIdentity: false as const
  };
  expect(
    getStatementsForAccessingEmailSender(externalSender, { accountId: '123456789012', region: 'eu-west-1' })
  ).toEqual([
    {
      Effect: 'Allow',
      Action: ['ses:SendEmail', 'ses:SendRawEmail'],
      Resource: ['arn:aws:ses:eu-west-1:123456789012:identity/Billing@example.com']
    }
  ]);
  expect(
    getStatementsForAccessingEmailSender(
      { ...externalSender, configurationSetName: 'shared-transactional' },
      { accountId: '123456789012', region: 'eu-west-1' }
    )[0].Resource
  ).toEqual([
    'arn:aws:ses:eu-west-1:123456789012:identity/Billing@example.com',
    'arn:aws:ses:eu-west-1:123456789012:configuration-set/shared-transactional'
  ]);
});
