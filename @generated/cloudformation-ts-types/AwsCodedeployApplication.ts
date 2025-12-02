// This file is auto-generated. Do not edit manually.
// Source: aws-codedeploy-application.json

/** The AWS::CodeDeploy::Application resource creates an AWS CodeDeploy application */
export type AwsCodedeployApplication = {
  /**
   * A name for the application. If you don't specify a name, AWS CloudFormation generates a unique
   * physical ID and uses that ID for the application name.
   */
  ApplicationName?: string;
  /** The compute platform that CodeDeploy deploys the application to. */
  ComputePlatform?: string;
  /**
   * The metadata that you apply to CodeDeploy applications to help you organize and categorize them.
   * Each tag consists of a key and an optional value, both of which you define.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
