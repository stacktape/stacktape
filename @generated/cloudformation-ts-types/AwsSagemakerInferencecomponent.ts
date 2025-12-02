// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-inferencecomponent.json

/** Resource Type definition for AWS::SageMaker::InferenceComponent */
export type AwsSagemakerInferencecomponent = {
  InferenceComponentArn?: string;
  InferenceComponentName?: string;
  EndpointArn?: string;
  EndpointName: string;
  VariantName?: string;
  FailureReason?: string;
  Specification: {
    ModelName?: string;
    BaseInferenceComponentName?: string;
    Container?: {
      DeployedImage?: {
        SpecifiedImage?: string;
        ResolvedImage?: string;
        ResolutionTime?: string;
      };
      Image?: string;
      ArtifactUrl?: string;
      Environment?: Record<string, string>;
    };
    StartupParameters?: {
      ModelDataDownloadTimeoutInSeconds?: number;
      ContainerStartupHealthCheckTimeoutInSeconds?: number;
    };
    ComputeResourceRequirements?: {
      NumberOfCpuCoresRequired?: number;
      NumberOfAcceleratorDevicesRequired?: number;
      MinMemoryRequiredInMb?: number;
      MaxMemoryRequiredInMb?: number;
    };
  };
  RuntimeConfig?: {
    CopyCount?: number;
    DesiredCopyCount?: number;
    CurrentCopyCount?: number;
  };
  DeploymentConfig?: {
    RollingUpdatePolicy?: {
      MaximumBatchSize?: {
        Type: "COPY_COUNT" | "CAPACITY_PERCENT";
        Value: number;
      };
      WaitIntervalInSeconds?: number;
      RollbackMaximumBatchSize?: {
        Type: "COPY_COUNT" | "CAPACITY_PERCENT";
        Value: number;
      };
      MaximumExecutionTimeoutInSeconds?: number;
    };
    AutoRollbackConfiguration?: {
      /**
       * @minItems 1
       * @maxItems 10
       */
      Alarms: {
        /**
         * @minLength 1
         * @maxLength 255
         * @pattern ^(?!\s*$).+
         */
        AlarmName: string;
      }[];
    };
  };
  InferenceComponentStatus?: "InService" | "Creating" | "Updating" | "Failed" | "Deleting";
  CreationTime?: string;
  LastModifiedTime?: string;
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
