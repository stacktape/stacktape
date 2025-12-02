// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-imageversion.json

/** Resource Type definition for AWS::SageMaker::ImageVersion */
export type AwsSagemakerImageversion = {
  ImageName: string;
  ImageArn?: string;
  ImageVersionArn?: string;
  BaseImage: string;
  ContainerImage?: string;
  Version?: number;
  Alias?: string;
  Aliases?: string[];
  VendorGuidance?: "NOT_PROVIDED" | "STABLE" | "TO_BE_ARCHIVED" | "ARCHIVED";
  JobType?: "TRAINING" | "INFERENCE" | "NOTEBOOK_KERNEL";
  MLFramework?: string;
  ProgrammingLang?: string;
  Processor?: "CPU" | "GPU";
  Horovod?: boolean;
  ReleaseNotes?: string;
};
