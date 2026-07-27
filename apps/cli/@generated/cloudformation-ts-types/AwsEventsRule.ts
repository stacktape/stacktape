// This file is auto-generated. Do not edit manually.
// Source: aws-events-rule.json

/** Resource Type definition for AWS::Events::Rule */
export type AwsEventsRule = {
  /**
   * The name or ARN of the event bus associated with the rule. If you omit this, the default event bus
   * is used.
   */
  EventBusName?: string;
  /**
   * The event pattern of the rule. For more information, see Events and Event Patterns in the Amazon
   * EventBridge User Guide.
   */
  EventPattern?: string | Record<string, unknown>;
  /**
   * The scheduling expression. For example, "cron(0 20 * * ? *)", "rate(5 minutes)". For more
   * information, see Creating an Amazon EventBridge rule that runs on a schedule.
   */
  ScheduleExpression?: string;
  /** The description of the rule. */
  Description?: string;
  /**
   * The state of the rule.
   * @enum ["DISABLED","ENABLED","ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS"]
   */
  State?: "DISABLED" | "ENABLED" | "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS";
  /**
   * Adds the specified targets to the specified rule, or updates the targets if they are already
   * associated with the rule.
   * Targets are the resources that are invoked when a rule is triggered.
   * @uniqueItems true
   */
  Targets?: {
    InputPath?: string;
    HttpParameters?: {
      /** @uniqueItems true */
      PathParameterValues?: string[];
      HeaderParameters?: Record<string, string>;
      QueryStringParameters?: Record<string, string>;
    };
    DeadLetterConfig?: {
      Arn?: string;
    };
    RunCommandParameters?: {
      /** @uniqueItems true */
      RunCommandTargets: {
        /** @uniqueItems true */
        Values: string[];
        Key: string;
      }[];
    };
    InputTransformer?: {
      InputPathsMap?: Record<string, string>;
      InputTemplate: string;
    };
    KinesisParameters?: {
      PartitionKeyPath: string;
    };
    RoleArn?: string;
    RedshiftDataParameters?: {
      StatementName?: string;
      /** @uniqueItems false */
      Sqls?: string[];
      Database: string;
      SecretManagerArn?: string;
      DbUser?: string;
      Sql?: string;
      WithEvent?: boolean;
    };
    AppSyncParameters?: {
      GraphQLOperation: string;
    };
    Input?: string;
    SqsParameters?: {
      MessageGroupId: string;
    };
    EcsParameters?: {
      PlatformVersion?: string;
      Group?: string;
      EnableECSManagedTags?: boolean;
      EnableExecuteCommand?: boolean;
      /** @uniqueItems true */
      PlacementConstraints?: {
        Type?: string;
        Expression?: string;
      }[];
      PropagateTags?: string;
      TaskCount?: number;
      /** @uniqueItems true */
      PlacementStrategies?: {
        Field?: string;
        Type?: string;
      }[];
      /** @uniqueItems true */
      CapacityProviderStrategy?: {
        CapacityProvider: string;
        Base?: number;
        Weight?: number;
      }[];
      LaunchType?: string;
      ReferenceId?: string;
      /** @uniqueItems true */
      TagList?: {
        Value?: string;
        Key?: string;
      }[];
      NetworkConfiguration?: {
        AwsVpcConfiguration?: {
          /** @uniqueItems true */
          SecurityGroups?: string[];
          /** @uniqueItems false */
          Subnets: string[];
          AssignPublicIp?: string;
        };
      };
      TaskDefinitionArn: string;
    };
    BatchParameters?: {
      ArrayProperties?: {
        Size?: number;
      };
      JobName: string;
      RetryStrategy?: {
        Attempts?: number;
      };
      JobDefinition: string;
    };
    Id: string;
    Arn: string;
    SageMakerPipelineParameters?: {
      /** @uniqueItems true */
      PipelineParameterList?: {
        Value: string;
        Name: string;
      }[];
    };
    RetryPolicy?: {
      MaximumRetryAttempts?: number;
      MaximumEventAgeInSeconds?: number;
    };
  }[];
  /** The ARN of the rule, such as arn:aws:events:us-east-2:123456789012:rule/example. */
  Arn?: string;
  /** The Amazon Resource Name (ARN) of the role that is used for target invocation. */
  RoleArn?: string;
  /**
   * Any tags assigned to the event rule.
   * @uniqueItems false
   */
  Tags?: {
    Value?: string;
    Key?: string;
  }[];
  /** The name of the rule. */
  Name?: string;
};
