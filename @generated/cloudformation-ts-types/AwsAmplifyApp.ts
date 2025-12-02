// This file is auto-generated. Do not edit manually.
// Source: aws-amplify-app.json

/**
 * The AWS::Amplify::App resource creates Apps in the Amplify Console. An App is a collection of
 * branches.
 */
export type AwsAmplifyApp = {
  /**
   * @minLength 1
   * @maxLength 255
   */
  AccessToken?: string;
  /**
   * @minLength 1
   * @maxLength 20
   * @pattern d[a-z0-9]+
   */
  AppId?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern (?s).+
   */
  AppName?: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  Arn?: string;
  AutoBranchCreationConfig?: {
    /** @uniqueItems false */
    AutoBranchCreationPatterns?: string[];
    BasicAuthConfig?: {
      EnableBasicAuth?: boolean;
      /**
       * @minLength 1
       * @maxLength 255
       */
      Username?: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      Password?: string;
    };
    /**
     * @minLength 1
     * @maxLength 25000
     */
    BuildSpec?: string;
    EnableAutoBranchCreation?: boolean;
    EnableAutoBuild?: boolean;
    EnablePerformanceMode?: boolean;
    EnablePullRequestPreview?: boolean;
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
  };
  BasicAuthConfig?: {
    EnableBasicAuth?: boolean;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Username?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Password?: string;
  };
  /**
   * @minLength 1
   * @maxLength 25000
   * @pattern (?s).+
   */
  BuildSpec?: string;
  CacheConfig?: {
    /** @enum ["AMPLIFY_MANAGED","AMPLIFY_MANAGED_NO_COOKIES"] */
    Type?: "AMPLIFY_MANAGED" | "AMPLIFY_MANAGED_NO_COOKIES";
  };
  /**
   * @minLength 0
   * @maxLength 1000
   * @pattern (?s).*
   */
  ComputeRoleArn?: string;
  /**
   * @minLength 0
   * @maxLength 25000
   * @pattern (?s).*
   */
  CustomHeaders?: string;
  /** @uniqueItems false */
  CustomRules?: {
    /**
     * @minLength 0
     * @maxLength 2048
     * @pattern (?s).*
     */
    Condition?: string;
    /**
     * @minLength 3
     * @maxLength 7
     * @pattern .{3,7}
     */
    Status?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern (?s).+
     */
    Target: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern (?s).+
     */
    Source: string;
  }[];
  /**
   * @minLength 0
   * @maxLength 1000
   */
  DefaultDomain?: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  Description?: string;
  EnableBranchAutoDeletion?: boolean;
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
   * @minLength 1
   * @maxLength 1000
   * @pattern (?s).*
   */
  IAMServiceRole?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern (?s).+
   */
  Name: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  OauthToken?: string;
  /** @enum ["WEB","WEB_DYNAMIC","WEB_COMPUTE"] */
  Platform?: "WEB" | "WEB_DYNAMIC" | "WEB_COMPUTE";
  /** @pattern (?s).* */
  Repository?: string;
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
     */
    Value: string;
  }[];
  JobConfig?: {
    /** @enum ["STANDARD_8GB","LARGE_16GB","XLARGE_72GB"] */
    BuildComputeType: "STANDARD_8GB" | "LARGE_16GB" | "XLARGE_72GB";
  };
};
