// This file is auto-generated. Do not edit manually.
// Source: aws-logs-integration.json

/** Resource Schema for Logs Integration Resource */
export type AwsLogsIntegration = {
  /**
   * User provided identifier for integration, unique to the user account.
   * @minLength 1
   * @maxLength 50
   * @pattern [\.\-_/#A-Za-z0-9]+
   */
  IntegrationName: string;
  /**
   * The type of the Integration.
   * @enum ["OPENSEARCH"]
   */
  IntegrationType: "OPENSEARCH";
  /** OpenSearchResourceConfig for the given Integration */
  ResourceConfig: {
    OpenSearchResourceConfig?: {
      KmsKeyArn?: string;
      DataSourceRoleArn: string;
      DashboardViewerPrincipals: string[];
      ApplicationARN?: string;
      /**
       * @minimum 1
       * @maximum 3650
       */
      RetentionDays?: number;
    };
  };
  /**
   * Status of creation for the Integration and its resources
   * @enum ["PROVISIONING","ACTIVE","FAILED"]
   */
  IntegrationStatus?: "PROVISIONING" | "ACTIVE" | "FAILED";
};
