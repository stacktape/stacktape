// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-notebookinstance.json

/** Resource Type definition for AWS::SageMaker::NotebookInstance */
export type AwsSagemakerNotebookinstance = {
  KmsKeyId?: string;
  VolumeSizeInGB?: number;
  /** @uniqueItems false */
  AdditionalCodeRepositories?: string[];
  DefaultCodeRepository?: string;
  DirectInternetAccess?: string;
  PlatformIdentifier?: string;
  /** @uniqueItems false */
  AcceleratorTypes?: string[];
  SubnetId?: string;
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  RoleArn: string;
  InstanceMetadataServiceConfiguration?: {
    MinimumInstanceMetadataServiceVersion: string;
  };
  RootAccess?: string;
  Id?: string;
  NotebookInstanceName?: string;
  InstanceType: string;
  LifecycleConfigName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
