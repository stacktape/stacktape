// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-coderepository.json

/** Resource Type definition for AWS::SageMaker::CodeRepository */
export type AwsSagemakerCoderepository = {
  GitConfig: {
    SecretArn?: string;
    RepositoryUrl: string;
    Branch?: string;
  };
  CodeRepositoryName?: string;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
