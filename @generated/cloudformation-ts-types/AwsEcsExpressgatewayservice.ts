// This file is auto-generated. Do not edit manually.
// Source: aws-ecs-expressgatewayservice.json

/** Resource Type definition for AWS::ECS::ExpressGatewayService */
export type AwsEcsExpressgatewayservice = {
  Status?: {
    StatusCode?: "ACTIVE" | "DRAINING" | "INACTIVE";
  };
  TaskRoleArn?: string;
  PrimaryContainer: {
    RepositoryCredentials?: {
      CredentialsParameter: string;
    };
    Secrets?: {
      ValueFrom: string;
      Name: string;
    }[];
    Command?: string[];
    AwsLogsConfiguration?: {
      /** @default "ecs" */
      LogStreamPrefix: string;
      LogGroup: string;
    };
    /** @default 80 */
    ContainerPort?: number;
    Environment?: {
      Value: string;
      Name: string;
    }[];
    Image: string;
  };
  /** @default "512" */
  Memory?: string;
  /** @default "HTTP:80/ping" */
  HealthCheckPath?: string;
  CreatedAt?: string;
  /** @default "default" */
  Cluster?: string;
  /** @default "256" */
  Cpu?: string;
  ServiceArn?: string;
  UpdatedAt?: string;
  ExecutionRoleArn: string;
  InfrastructureRoleArn: string;
  ScalingTarget?: {
    /** @default 1 */
    MinTaskCount?: number;
    /** @default 1 */
    MaxTaskCount?: number;
    AutoScalingMetric?: "AVERAGE_CPU" | "AVERAGE_MEMORY" | "REQUEST_COUNT_PER_TARGET";
    /** @default 60 */
    AutoScalingTargetValue?: number;
  };
  ActiveConfigurations?: ({
    ServiceRevisionArn?: string;
    ExecutionRoleArn?: string;
    TaskRoleArn?: string;
    ScalingTarget?: {
      /** @default 1 */
      MinTaskCount?: number;
      /** @default 1 */
      MaxTaskCount?: number;
      AutoScalingMetric?: "AVERAGE_CPU" | "AVERAGE_MEMORY" | "REQUEST_COUNT_PER_TARGET";
      /** @default 60 */
      AutoScalingTargetValue?: number;
    };
    IngressPaths?: ({
      Endpoint?: string;
      AccessType?: "PUBLIC" | "PRIVATE";
    })[];
    PrimaryContainer?: {
      RepositoryCredentials?: {
        CredentialsParameter: string;
      };
      Secrets?: {
        ValueFrom: string;
        Name: string;
      }[];
      Command?: string[];
      AwsLogsConfiguration?: {
        /** @default "ecs" */
        LogStreamPrefix: string;
        LogGroup: string;
      };
      /** @default 80 */
      ContainerPort?: number;
      Environment?: {
        Value: string;
        Name: string;
      }[];
      Image: string;
    };
    Memory?: string;
    HealthCheckPath?: string;
    CreatedAt?: string;
    Cpu?: string;
    NetworkConfiguration?: {
      SecurityGroups?: string[];
      Subnets?: string[];
    };
  })[];
  ServiceName?: string;
  NetworkConfiguration?: {
    SecurityGroups?: string[];
    Subnets?: string[];
  };
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
