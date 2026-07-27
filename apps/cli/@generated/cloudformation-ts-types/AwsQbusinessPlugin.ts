// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-plugin.json

/** Definition of AWS::QBusiness::Plugin Resource Type */
export type AwsQbusinessPlugin = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId?: string;
  AuthConfiguration: {
    BasicAuthConfiguration: {
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      SecretArn: string;
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      RoleArn: string;
    };
  } | {
    OAuth2ClientCredentialConfiguration: {
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      SecretArn: string;
      /**
       * @minLength 0
       * @maxLength 1284
       * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
       */
      RoleArn: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^(https?|ftp|file)://([^\s]*)$
       */
      AuthorizationUrl?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^(https?|ftp|file)://([^\s]*)$
       */
      TokenUrl?: string;
    };
  } | {
    NoAuthConfiguration: Record<string, unknown>;
  };
  BuildStatus?: "READY" | "CREATE_IN_PROGRESS" | "CREATE_FAILED" | "UPDATE_IN_PROGRESS" | "UPDATE_FAILED" | "DELETE_IN_PROGRESS" | "DELETE_FAILED";
  CreatedAt?: string;
  CustomPluginConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 200
     */
    Description: string;
    ApiSchemaType: "OPEN_API_V3";
    ApiSchema: {
      Payload: string;
    } | {
      S3: {
        /**
         * @minLength 1
         * @maxLength 63
         * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
         */
        Bucket: string;
        /**
         * @minLength 1
         * @maxLength 1024
         */
        Key: string;
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  PluginArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  PluginId?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^(https?|ftp|file)://([^\s]*)$
   */
  ServerUrl?: string;
  State?: "ENABLED" | "DISABLED";
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Type: "SERVICE_NOW" | "SALESFORCE" | "JIRA" | "ZENDESK" | "CUSTOM" | "QUICKSIGHT" | "SERVICENOW_NOW_PLATFORM" | "JIRA_CLOUD" | "SALESFORCE_CRM" | "ZENDESK_SUITE" | "ATLASSIAN_CONFLUENCE" | "GOOGLE_CALENDAR" | "MICROSOFT_TEAMS" | "MICROSOFT_EXCHANGE" | "PAGERDUTY_ADVANCE" | "SMARTSHEET" | "ASANA";
  UpdatedAt?: string;
};
