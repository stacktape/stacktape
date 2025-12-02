// This file is auto-generated. Do not edit manually.
// Source: aws-comprehend-flywheel.json

/**
 * The AWS::Comprehend::Flywheel resource creates an Amazon Comprehend Flywheel that enables customer
 * to train their model.
 */
export type AwsComprehendFlywheel = {
  /**
   * @maxLength 256
   * @pattern arn:aws(-[^:]+)?:comprehend:[a-zA-Z0-9-]*:[0-9]{12}:(document-classifier|entity-recognizer)/[a-zA-Z0-9](-*[a-zA-Z0-9])*(/version/[a-zA-Z0-9](-*[a-zA-Z0-9])*)?
   */
  ActiveModelArn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws(-[^:]+)?:iam::[0-9]{12}:role/.+
   */
  DataAccessRoleArn: string;
  /**
   * @maxLength 512
   * @pattern s3://[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9](/.*)?
   */
  DataLakeS3Uri: string;
  DataSecurityConfig?: {
    ModelKmsKeyId?: string;
    VolumeKmsKeyId?: string;
    DataLakeKmsKeyId?: string;
    VpcConfig?: {
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      SecurityGroupIds: string[];
      /**
       * @minItems 1
       * @maxItems 16
       * @uniqueItems true
       */
      Subnets: string[];
    };
  };
  /**
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*$
   */
  FlywheelName: string;
  /** @enum ["DOCUMENT_CLASSIFIER","ENTITY_RECOGNIZER"] */
  ModelType?: "DOCUMENT_CLASSIFIER" | "ENTITY_RECOGNIZER";
  /** @uniqueItems true */
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
  TaskConfig?: {
    /** @enum ["en","es","fr","it","de","pt"] */
    LanguageCode: "en" | "es" | "fr" | "it" | "de" | "pt";
    DocumentClassificationConfig?: {
      /** @enum ["MULTI_CLASS","MULTI_LABEL"] */
      Mode: "MULTI_CLASS" | "MULTI_LABEL";
      /**
       * @maxItems 1000
       * @uniqueItems true
       */
      Labels?: string[];
    };
    EntityRecognitionConfig?: {
      /**
       * @minItems 1
       * @maxItems 25
       * @uniqueItems true
       */
      EntityTypes?: {
        /**
         * @minLength 1
         * @maxLength 64
         * @pattern ^(?![^\n\r\t,]*\\n|\\r|\\t)[^\n\r\t,]+$
         */
        Type: string;
      }[];
    };
  };
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern arn:aws(-[^:]+)?:comprehend:[a-zA-Z0-9-]*:[0-9]{12}:flywheel/[a-zA-Z0-9](-*[a-zA-Z0-9])*
   */
  Arn?: string;
};
