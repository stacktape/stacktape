import { describe, expect, it } from 'bun:test';
import { declaredStatements, samPermissions, type PermissionContext } from './declared-permissions';

const context: PermissionContext = {
  scope: {
    parameters: { Bucket: { Type: 'String', Default: 'shared-assets' } },
    logicalIds: new Set(['Archive', 'Orders'])
  },
  dependencyNames: new Map([
    ['Archive', 'archive'],
    ['Orders', 'orders']
  ]),
  variableDependencies: new Map([['self:provider.environment.ORDERS_TABLE', 'orders']])
};

describe('samPermissions', () => {
  it('translates policy templates and inline statements in order, keeping a Deny', () => {
    expect(
      samPermissions(
        [
          'AWSLambdaBasicExecutionRole',
          { S3ReadPolicy: { BucketName: { Ref: 'Archive' } } },
          { DynamoDBCrudPolicy: { TableName: { Ref: 'Orders' } } },
          { Statement: [{ Effect: 'Deny', Action: 's3:DeleteObject', Resource: '*' }] }
        ],
        undefined,
        context
      )
    ).toMatchObject({
      kind: 'declared',
      dropped: [],
      statements: [
        {
          effect: 'Allow',
          resources: [{ dependencyName: 'archive' }, { dependencyName: 'archive', suffix: '/*' }]
        },
        {
          effect: 'Allow',
          resources: [{ dependencyName: 'orders' }, { dependencyName: 'orders', suffix: '/index/*' }]
        },
        { effect: 'Deny', actions: ['s3:DeleteObject'], resources: ['*'] }
      ]
    });
  });

  it('keeps an ARN suffix written with Fn::Sub, and a literal ARN of an existing resource', () => {
    expect(
      samPermissions(
        [
          {
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: [
                  { 'Fn::Sub': 'arn:${AWS::Partition}:s3:::${Archive}/reports/*' },
                  'arn:aws:s3:::external-bucket/*'
                ]
              }
            ]
          }
        ],
        undefined,
        context
      )
    ).toEqual({
      kind: 'declared',
      dropped: [],
      statements: [
        {
          effect: 'Allow',
          actions: ['s3:GetObject'],
          resources: [{ dependencyName: 'archive', suffix: '/reports/*' }, 'arn:aws:s3:::external-bucket/*']
        }
      ]
    });
  });

  it.each([
    ['its own role', undefined, { 'Fn::GetAtt': ['Role', 'Arn'] }, 'Role'],
    ['a managed policy it does not know', ['AmazonS3FullAccess'], undefined, 'Policies.0'],
    ['a template it does not know', [{ KMSDecryptPolicy: { KeyId: 'abc' } }], undefined, 'Policies.0'],
    [
      'an allowing statement with a condition',
      [{ Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*', Condition: { Bool: {} } }] }],
      undefined,
      'Policies.0.Statement.0'
    ],
    [
      'an allowing statement on a resource it cannot name',
      [{ Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: { 'Fn::ImportValue': 'Shared' } }] }],
      undefined,
      'Policies.0.Statement.0'
    ]
  ])('drops %s, which only gives the function less', (_label, policies, role, key) => {
    expect(samPermissions(policies, role, context)).toEqual({ kind: 'declared', statements: [], dropped: [key] });
  });

  it('leaves the function out for a Deny it cannot write as declared', () => {
    expect(
      samPermissions(
        [
          {
            Statement: [
              { Effect: 'Deny', Action: 's3:*', Resource: '*', Condition: { Bool: { 'aws:SecureTransport': false } } }
            ]
          }
        ],
        undefined,
        context
      )
    ).toEqual({ kind: 'declared', statements: [], dropped: [], blocking: 'Policies.0.Statement.0' });
  });

  it('finds a table named by the same parameter as its own TableName', () => {
    expect(
      samPermissions([{ DynamoDBReadPolicy: { TableName: { Ref: 'OrdersTableName' } } }], undefined, {
        ...context,
        physicalNames: new Map([[JSON.stringify({ Ref: 'OrdersTableName' }), 'orders']])
      })
    ).toMatchObject({
      kind: 'declared',
      dropped: [],
      statements: [{ resources: [{ dependencyName: 'orders' }, { dependencyName: 'orders', suffix: '/index/*' }] }]
    });
  });

  it('reports no permissions when the function declares none', () => {
    expect(samPermissions(undefined, undefined, context)).toEqual({ kind: 'none' });
  });
});

describe('declaredStatements', () => {
  it('reads a Serverless table ARN built from a variable that names the table', () => {
    expect(
      declaredStatements(
        [
          {
            Effect: 'Allow',
            Action: ['dynamodb:Query', 'dynamodb:GetItem'],
            Resource: 'arn:aws:dynamodb:${aws:region}:*:table/${self:provider.environment.ORDERS_TABLE}'
          },
          {
            Effect: 'Allow',
            Action: 's3:PutObject',
            Resource: { 'Fn::Join': ['', ['arn:aws:s3:::', { Ref: 'Archive' }, '/uploads/*']] }
          }
        ],
        context,
        'statements'
      )
    ).toEqual({
      statements: [
        { effect: 'Allow', actions: ['dynamodb:Query', 'dynamodb:GetItem'], resources: [{ dependencyName: 'orders' }] },
        { effect: 'Allow', actions: ['s3:PutObject'], resources: [{ dependencyName: 'archive', suffix: '/uploads/*' }] }
      ],
      dropped: []
    });
    expect(
      declaredStatements(
        [{ Effect: 'Allow', Action: 'sqs:*', Resource: '${self:custom.queueArn}' }],
        context,
        'statements'
      )
    ).toEqual({ statements: [], dropped: ['statements.0'] });
  });
});
