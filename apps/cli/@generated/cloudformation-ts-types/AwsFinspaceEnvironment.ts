// This file is auto-generated. Do not edit manually.
// Source: aws-finspace-environment.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsFinspaceEnvironment = {
  /**
   * Unique identifier for representing FinSpace Environment
   * @pattern ^[a-zA-Z0-9]{1,26}$
   */
  EnvironmentId?: string;
  /**
   * Name of the Environment
   * @pattern ^[a-zA-Z0-9]+[a-zA-Z0-9-]*[a-zA-Z0-9]{1,255}$
   */
  Name: string;
  /**
   * AWS account ID associated with the Environment
   * @pattern ^[a-zA-Z0-9]{1,26}$
   */
  AwsAccountId?: string;
  /**
   * Description of the Environment
   * @pattern ^[a-zA-Z0-9. ]{1,1000}$
   */
  Description?: string;
  /**
   * State of the Environment
   * @enum ["CREATE_REQUESTED","CREATING","CREATED","DELETE_REQUESTED","DELETING","DELETED","FAILED_CREATION","FAILED_DELETION","RETRY_DELETION","SUSPENDED"]
   */
  Status?: "CREATE_REQUESTED" | "CREATING" | "CREATED" | "DELETE_REQUESTED" | "DELETING" | "DELETED" | "FAILED_CREATION" | "FAILED_DELETION" | "RETRY_DELETION" | "SUSPENDED";
  /**
   * URL used to login to the Environment
   * @pattern ^[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]{1,1000}
   */
  EnvironmentUrl?: string;
  /**
   * ARN of the Environment
   * @pattern ^arn:aws:finspace:[A-Za-z0-9_/.-]{0,63}:\d+:environment/[0-9A-Za-z_-]{1,128}$
   */
  EnvironmentArn?: string;
  /**
   * SageMaker Studio Domain URL associated with the Environment
   * @pattern ^[a-zA-Z-0-9-:\/.]*{1,1000}$
   */
  SageMakerStudioDomainUrl?: string;
  /**
   * KMS key used to encrypt customer data within FinSpace Environment infrastructure
   * @pattern ^[a-zA-Z-0-9-:\/]*{1,1000}$
   */
  KmsKeyId?: string;
  /**
   * ID for FinSpace created account used to store Environment artifacts
   * @pattern ^[a-zA-Z0-9]{1,26}$
   */
  DedicatedServiceAccountId?: string;
  /**
   * Federation mode used with the Environment
   * @enum ["LOCAL","FEDERATED"]
   */
  FederationMode?: "LOCAL" | "FEDERATED";
  FederationParameters?: {
    /**
     * SAML metadata URL to link with the Environment
     * @pattern ^https?://[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]{1,1000}
     */
    SamlMetadataURL?: string;
    /**
     * Federation provider name to link with the Environment
     * @minLength 1
     * @maxLength 32
     * @pattern [^_\p{Z}][\p{L}\p{M}\p{S}\p{N}\p{P}][^_\p{Z}]+
     */
    FederationProviderName?: string;
    /**
     * SAML metadata document to link the federation provider to the Environment
     * @minLength 1000
     * @maxLength 10000000
     * @pattern .*
     */
    SamlMetadataDocument?: string;
    /**
     * SAML metadata URL to link with the Environment
     * @pattern ^https?://[-a-zA-Z0-9+&amp;@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&amp;@#/%=~_|]{1,1000}
     */
    ApplicationCallBackURL?: string;
    /** SAML metadata URL to link with the Environment */
    FederationURN?: string;
    /**
     * Attribute map for SAML configuration
     * @uniqueItems false
     */
    AttributeMap?: {
      /**
       * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
       * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
       * letters, digits, whitespace, _, ., /, =, +, and -.
       * @minLength 1
       * @maxLength 128
       */
      Key?: string;
      /**
       * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
       * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
       * letters, digits, whitespace, _, ., /, =, +, and -.
       * @minLength 0
       * @maxLength 256
       */
      Value?: string;
    }[];
  };
  SuperuserParameters?: {
    /**
     * First name
     * @minLength 1
     * @maxLength 50
     * @pattern ^[a-zA-Z0-9]{1,50}$
     */
    FirstName?: string;
    /**
     * Last name
     * @minLength 1
     * @maxLength 50
     * @pattern ^[a-zA-Z0-9]{1,50}$
     */
    LastName?: string;
    /**
     * Email address
     * @minLength 1
     * @maxLength 128
     * @pattern [A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+[.]+[A-Za-z]+
     */
    EmailAddress?: string;
  };
  /**
   * ARNs of FinSpace Data Bundles to install
   * @uniqueItems false
   */
  DataBundles?: string[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
