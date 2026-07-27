// This file is auto-generated. Do not edit manually.
// Source: aws-events-connection.json

/** Resource Type definition for AWS::Events::Connection. */
export type AwsEventsConnection = {
  /**
   * Name of the connection.
   * @minLength 1
   * @maxLength 64
   * @pattern [\.\-_A-Za-z0-9]+
   */
  Name?: string;
  /**
   * The arn of the connection resource.
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:connection\/[\.\-_A-Za-z0-9]+\/[\-A-Za-z0-9]+$
   */
  Arn?: string;
  /**
   * The arn of the connection resource to be used in IAM policies.
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:connection\/[\.\-_A-Za-z0-9]+$
   */
  ArnForPolicy?: string;
  /**
   * The arn of the secrets manager secret created in the customer account.
   * @pattern ^arn:aws([a-z]|\-)*:secretsmanager:([a-z]|\d|\-)*:([0-9]{12})?:secret:([a-z]|\d|\-)*(!)*[\/_+=\.@\-A-Za-z0-9]+$
   */
  SecretArn?: string;
  /**
   * Description of the connection.
   * @maxLength 512
   */
  Description?: string;
  /** @enum ["API_KEY","BASIC","OAUTH_CLIENT_CREDENTIALS"] */
  AuthorizationType?: "API_KEY" | "BASIC" | "OAUTH_CLIENT_CREDENTIALS";
  AuthParameters?: unknown | unknown | unknown;
  /** The private resource the HTTP request will be sent to. */
  InvocationConnectivityParameters?: {
    ResourceParameters: {
      /**
       * @maxLength 2048
       * @pattern ^arn:[a-z0-9f\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:resourceconfiguration/rcfg-[0-9a-z]{17}$
       */
      ResourceConfigurationArn: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetworkresourceassociation/snra-[0-9a-z]{17}$
       */
      ResourceAssociationArn?: string;
    };
  };
  /**
   * @maxLength 2048
   * @pattern ^[a-zA-Z0-9_\-/:]*$
   */
  KmsKeyIdentifier?: string;
};
