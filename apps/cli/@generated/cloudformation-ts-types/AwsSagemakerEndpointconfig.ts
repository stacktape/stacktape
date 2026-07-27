// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-endpointconfig.json

/** Resource Type definition for AWS::SageMaker::EndpointConfig */
export type AwsSagemakerEndpointconfig = {
  /** @uniqueItems false */
  ShadowProductionVariants?: {
    ManagedInstanceScaling?: {
      Status?: string;
      MaxInstanceCount?: number;
      MinInstanceCount?: number;
    };
    ModelName?: string;
    VolumeSizeInGB?: number;
    EnableSSMAccess?: boolean;
    VariantName: string;
    InitialInstanceCount?: number;
    RoutingConfig?: {
      RoutingStrategy?: string;
    };
    InitialVariantWeight?: number;
    ModelDataDownloadTimeoutInSeconds?: number;
    CapacityReservationConfig?: {
      MlReservationArn?: string;
      CapacityReservationPreference?: string;
    };
    InferenceAmiVersion?: string;
    ContainerStartupHealthCheckTimeoutInSeconds?: number;
    ServerlessConfig?: {
      MaxConcurrency: number;
      MemorySizeInMB: number;
      ProvisionedConcurrency?: number;
    };
    InstanceType?: string;
  }[];
  DataCaptureConfig?: {
    /** @uniqueItems false */
    CaptureOptions: {
      CaptureMode: string;
    }[];
    KmsKeyId?: string;
    DestinationS3Uri: string;
    InitialSamplingPercentage: number;
    CaptureContentTypeHeader?: {
      /** @uniqueItems false */
      CsvContentTypes?: string[];
      /** @uniqueItems false */
      JsonContentTypes?: string[];
    };
    EnableCapture?: boolean;
  };
  ExecutionRoleArn?: string;
  EnableNetworkIsolation?: boolean;
  /** @uniqueItems false */
  ProductionVariants: {
    ManagedInstanceScaling?: {
      Status?: string;
      MaxInstanceCount?: number;
      MinInstanceCount?: number;
    };
    ModelName?: string;
    VolumeSizeInGB?: number;
    EnableSSMAccess?: boolean;
    VariantName: string;
    InitialInstanceCount?: number;
    RoutingConfig?: {
      RoutingStrategy?: string;
    };
    InitialVariantWeight?: number;
    ModelDataDownloadTimeoutInSeconds?: number;
    CapacityReservationConfig?: {
      MlReservationArn?: string;
      CapacityReservationPreference?: string;
    };
    InferenceAmiVersion?: string;
    ContainerStartupHealthCheckTimeoutInSeconds?: number;
    ServerlessConfig?: {
      MaxConcurrency: number;
      MemorySizeInMB: number;
      ProvisionedConcurrency?: number;
    };
    InstanceType?: string;
  }[];
  KmsKeyId?: string;
  AsyncInferenceConfig?: {
    ClientConfig?: {
      MaxConcurrentInvocationsPerInstance?: number;
    };
    OutputConfig: {
      NotificationConfig?: {
        /** @uniqueItems false */
        IncludeInferenceResponseIn?: string[];
        SuccessTopic?: string;
        ErrorTopic?: string;
      };
      KmsKeyId?: string;
      S3OutputPath?: string;
      S3FailurePath?: string;
    };
  };
  VpcConfig?: {
    /** @uniqueItems false */
    SecurityGroupIds: string[];
    /** @uniqueItems false */
    Subnets: string[];
  };
  EndpointConfigName?: string;
  ExplainerConfig?: {
    ClarifyExplainerConfig?: {
      EnableExplanations?: string;
      ShapConfig: {
        TextConfig?: {
          Language: string;
          Granularity: string;
        };
        UseLogit?: boolean;
        Seed?: number;
        ShapBaselineConfig: {
          MimeType?: string;
          ShapBaseline?: string;
          ShapBaselineUri?: string;
        };
        NumberOfSamples?: number;
      };
      InferenceConfig?: {
        ContentTemplate?: string;
        /** @uniqueItems false */
        LabelHeaders?: Record<string, unknown>[];
        MaxPayloadInMB?: number;
        ProbabilityIndex?: number;
        LabelAttribute?: string;
        /** @uniqueItems false */
        FeatureTypes?: Record<string, unknown>[];
        /** @uniqueItems false */
        FeatureHeaders?: Record<string, unknown>[];
        LabelIndex?: number;
        ProbabilityAttribute?: string;
        FeaturesAttribute?: string;
        MaxRecordCount?: number;
      };
    };
  };
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
