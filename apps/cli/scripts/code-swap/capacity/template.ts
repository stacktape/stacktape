// Embedded only in the owned phase-3 benchmark stack. Phase 4 owns final CFN
// writer/lifecycle protections and publication; no shared service-Lambda changes.
export const capacityResources = (input: {
  tableArn: string;
  streamArn: string;
  tableName: string;
  clusterArn: string;
  functionName: string;
  codeBucket: string;
  codeKey: string;
}) => {
  const ref = (name: string) => ({ Ref: name });
  const arn = (name: string) => ({ 'Fn::GetAtt': [name, 'Arn'] });
  return {
    SwapCapacityRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
        },
        Policies: [
          {
            PolicyName: 'capacity-only',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                { Effect: 'Allow', Action: ['dynamodb:GetItem', 'dynamodb:BatchGetItem'], Resource: input.tableArn },
                {
                  Effect: 'Allow',
                  Action: ['dynamodb:ConditionCheckItem'],
                  Resource: input.tableArn,
                  Condition: { 'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': ['capacity#plan'] } }
                },
                {
                  Effect: 'Allow',
                  Action: ['dynamodb:ConditionCheckItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
                  Resource: input.tableArn,
                  Condition: {
                    'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['slot#*', 'admission#*', 'stopped#*'] }
                  }
                },
                {
                  Effect: 'Deny',
                  Action: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
                  Resource: input.tableArn,
                  Condition: {
                    'ForAnyValue:StringLike': {
                      'dynamodb:LeadingKeys': ['release#*', 'lock', 'status#*', 'capacity#plan']
                    }
                  }
                },
                {
                  Effect: 'Allow',
                  Action: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator'],
                  Resource: input.streamArn
                },
                { Effect: 'Allow', Action: ['dynamodb:ListStreams'], Resource: input.tableArn },
                {
                  Effect: 'Allow',
                  Action: ['ecs:DescribeTasks', 'ecs:DescribeServices'],
                  Resource: '*',
                  Condition: { ArnEquals: { 'ecs:cluster': input.clusterArn } }
                },
                {
                  Effect: 'Allow',
                  Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                  Resource: {
                    'Fn::Sub': `arn:\${AWS::Partition}:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/aws/lambda/${input.functionName}:*`
                  }
                }
              ]
            }
          }
        ]
      }
    },
    SwapCapacityLog: {
      Type: 'AWS::Logs::LogGroup',
      Properties: { LogGroupName: `/aws/lambda/${input.functionName}`, RetentionInDays: 1 }
    },
    SwapCapacity: {
      Type: 'AWS::Lambda::Function',
      DependsOn: ['SwapCapacityLog'],
      Properties: {
        FunctionName: input.functionName,
        Runtime: 'nodejs22.x',
        Handler: 'index.handler',
        MemorySize: 256,
        Timeout: 15,
        ReservedConcurrentExecutions: 2,
        Role: arn('SwapCapacityRole'),
        Code: { S3Bucket: input.codeBucket, S3Key: input.codeKey },
        Environment: { Variables: { CAPACITY_TABLE: input.tableName } }
      }
    },
    SwapCapacityStream: {
      Type: 'AWS::Lambda::EventSourceMapping',
      Properties: {
        FunctionName: ref('SwapCapacity'),
        EventSourceArn: input.streamArn,
        StartingPosition: 'LATEST',
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 0,
        // One batch per shard avoids multiplying demand against the fixed
        // two-execution reservation during startup bursts.
        ParallelizationFactor: 1,
        FunctionResponseTypes: ['ReportBatchItemFailures'],
        MaximumRetryAttempts: 2,
        MaximumRecordAgeInSeconds: 60,
        BisectBatchOnFunctionError: true,
        FilterCriteria: {
          Filters: [
            {
              Pattern: JSON.stringify({
                eventName: ['INSERT', 'MODIFY'],
                dynamodb: { NewImage: { capacityRequest: { S: [{ exists: true }] } } }
              })
            }
          ]
        }
      }
    },
    SwapCapacityStopped: {
      Type: 'AWS::Events::Rule',
      Properties: {
        EventPattern: {
          source: ['aws.ecs'],
          'detail-type': ['ECS Task State Change'],
          detail: { clusterArn: [input.clusterArn], lastStatus: ['STOPPED'] }
        },
        Targets: [
          {
            Id: 'capacity',
            Arn: arn('SwapCapacity'),
            RetryPolicy: { MaximumEventAgeInSeconds: 3600, MaximumRetryAttempts: 10 }
          }
        ]
      }
    },
    SwapCapacityStoppedPermission: {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: ref('SwapCapacity'),
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: arn('SwapCapacityStopped')
      }
    },
    SwapCapacityInvalidRequestsAlarm: {
      Type: 'AWS::CloudWatch::Alarm',
      Properties: {
        Namespace: 'Stacktape/CodeSwap/Capacity',
        MetricName: 'InvalidRequests',
        Statistic: 'Sum',
        Period: 60,
        EvaluationPeriods: 1,
        Threshold: 0,
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'notBreaching',
        Dimensions: [{ Name: 'FunctionName', Value: ref('SwapCapacity') }]
      }
    },
    ...Object.fromEntries(
      [
        ['Errors', 'AWS/Lambda', 'Sum', 0],
        ['Throttles', 'AWS/Lambda', 'Sum', 0],
        ['IteratorAge', 'AWS/Lambda', 'Maximum', 10000]
      ].map(([metric, namespace, statistic, threshold]) => [
        `SwapCapacity${metric}Alarm`,
        {
          Type: 'AWS::CloudWatch::Alarm',
          Properties: {
            Namespace: namespace,
            MetricName: metric,
            Statistic: statistic,
            Period: 60,
            EvaluationPeriods: 1,
            Threshold: threshold,
            ComparisonOperator: 'GreaterThanThreshold',
            TreatMissingData: 'notBreaching',
            Dimensions: [{ Name: 'FunctionName', Value: ref('SwapCapacity') }]
          }
        }
      ])
    )
  };
};
