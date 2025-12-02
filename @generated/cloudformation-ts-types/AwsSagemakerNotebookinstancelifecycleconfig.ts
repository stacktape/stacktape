// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-notebookinstancelifecycleconfig.json

/** Resource Type definition for AWS::SageMaker::NotebookInstanceLifecycleConfig */
export type AwsSagemakerNotebookinstancelifecycleconfig = {
  Id?: string;
  NotebookInstanceLifecycleConfigName?: string;
  /** @uniqueItems false */
  OnStart?: {
    Content?: string;
  }[];
  /** @uniqueItems false */
  OnCreate?: {
    Content?: string;
  }[];
};
