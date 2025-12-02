// This file is auto-generated. Do not edit manually.
// Source: aws-healthlake-fhirdatastore.json

/** HealthLake FHIR Datastore */
export type AwsHealthlakeFhirdatastore = {
  CreatedAt?: {
    /** Seconds since epoch. */
    Seconds: string;
    /** Nanoseconds. */
    Nanos: number;
  };
  DatastoreArn?: string;
  DatastoreEndpoint?: string;
  DatastoreId?: string;
  DatastoreName?: string;
  DatastoreStatus?: "CREATING" | "ACTIVE" | "DELETING" | "DELETED";
  DatastoreTypeVersion: "R4";
  PreloadDataConfig?: {
    /**
     * The type of preloaded data. Only Synthea preloaded data is supported.
     * @enum ["SYNTHEA"]
     */
    PreloadDataType: "SYNTHEA";
  };
  SseConfiguration?: {
    KmsEncryptionConfig: {
      /**
       * The type of customer-managed-key (CMK) used for encryption. The two types of supported CMKs are
       * customer owned CMKs and AWS owned CMKs.
       * @enum ["CUSTOMER_MANAGED_KMS_KEY","AWS_OWNED_KMS_KEY"]
       */
      CmkType: "CUSTOMER_MANAGED_KMS_KEY" | "AWS_OWNED_KMS_KEY";
      /**
       * The KMS encryption key id/alias used to encrypt the Data Store contents at rest.
       * @minLength 1
       * @maxLength 400
       * @pattern (arn:aws((-us-gov)|(-iso)|(-iso-b)|(-cn))?:kms:)?([a-z]{2}-[a-z]+(-[a-z]+)?-\d:)?(\d{12}:)?(((key/)?[a-zA-Z0-9-_]+)|(alias/[a-zA-Z0-9:/_-]+))
       */
      KmsKeyId?: string;
    };
  };
  IdentityProviderConfiguration?: {
    /**
     * Type of Authorization Strategy. The two types of supported Authorization strategies are
     * SMART_ON_FHIR_V1 and AWS_AUTH.
     * @enum ["SMART_ON_FHIR_V1","AWS_AUTH","SMART_ON_FHIR"]
     */
    AuthorizationStrategy: "SMART_ON_FHIR_V1" | "AWS_AUTH" | "SMART_ON_FHIR";
    /** Flag to indicate if fine-grained authorization will be enabled for the datastore */
    FineGrainedAuthorizationEnabled?: boolean;
    /** The JSON metadata elements for identity provider configuration. */
    Metadata?: string;
    /**
     * The Amazon Resource Name (ARN) of the Lambda function that will be used to decode the access token
     * created by the authorization server.
     * @minLength 49
     * @maxLength 256
     * @pattern arn:aws[-a-z]*:lambda:[a-z]{2}-[a-z]+-\d{1}:\d{12}:function:[a-zA-Z0-9\-_\.]+(:(\$LATEST|[a-zA-Z0-9\-_]+))?
     */
    IdpLambdaArn?: string;
  };
  Tags?: {
    /**
     * The key of the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value of the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
