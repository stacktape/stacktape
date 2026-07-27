// This file is auto-generated. Do not edit manually.
// Source: aws-appintegrations-application.json

/** Resource Type definition for AWS:AppIntegrations::Application */
export type AwsAppintegrationsApplication = {
  /**
   * The name of the application.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\/\._ \-]+$
   */
  Name: string;
  /**
   * The id of the application.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9/\._\-]+$
   */
  Id?: string;
  /**
   * The namespace of the application.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9/\._\-]+$
   */
  Namespace: string;
  /**
   * The application description.
   * @minLength 1
   * @maxLength 1000
   */
  Description: string;
  /**
   * The Amazon Resource Name (ARN) of the application.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z0-9]*:app-integrations:[-a-z0-9]*:[0-9]{12}:application/[-a-zA-Z0-9]*
   */
  ApplicationArn?: string;
  /** Application source config */
  ApplicationSourceConfig: {
    ExternalUrlConfig: {
      /**
       * @minLength 1
       * @maxLength 1000
       * @pattern ^\w+\:\/\/.*$
       */
      AccessUrl: string;
      /**
       * @minItems 0
       * @maxItems 50
       */
      ApprovedOrigins?: string[];
    };
  };
  /**
   * The configuration of events or requests that the application has access to.
   * @minItems 0
   * @maxItems 150
   */
  Permissions?: string[];
  /**
   * The tags (keys and values) associated with the application.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * A key to identify the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * Corresponding tag value for the key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Indicates if the application is a service
   * @default false
   */
  IsService?: boolean;
  /** The initialization timeout in milliseconds. Required when IsService is true. */
  InitializationTimeout?: number;
  /** The application configuration. Cannot be used when IsService is true. */
  ApplicationConfig?: {
    ContactHandling?: {
      /** @enum ["CROSS_CONTACTS","PER_CONTACT"] */
      Scope: "CROSS_CONTACTS" | "PER_CONTACT";
    };
  };
  /** The iframe configuration */
  IframeConfig?: {
    Allow?: string[];
    Sandbox?: string[];
  };
};
