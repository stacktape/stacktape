// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-securityconfig.json

/** Amazon OpenSearchServerless security config resource */
export type AwsOpensearchserverlessSecurityconfig = {
  /**
   * Security config description
   * @minLength 1
   * @maxLength 1000
   */
  Description?: string;
  /**
   * The identifier of the security config
   * @minLength 1
   * @maxLength 100
   */
  Id?: string;
  /**
   * The friendly name of the security config
   * @minLength 3
   * @maxLength 32
   * @pattern ^[a-z][a-z0-9-]{2,31}$
   */
  Name?: string;
  SamlOptions?: {
    /**
     * The XML saml provider metadata document that you want to use
     * @minLength 1
     * @maxLength 51200
     * @pattern [\u0009\u000A\u000D\u0020-\u007E\u00A1-\u00FF]+
     */
    Metadata: string;
    /**
     * Custom attribute for this saml integration
     * @minLength 1
     * @maxLength 2048
     * @pattern [\w+=,.@-]+
     */
    UserAttribute?: string;
    /**
     * Group attribute for this saml integration
     * @minLength 1
     * @maxLength 2048
     * @pattern [\w+=,.@-]+
     */
    GroupAttribute?: string;
    /**
     * Custom entity id attribute to override default entity id for this saml integration
     * @minLength 1
     * @maxLength 1024
     * @pattern ^aws:opensearch:[0-9]{12}:*
     */
    OpenSearchServerlessEntityId?: string;
    /** Defines the session timeout in minutes */
    SessionTimeout?: number;
  };
  IamIdentityCenterOptions?: {
    InstanceArn: string;
    ApplicationArn?: string;
    /** The name of the IAM Identity Center application used to integrate with OpenSearch Serverless */
    ApplicationName?: string;
    /** The description of the IAM Identity Center application used to integrate with OpenSearch Serverless */
    ApplicationDescription?: string;
    UserAttribute?: string;
    GroupAttribute?: string;
  };
  IamFederationOptions?: {
    /** Group attribute for this IAM federation integration */
    GroupAttribute?: string;
    /** User attribute for this IAM federation integration */
    UserAttribute?: string;
  };
  Type?: "saml" | "iamidentitycenter" | "iamfederation";
};
