// This file is auto-generated. Do not edit manually.
// Source: aws-logs-transformer.json

/**
 * Specifies a transformer on the log group to transform logs into consistent structured and
 * information rich format.
 */
export type AwsLogsTransformer = {
  /**
   * Existing log group that you want to associate with this transformer.
   * @minLength 1
   * @maxLength 2048
   * @pattern [\w#+=/:,.@-]*
   */
  LogGroupIdentifier: string;
  /**
   * List of processors in a transformer
   * @minItems 1
   * @maxItems 20
   */
  TransformerConfig: ({
    ParseCloudfront?: {
      Source?: string;
    };
    ParseVPC?: {
      Source?: string;
    };
    ParseWAF?: {
      Source?: string;
    };
    ParseJSON?: {
      Source?: string;
      Destination?: string;
    };
    ParseRoute53?: {
      Source?: string;
    };
    ParsePostgres?: {
      Source?: string;
    };
    ParseToOCSF?: {
      Source?: string;
      EventSource: "CloudTrail" | "Route53Resolver" | "VPCFlow" | "EKSAudit" | "AWSWAF";
      OcsfVersion: "V1.1";
    };
    ParseKeyValue?: {
      Source?: string;
      Destination?: string;
      FieldDelimiter?: string;
      KeyValueDelimiter?: string;
      KeyPrefix?: string;
      NonMatchValue?: string;
      OverwriteIfExists?: boolean;
    };
    CopyValue?: {
      /**
       * @minItems 1
       * @maxItems 5
       */
      Entries: {
        Source: string;
        Target: string;
        OverwriteIfExists?: boolean;
      }[];
    };
    Csv?: {
      /** @maxLength 1 */
      QuoteCharacter?: string;
      /** @maxLength 2 */
      Delimiter?: string;
      Source?: string;
      /**
       * @minItems 1
       * @maxItems 100
       */
      Columns?: string[];
    };
    DateTimeConverter?: {
      Source: string;
      Target: string;
      TargetFormat?: string;
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      MatchPatterns: string[];
      SourceTimezone?: string;
      TargetTimezone?: string;
      Locale?: string;
    };
    DeleteKeys?: {
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      WithKeys: string[];
    };
    Grok?: {
      Source?: string;
      /** @maxLength 512 */
      Match: string;
    };
    ListToMap?: {
      Source: string;
      Key: string;
      ValueKey?: string;
      Target?: string;
      Flatten?: boolean;
      /** @enum ["first","last"] */
      FlattenedElement?: "first" | "last";
    };
    AddKeys?: {
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      Entries: {
        Key: string;
        /**
         * @minLength 1
         * @maxLength 256
         */
        Value: string;
        OverwriteIfExists?: boolean;
      }[];
    };
    MoveKeys?: {
      /**
       * @minItems 1
       * @maxItems 5
       */
      Entries: {
        Source: string;
        Target: string;
        OverwriteIfExists?: boolean;
      }[];
    };
    RenameKeys?: {
      /**
       * @minItems 1
       * @maxItems 5
       */
      Entries: {
        Key: string;
        RenameTo: string;
        OverwriteIfExists?: boolean;
      }[];
    };
    LowerCaseString?: {
      /**
       * @minItems 1
       * @maxItems 10
       * @uniqueItems true
       */
      WithKeys: string[];
    };
    SplitString?: {
      /**
       * @minItems 1
       * @maxItems 10
       */
      Entries: {
        Source: string;
        /** @maxLength 128 */
        Delimiter: string;
      }[];
    };
    SubstituteString?: {
      /**
       * @minItems 1
       * @maxItems 10
       */
      Entries: {
        Source: string;
        From: string;
        To: string;
      }[];
    };
    TrimString?: {
      /**
       * @minItems 1
       * @maxItems 10
       * @uniqueItems true
       */
      WithKeys: string[];
    };
    UpperCaseString?: {
      /**
       * @minItems 1
       * @maxItems 10
       * @uniqueItems true
       */
      WithKeys: string[];
    };
    TypeConverter?: {
      /**
       * @minItems 1
       * @maxItems 5
       */
      Entries: ({
        Key: string;
        /** @enum ["boolean","integer","double","string"] */
        Type: "boolean" | "integer" | "double" | "string";
      })[];
    };
  })[];
};
