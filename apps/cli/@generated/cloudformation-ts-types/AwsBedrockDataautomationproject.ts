// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-dataautomationproject.json

/** Definition of AWS::Bedrock::DataAutomationProject Resource Type */
export type AwsBedrockDataautomationproject = {
  /** Time Stamp */
  CreationTime?: string;
  CustomOutputConfiguration?: {
    Blueprints?: ({
      /**
       * ARN of a Blueprint
       * @maxLength 128
       * @pattern ^arn:aws(|-cn|-us-gov):bedrock:[a-zA-Z0-9-]*:(aws|[0-9]{12}):blueprint/(bedrock-data-automation-public-[a-zA-Z0-9-_]{1,30}|[a-zA-Z0-9-]{12,36})$
       */
      BlueprintArn: string;
      /**
       * Blueprint Version
       * @minLength 1
       * @maxLength 128
       * @pattern ^[0-9]*$
       */
      BlueprintVersion?: string;
      BlueprintStage?: "DEVELOPMENT" | "LIVE";
    })[];
  };
  /** Time Stamp */
  LastModifiedTime?: string;
  OverrideConfiguration?: {
    Document?: {
      Splitter?: {
        State?: "ENABLED" | "DISABLED";
      };
      ModalityProcessing?: {
        State?: "ENABLED" | "DISABLED";
      };
    };
    Audio?: {
      ModalityProcessing?: {
        State?: "ENABLED" | "DISABLED";
      };
      LanguageConfiguration?: {
        InputLanguages?: ("EN" | "DE" | "ES" | "FR" | "IT" | "PT" | "JA" | "KO" | "CN" | "TW" | "HK")[];
        GenerativeOutputLanguage?: "DEFAULT" | "EN";
        IdentifyMultipleLanguages?: boolean;
      };
    };
    Video?: {
      ModalityProcessing?: {
        State?: "ENABLED" | "DISABLED";
      };
    };
    Image?: {
      ModalityProcessing?: {
        State?: "ENABLED" | "DISABLED";
      };
    };
    ModalityRouting?: {
      jpeg?: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO";
      png?: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO";
      mp4?: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO";
      mov?: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO";
    };
  };
  /**
   * ARN of a DataAutomationProject
   * @maxLength 128
   * @pattern ^arn:aws(|-cn|-us-gov):bedrock:[a-zA-Z0-9-]*:(aws|[0-9]{12}):data-automation-project/[a-zA-Z0-9-]{12,36}$
   */
  ProjectArn?: string;
  /** Description of the DataAutomationProject */
  ProjectDescription?: string;
  /**
   * Name of the DataAutomationProject
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]+$
   */
  ProjectName: string;
  ProjectStage?: "DEVELOPMENT" | "LIVE";
  StandardOutputConfiguration?: {
    Document?: {
      Extraction?: {
        Granularity: {
          /** @uniqueItems true */
          Types?: ("DOCUMENT" | "PAGE" | "ELEMENT" | "WORD" | "LINE")[];
        };
        BoundingBox: {
          State: "ENABLED" | "DISABLED";
        };
      };
      GenerativeField?: {
        State: "ENABLED" | "DISABLED";
      };
      OutputFormat?: {
        TextFormat: {
          /** @uniqueItems true */
          Types?: ("PLAIN_TEXT" | "MARKDOWN" | "HTML" | "CSV")[];
        };
        AdditionalFileFormat: {
          State: "ENABLED" | "DISABLED";
        };
      };
    };
    Image?: {
      Extraction?: {
        Category: {
          State: "ENABLED" | "DISABLED";
          /** @uniqueItems true */
          Types?: ("CONTENT_MODERATION" | "TEXT_DETECTION" | "LOGOS")[];
        };
        BoundingBox: {
          State: "ENABLED" | "DISABLED";
        };
      };
      GenerativeField?: {
        State: "ENABLED" | "DISABLED";
        /** @uniqueItems true */
        Types?: ("IMAGE_SUMMARY" | "IAB")[];
      };
    };
    Video?: {
      Extraction?: {
        Category: {
          State: "ENABLED" | "DISABLED";
          /** @uniqueItems true */
          Types?: ("CONTENT_MODERATION" | "TEXT_DETECTION" | "TRANSCRIPT" | "LOGOS")[];
        };
        BoundingBox: {
          State: "ENABLED" | "DISABLED";
        };
      };
      GenerativeField?: {
        State: "ENABLED" | "DISABLED";
        /** @uniqueItems true */
        Types?: ("VIDEO_SUMMARY" | "IAB" | "CHAPTER_SUMMARY")[];
      };
    };
    Audio?: {
      Extraction?: {
        Category: {
          State: "ENABLED" | "DISABLED";
          /** @uniqueItems true */
          Types?: ("AUDIO_CONTENT_MODERATION" | "TRANSCRIPT" | "TOPIC_CONTENT_MODERATION")[];
          TypeConfiguration?: {
            Transcript?: {
              SpeakerLabeling?: {
                State: "ENABLED" | "DISABLED";
              };
              ChannelLabeling?: {
                State: "ENABLED" | "DISABLED";
              };
            };
          };
        };
      };
      GenerativeField?: {
        State: "ENABLED" | "DISABLED";
        /** @uniqueItems true */
        Types?: ("AUDIO_SUMMARY" | "IAB" | "TOPIC_SUMMARY")[];
      };
    };
  };
  Status?: "COMPLETED" | "IN_PROGRESS" | "FAILED";
  /**
   * KMS key identifier
   * @minLength 1
   * @maxLength 2048
   */
  KmsKeyId?: string;
  /** KMS encryption context */
  KmsEncryptionContext?: Record<string, string>;
  /**
   * List of Tags
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * Key for the tag
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Key: string;
    /**
     * Value for the tag
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Value: string;
  }[];
};
