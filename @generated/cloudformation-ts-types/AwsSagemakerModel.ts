// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-model.json

/** Resource Type definition for AWS::SageMaker::Model */
export type AwsSagemakerModel = {
  ExecutionRoleArn?: string;
  EnableNetworkIsolation?: boolean;
  PrimaryContainer?: {
    ImageConfig?: {
      RepositoryAuthConfig?: {
        RepositoryCredentialsProviderArn: string;
      };
      RepositoryAccessMode: string;
    };
    InferenceSpecificationName?: string;
    ContainerHostname?: string;
    ModelPackageName?: string;
    Mode?: string;
    Environment?: Record<string, unknown>;
    ModelDataUrl?: string;
    Image?: string;
    ModelDataSource?: {
      S3DataSource: {
        ModelAccessConfig?: {
          AcceptEula: boolean;
        };
        S3DataType: string;
        CompressionType: string;
        HubAccessConfig?: {
          HubContentArn: string;
        };
        S3Uri: string;
      };
    };
    MultiModelConfig?: {
      ModelCacheSetting?: string;
    };
  };
  ModelName?: string;
  VpcConfig?: {
    /** @uniqueItems false */
    SecurityGroupIds: string[];
    /** @uniqueItems false */
    Subnets: string[];
  };
  /** @uniqueItems false */
  Containers?: {
    ImageConfig?: {
      RepositoryAuthConfig?: {
        RepositoryCredentialsProviderArn: string;
      };
      RepositoryAccessMode: string;
    };
    InferenceSpecificationName?: string;
    ContainerHostname?: string;
    ModelPackageName?: string;
    Mode?: string;
    Environment?: Record<string, unknown>;
    ModelDataUrl?: string;
    Image?: string;
    ModelDataSource?: {
      S3DataSource: {
        ModelAccessConfig?: {
          AcceptEula: boolean;
        };
        S3DataType: string;
        CompressionType: string;
        HubAccessConfig?: {
          HubContentArn: string;
        };
        S3Uri: string;
      };
    };
    MultiModelConfig?: {
      ModelCacheSetting?: string;
    };
  }[];
  InferenceExecutionConfig?: {
    Mode: string;
  };
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
