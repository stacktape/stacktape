// This file is auto-generated. Do not edit manually.
// Source: aws-apprunner-service.json

/** The AWS::AppRunner::Service resource specifies an AppRunner Service. */
export type AwsApprunnerService = {
  /**
   * The AppRunner Service Name.
   * @minLength 4
   * @maxLength 40
   * @pattern [A-Za-z0-9][A-Za-z0-9-_]{3,39}
   */
  ServiceName?: string;
  /**
   * The AppRunner Service Id
   * @minLength 32
   * @maxLength 32
   */
  ServiceId?: string;
  /**
   * The Amazon Resource Name (ARN) of the AppRunner Service.
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\\.]{0,63}:[a-z0-9-\\.]{0,63}:[0-9]{12}:(\w|\/|-){1,1011}
   */
  ServiceArn?: string;
  /** The Service Url of the AppRunner Service. */
  ServiceUrl?: string;
  /** AppRunner Service status. */
  Status?: string;
  SourceConfiguration: {
    CodeRepository?: {
      /** Repository Url */
      RepositoryUrl: string;
      SourceCodeVersion: {
        /**
         * Source Code Version Type
         * @enum ["BRANCH"]
         */
        Type: "BRANCH";
        /** Source Code Version Value */
        Value: string;
      };
      CodeConfiguration?: {
        /**
         * Configuration Source
         * @enum ["REPOSITORY","API"]
         */
        ConfigurationSource: "REPOSITORY" | "API";
        CodeConfigurationValues?: {
          /**
           * Runtime
           * @enum ["PYTHON_3","NODEJS_12","NODEJS_14","CORRETTO_8","CORRETTO_11","NODEJS_16","GO_1","DOTNET_6","PHP_81","RUBY_31","PYTHON_311","NODEJS_18","NODEJS_22"]
           */
          Runtime: "PYTHON_3" | "NODEJS_12" | "NODEJS_14" | "CORRETTO_8" | "CORRETTO_11" | "NODEJS_16" | "GO_1" | "DOTNET_6" | "PHP_81" | "RUBY_31" | "PYTHON_311" | "NODEJS_18" | "NODEJS_22";
          /** Build Command */
          BuildCommand?: string;
          /** Start Command */
          StartCommand?: string;
          /** Port */
          Port?: string;
          RuntimeEnvironmentVariables?: {
            Name?: string;
            Value?: string;
          }[];
          /** The secrets and parameters that get referenced by your service as environment variables */
          RuntimeEnvironmentSecrets?: {
            Name?: string;
            Value?: string;
          }[];
        };
      };
      /**
       * Source Directory
       * @minLength 1
       * @maxLength 4096
       * @pattern [^\x00]+
       */
      SourceDirectory?: string;
    };
    ImageRepository?: {
      /**
       * Image Identifier
       * @minLength 1
       * @maxLength 1024
       * @pattern ([0-9]{12}.dkr.ecr.[a-z\-]+-[0-9]{1}.amazonaws.com\/.*)|(^public\.ecr\.aws\/.+\/.+)
       */
      ImageIdentifier: string;
      ImageConfiguration?: {
        /** Start Command */
        StartCommand?: string;
        /** Port */
        Port?: string;
        RuntimeEnvironmentVariables?: {
          Name?: string;
          Value?: string;
        }[];
        /** The secrets and parameters that get referenced by your service as environment variables */
        RuntimeEnvironmentSecrets?: {
          Name?: string;
          Value?: string;
        }[];
      };
      /**
       * Image Repository Type
       * @enum ["ECR","ECR_PUBLIC"]
       */
      ImageRepositoryType: "ECR" | "ECR_PUBLIC";
    };
    /** Auto Deployment enabled */
    AutoDeploymentsEnabled?: boolean;
    AuthenticationConfiguration?: {
      /**
       * Connection Arn
       * @minLength 1
       * @maxLength 1011
       * @pattern arn:aws(-[\w]+)*:[a-z0-9-\\.]{0,63}:[a-z0-9-\\.]{0,63}:[0-9]{12}:(\w|\/|-){1,1011}
       */
      ConnectionArn?: string;
      /** Access Role Arn */
      AccessRoleArn?: string;
    };
  };
  InstanceConfiguration?: {
    /**
     * CPU
     * @minLength 3
     * @maxLength 9
     * @pattern 256|512|1024|2048|4096|(0.25|0.5|1|2|4) vCPU
     */
    Cpu?: string;
    /**
     * Memory
     * @minLength 3
     * @maxLength 6
     * @pattern 512|1024|2048|3072|4096|6144|8192|10240|12288|(0.5|1|2|3|4|6|8|10|12) GB
     */
    Memory?: string;
    /** Instance Role Arn */
    InstanceRoleArn?: string;
  };
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
  EncryptionConfiguration?: {
    /**
     * The KMS Key
     * @minLength 0
     * @maxLength 256
     * @pattern arn:aws(-[\w]+)*:kms:[a-z\-]+-[0-9]{1}:[0-9]{12}:key\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
     */
    KmsKey: string;
  };
  HealthCheckConfiguration?: {
    /**
     * Health Check Protocol
     * @enum ["TCP","HTTP"]
     */
    Protocol?: "TCP" | "HTTP";
    /** Health check Path */
    Path?: string;
    /** Health check Interval */
    Interval?: number;
    /**
     * Health check Timeout
     * @minimum 1
     * @maximum 20
     */
    Timeout?: number;
    /**
     * Health check Healthy Threshold
     * @minimum 1
     * @maximum 20
     */
    HealthyThreshold?: number;
    /**
     * Health check Unhealthy Threshold
     * @minimum 1
     * @maximum 20
     */
    UnhealthyThreshold?: number;
  };
  ObservabilityConfiguration?: {
    /** Observability enabled */
    ObservabilityEnabled: boolean;
    /**
     * The Amazon Resource Name (ARN) of the App Runner ObservabilityConfiguration.
     * @minLength 1
     * @maxLength 1011
     * @pattern arn:aws(-[\w]+)*:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[0-9]{12}:(\w|/|-){1,1011}
     */
    ObservabilityConfigurationArn?: string;
  };
  /**
   * Autoscaling configuration ARN
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\\.]{0,63}:[a-z0-9-\\.]{0,63}:[0-9]{12}:(\w|\/|-){1,1011}
   */
  AutoScalingConfigurationArn?: string;
  NetworkConfiguration?: {
    EgressConfiguration?: {
      /**
       * Network egress type.
       * @enum ["DEFAULT","VPC"]
       */
      EgressType: "DEFAULT" | "VPC";
      /**
       * The Amazon Resource Name (ARN) of the App Runner VpcConnector.
       * @minLength 44
       * @maxLength 1011
       * @pattern arn:aws(-[\w]+)*:[a-z0-9-\\.]{0,63}:[a-z0-9-\\.]{0,63}:[0-9]{12}:(\w|\/|-){1,1011}
       */
      VpcConnectorArn?: string;
    };
    IngressConfiguration?: {
      /** It's set to true if the Apprunner service is publicly accessible. It's set to false otherwise. */
      IsPubliclyAccessible: boolean;
    };
    /**
     * App Runner service endpoint IP address type
     * @enum ["IPV4","DUAL_STACK"]
     */
    IpAddressType?: "IPV4" | "DUAL_STACK";
  };
};
