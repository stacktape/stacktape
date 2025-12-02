// This file is auto-generated. Do not edit manually.
// Source: aws-comprehend-documentclassifier.json

/** Document Classifier enables training document classifier models. */
export type AwsComprehendDocumentclassifier = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws(-[^:]+)?:iam::[0-9]{12}:role/.+
   */
  DataAccessRoleArn: string;
  InputDataConfig: {
    /** @uniqueItems true */
    AugmentedManifests?: ({
      /**
       * @minItems 1
       * @maxItems 63
       * @uniqueItems true
       */
      AttributeNames: string[];
      S3Uri: string;
      /** @enum ["TRAIN","TEST"] */
      Split?: "TRAIN" | "TEST";
    })[];
    /** @enum ["COMPREHEND_CSV","AUGMENTED_MANIFEST"] */
    DataFormat?: "COMPREHEND_CSV" | "AUGMENTED_MANIFEST";
    /**
     * @minLength 1
     * @maxLength 1
     * @pattern ^[ ~!@#$%^*\-_+=|\\:;\t>?/]$
     */
    LabelDelimiter?: string;
    /** @enum ["PLAIN_TEXT_DOCUMENT","SEMI_STRUCTURED_DOCUMENT"] */
    DocumentType?: "PLAIN_TEXT_DOCUMENT" | "SEMI_STRUCTURED_DOCUMENT";
    Documents?: {
      S3Uri: string;
      TestS3Uri?: string;
    };
    DocumentReaderConfig?: {
      /** @enum ["TEXTRACT_DETECT_DOCUMENT_TEXT","TEXTRACT_ANALYZE_DOCUMENT"] */
      DocumentReadAction: "TEXTRACT_DETECT_DOCUMENT_TEXT" | "TEXTRACT_ANALYZE_DOCUMENT";
      /** @enum ["SERVICE_DEFAULT","FORCE_DOCUMENT_READ_ACTION"] */
      DocumentReadMode?: "SERVICE_DEFAULT" | "FORCE_DOCUMENT_READ_ACTION";
      /**
       * @minItems 1
       * @maxItems 2
       * @uniqueItems true
       */
      FeatureTypes?: ("TABLES" | "FORMS")[];
    };
    S3Uri?: string;
    TestS3Uri?: string;
  };
  OutputDataConfig?: {
    KmsKeyId?: string;
    S3Uri?: string;
  };
  /** @enum ["en","es","fr","it","de","pt"] */
  LanguageCode: "en" | "es" | "fr" | "it" | "de" | "pt";
  ModelKmsKeyId?: string;
  /**
   * @minLength 1
   * @maxLength 20000
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  ModelPolicy?: string;
  /**
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*$
   */
  DocumentClassifierName: string;
  /** @enum ["MULTI_CLASS","MULTI_LABEL"] */
  Mode?: "MULTI_CLASS" | "MULTI_LABEL";
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
  /**
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*$
   */
  VersionName?: string;
  VolumeKmsKeyId?: string;
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
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern arn:aws(-[^:]+)?:comprehend:[a-zA-Z0-9-]*:[0-9]{12}:document-classifier/[a-zA-Z0-9](-*[a-zA-Z0-9])*(/version/[a-zA-Z0-9](-*[a-zA-Z0-9])*)?
   */
  Arn?: string;
};
