// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchservice-application.json

/** Amazon OpenSearchService application resource */
export type AwsOpensearchserviceApplication = {
  /** Options for configuring IAM Identity Center */
  IamIdentityCenterOptions?: {
    /** Whether IAM Identity Center is enabled. */
    Enabled?: boolean;
    /** The ARN of the IAM Identity Center instance. */
    IamIdentityCenterInstanceArn?: unknown;
    /** The ARN of the IAM role for Identity Center application. */
    IamRoleForIdentityCenterApplicationArn?: string;
  };
  /** Amazon Resource Name (ARN) format. */
  Arn?: string;
  /**
   * The identifier of the application.
   * @minLength 3
   * @maxLength 40
   */
  Id?: string;
  /**
   * The name of the application.
   * @minLength 3
   * @maxLength 40
   * @pattern [a-z][a-z0-9\-]+
   */
  Name: string;
  /** The endpoint for the application. */
  Endpoint?: string;
  /** List of application configurations. */
  AppConfigs?: ({
    /** The configuration key */
    Key: "opensearchDashboards.dashboardAdmin.users" | "opensearchDashboards.dashboardAdmin.groups";
    /**
     * The configuration value.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  })[];
  /** List of data sources. */
  DataSources?: {
    /** The ARN of the data source. */
    DataSourceArn: unknown;
    /** Description of the data source. */
    DataSourceDescription?: string;
  }[];
  /**
   * An arbitrary set of tags (key-value pairs) for this application.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key in the key-value pair
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value in the key-value pair
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
