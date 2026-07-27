// This file is auto-generated. Do not edit manually.
// Source: aws-scheduler-schedule.json

/** Definition of AWS::Scheduler::Schedule Resource Type */
export type AwsSchedulerSchedule = {
  /**
   * The Amazon Resource Name (ARN) of the schedule.
   * @minLength 1
   * @maxLength 1224
   * @pattern ^arn:aws[a-z-]*:scheduler:[a-z0-9\-]+:\d{12}:schedule\/[0-9a-zA-Z-_.]+\/[0-9a-zA-Z-_.]+$
   */
  Arn?: string;
  /**
   * The description of the schedule.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /**
   * The date, in UTC, before which the schedule can invoke its target. Depending on the schedule's
   * recurrence expression, invocations might stop on, or before, the EndDate you specify.
   */
  EndDate?: string;
  FlexibleTimeWindow: {
    Mode: "OFF" | "FLEXIBLE";
    /**
     * The maximum time window during which a schedule can be invoked.
     * @minimum 1
     * @maximum 1440
     */
    MaximumWindowInMinutes?: number;
  };
  /**
   * The name of the schedule group to associate with this schedule. If you omit this, the default
   * schedule group is used.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-zA-Z-_.]+$
   */
  GroupName?: string;
  /**
   * The ARN for a KMS Key that will be used to encrypt customer data.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws[a-z-]*:kms:[a-z0-9\-]+:\d{12}:(key|alias)\/[0-9a-zA-Z-_]*$
   */
  KmsKeyArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-zA-Z-_.]+$
   */
  Name?: string;
  /**
   * The scheduling expression.
   * @minLength 1
   * @maxLength 256
   */
  ScheduleExpression: string;
  /**
   * The timezone in which the scheduling expression is evaluated.
   * @minLength 1
   * @maxLength 50
   */
  ScheduleExpressionTimezone?: string;
  /**
   * The date, in UTC, after which the schedule can begin invoking its target. Depending on the
   * schedule's recurrence expression, invocations might occur on, or after, the StartDate you specify.
   */
  StartDate?: string;
  State?: "ENABLED" | "DISABLED";
  Target: {
    /**
     * The Amazon Resource Name (ARN) of the target.
     * @minLength 1
     * @maxLength 1600
     */
    Arn: string;
    /**
     * The Amazon Resource Name (ARN) of the IAM role to be used for this target when the schedule is
     * triggered.
     * @minLength 1
     * @maxLength 1600
     * @pattern ^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@\/-]+$
     */
    RoleArn: string;
    DeadLetterConfig?: {
      /**
       * The ARN of the SQS queue specified as the target for the dead-letter queue.
       * @minLength 1
       * @maxLength 1600
       * @pattern ^arn:aws[a-z-]*:sqs:[a-z0-9\-]+:\d{12}:[a-zA-Z0-9\-_]+$
       */
      Arn?: string;
    };
    RetryPolicy?: {
      /**
       * The maximum amount of time, in seconds, to continue to make retry attempts.
       * @minimum 60
       * @maximum 86400
       */
      MaximumEventAgeInSeconds?: number;
      /**
       * The maximum number of retry attempts to make before the request fails. Retry attempts with
       * exponential backoff continue until either the maximum number of attempts is made or until the
       * duration of the MaximumEventAgeInSeconds is reached.
       * @minimum 0
       * @maximum 185
       */
      MaximumRetryAttempts?: number;
    };
    /**
     * The text, or well-formed JSON, passed to the target. If you are configuring a templated Lambda, AWS
     * Step Functions, or Amazon EventBridge target, the input must be a well-formed JSON. For all other
     * target types, a JSON is not required. If you do not specify anything for this field, EventBridge
     * Scheduler delivers a default notification to the target.
     * @minLength 1
     */
    Input?: string;
    EcsParameters?: {
      /**
       * The ARN of the task definition to use if the event target is an Amazon ECS task.
       * @minLength 1
       * @maxLength 1600
       */
      TaskDefinitionArn: string;
      /**
       * The number of tasks to create based on TaskDefinition. The default is 1.
       * @minimum 1
       * @maximum 10
       */
      TaskCount?: number;
      LaunchType?: "EC2" | "FARGATE" | "EXTERNAL";
      NetworkConfiguration?: {
        AwsvpcConfiguration?: {
          /**
           * Specifies the subnets associated with the task. These subnets must all be in the same VPC. You can
           * specify as many as 16 subnets.
           * @minItems 1
           * @maxItems 16
           */
          Subnets: string[];
          /**
           * Specifies the security groups associated with the task. These security groups must all be in the
           * same VPC. You can specify as many as five security groups. If you do not specify a security group,
           * the default security group for the VPC is used.
           * @minItems 1
           * @maxItems 5
           */
          SecurityGroups?: string[];
          AssignPublicIp?: "ENABLED" | "DISABLED";
        };
      };
      /**
       * Specifies the platform version for the task. Specify only the numeric portion of the platform
       * version, such as 1.1.0.
       * @minLength 1
       * @maxLength 64
       */
      PlatformVersion?: string;
      /**
       * Specifies an ECS task group for the task. The maximum length is 255 characters.
       * @minLength 1
       * @maxLength 255
       */
      Group?: string;
      /**
       * The capacity provider strategy to use for the task.
       * @maxItems 6
       */
      CapacityProviderStrategy?: {
        /**
         * The short name of the capacity provider.
         * @minLength 1
         * @maxLength 255
         */
        CapacityProvider: string;
        /**
         * The weight value designates the relative percentage of the total number of tasks launched that
         * should use the specified capacity provider. The weight value is taken into consideration after the
         * base value, if defined, is satisfied.
         * @default 0
         * @minimum 0
         * @maximum 1000
         */
        Weight?: number;
        /**
         * The base value designates how many tasks, at a minimum, to run on the specified capacity provider.
         * Only one capacity provider in a capacity provider strategy can have a base defined. If no value is
         * specified, the default value of 0 is used.
         * @default 0
         * @minimum 0
         * @maximum 100000
         */
        Base?: number;
      }[];
      /**
       * Specifies whether to enable Amazon ECS managed tags for the task. For more information, see Tagging
       * Your Amazon ECS Resources in the Amazon Elastic Container Service Developer Guide.
       */
      EnableECSManagedTags?: boolean;
      /**
       * Whether or not to enable the execute command functionality for the containers in this task. If
       * true, this enables execute command functionality on all containers in the task.
       */
      EnableExecuteCommand?: boolean;
      /**
       * An array of placement constraint objects to use for the task. You can specify up to 10 constraints
       * per task (including constraints in the task definition and those specified at runtime).
       * @maxItems 10
       */
      PlacementConstraints?: ({
        Type?: "distinctInstance" | "memberOf";
        /**
         * A cluster query language expression to apply to the constraint. You cannot specify an expression if
         * the constraint type is distinctInstance. To learn more, see Cluster Query Language in the Amazon
         * Elastic Container Service Developer Guide.
         * @maxLength 2000
         */
        Expression?: string;
      })[];
      /**
       * The placement strategy objects to use for the task. You can specify a maximum of five strategy
       * rules per task.
       * @maxItems 5
       */
      PlacementStrategy?: ({
        Type?: "random" | "spread" | "binpack";
        /**
         * The field to apply the placement strategy against. For the spread placement strategy, valid values
         * are instanceId (or host, which has the same effect), or any platform or custom attribute that is
         * applied to a container instance, such as attribute:ecs.availability-zone. For the binpack placement
         * strategy, valid values are cpu and memory. For the random placement strategy, this field is not
         * used.
         * @maxLength 255
         */
        Field?: string;
      })[];
      PropagateTags?: "TASK_DEFINITION";
      /**
       * The reference ID to use for the task.
       * @maxLength 1024
       */
      ReferenceId?: string;
      /**
       * The metadata that you apply to the task to help you categorize and organize them. Each tag consists
       * of a key and an optional value, both of which you define. To learn more, see RunTask in the Amazon
       * ECS API Reference.
       * @minItems 0
       * @maxItems 50
       */
      Tags?: Record<string, string>[];
    };
    EventBridgeParameters?: {
      /**
       * Free-form string, with a maximum of 128 characters, used to decide what fields to expect in the
       * event detail.
       * @minLength 1
       * @maxLength 128
       */
      DetailType: string;
      /**
       * The source of the event.
       * @minLength 1
       * @maxLength 256
       * @pattern ^(?=[/\.\-_A-Za-z0-9]+)((?!aws\.).*)|(\$(\.[\w_-]+(\[(\d+|\*)\])*)*)$
       */
      Source: string;
    };
    KinesisParameters?: {
      /**
       * The custom parameter used as the Kinesis partition key. For more information, see Amazon Kinesis
       * Streams Key Concepts in the Amazon Kinesis Streams Developer Guide.
       * @minLength 1
       * @maxLength 256
       */
      PartitionKey: string;
    };
    SageMakerPipelineParameters?: {
      /**
       * List of Parameter names and values for SageMaker Model Building Pipeline execution.
       * @minItems 0
       * @maxItems 200
       */
      PipelineParameterList?: {
        /**
         * Name of parameter to start execution of a SageMaker Model Building Pipeline.
         * @minLength 1
         * @maxLength 256
         * @pattern ^[A-Za-z0-9\-_]*$
         */
        Name: string;
        /**
         * Value of parameter to start execution of a SageMaker Model Building Pipeline.
         * @minLength 1
         * @maxLength 1024
         */
        Value: string;
      }[];
    };
    SqsParameters?: {
      /**
       * The FIFO message group ID to use as the target.
       * @minLength 1
       * @maxLength 128
       */
      MessageGroupId?: string;
    };
  };
};
