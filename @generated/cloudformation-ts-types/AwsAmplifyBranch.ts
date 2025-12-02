// This file is auto-generated. Do not edit manually.
// Source: aws-amplify-branch.json

/** The AWS::Amplify::Branch resource creates a new branch within an app. */
export type AwsAmplifyBranch = {
  /**
   * @minLength 1
   * @maxLength 20
   * @pattern d[a-z0-9]+
   */
  AppId: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  Arn?: string;
  BasicAuthConfig?: {
    EnableBasicAuth?: boolean;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Username: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Password: string;
  };
  Backend?: {
    /**
     * @minLength 20
     * @maxLength 2048
     */
    StackArn?: string;
  };
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern (?s).+
   */
  BranchName: string;
  /**
   * @minLength 1
   * @maxLength 25000
   * @pattern (?s).+
   */
  BuildSpec?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   * @pattern (?s).*
   */
  ComputeRoleArn?: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  Description?: string;
  EnableAutoBuild?: boolean;
  EnablePerformanceMode?: boolean;
  EnablePullRequestPreview?: boolean;
  EnableSkewProtection?: boolean;
  /** @uniqueItems false */
  EnvironmentVariables?: {
    /**
     * @maxLength 255
     * @pattern (?s).*
     */
    Name: string;
    /**
     * @maxLength 5500
     * @pattern (?s).*
     */
    Value: string;
  }[];
  /**
   * @maxLength 255
   * @pattern (?s).*
   */
  Framework?: string;
  /**
   * @maxLength 20
   * @pattern (?s).*
   */
  PullRequestEnvironmentName?: string;
  /** @enum ["EXPERIMENTAL","BETA","PULL_REQUEST","PRODUCTION","DEVELOPMENT"] */
  Stage?: "EXPERIMENTAL" | "BETA" | "PULL_REQUEST" | "PRODUCTION" | "DEVELOPMENT";
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
