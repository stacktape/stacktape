// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanagerruleset.json

/** Definition of AWS::SES::MailManagerRuleSet Resource Type */
export type AwsSesMailmanagerruleset = {
  RuleSetArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  RuleSetId?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  RuleSetName?: string;
  /**
   * @minItems 0
   * @maxItems 40
   */
  Rules: ({
    /**
     * @minLength 1
     * @maxLength 32
     * @pattern ^[a-zA-Z0-9_.-]+$
     */
    Name?: string;
    /**
     * @minItems 0
     * @maxItems 10
     */
    Conditions?: ({
      BooleanExpression: {
        Evaluate: {
          Attribute: "READ_RECEIPT_REQUESTED" | "TLS" | "TLS_WRAPPED";
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        } | {
          IsInAddressList: {
            Attribute: "RECIPIENT" | "MAIL_FROM" | "SENDER" | "FROM" | "TO" | "CC";
            /**
             * @minItems 1
             * @maxItems 1
             * @uniqueItems true
             */
            AddressLists: string[];
          };
        };
        Operator: "IS_TRUE" | "IS_FALSE";
      };
    } | {
      StringExpression: {
        Evaluate: {
          Attribute: "MAIL_FROM" | "HELO" | "RECIPIENT" | "SENDER" | "FROM" | "SUBJECT" | "TO" | "CC";
        } | {
          /** @pattern ^X-[a-zA-Z0-9-]{1,256}$ */
          MimeHeaderAttribute: string;
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        };
        Operator: "EQUALS" | "NOT_EQUALS" | "STARTS_WITH" | "ENDS_WITH" | "CONTAINS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: string[];
      };
    } | {
      NumberExpression: {
        Evaluate: {
          Attribute: "MESSAGE_SIZE";
        };
        Operator: "EQUALS" | "NOT_EQUALS" | "LESS_THAN" | "GREATER_THAN" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN_OR_EQUAL";
        Value: number;
      };
    } | {
      IpExpression: {
        Evaluate: {
          Attribute: "SOURCE_IP";
        };
        Operator: "CIDR_MATCHES" | "NOT_CIDR_MATCHES";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: string[];
      };
    } | {
      VerdictExpression: {
        Evaluate: {
          Attribute: "SPF" | "DKIM";
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        };
        Operator: "EQUALS" | "NOT_EQUALS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: ("PASS" | "FAIL" | "GRAY" | "PROCESSING_FAILED")[];
      };
    } | {
      DmarcExpression: {
        Operator: "EQUALS" | "NOT_EQUALS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: ("NONE" | "QUARANTINE" | "REJECT")[];
      };
    })[];
    /**
     * @minItems 0
     * @maxItems 10
     */
    Unless?: ({
      BooleanExpression: {
        Evaluate: {
          Attribute: "READ_RECEIPT_REQUESTED" | "TLS" | "TLS_WRAPPED";
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        } | {
          IsInAddressList: {
            Attribute: "RECIPIENT" | "MAIL_FROM" | "SENDER" | "FROM" | "TO" | "CC";
            /**
             * @minItems 1
             * @maxItems 1
             * @uniqueItems true
             */
            AddressLists: string[];
          };
        };
        Operator: "IS_TRUE" | "IS_FALSE";
      };
    } | {
      StringExpression: {
        Evaluate: {
          Attribute: "MAIL_FROM" | "HELO" | "RECIPIENT" | "SENDER" | "FROM" | "SUBJECT" | "TO" | "CC";
        } | {
          /** @pattern ^X-[a-zA-Z0-9-]{1,256}$ */
          MimeHeaderAttribute: string;
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        };
        Operator: "EQUALS" | "NOT_EQUALS" | "STARTS_WITH" | "ENDS_WITH" | "CONTAINS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: string[];
      };
    } | {
      NumberExpression: {
        Evaluate: {
          Attribute: "MESSAGE_SIZE";
        };
        Operator: "EQUALS" | "NOT_EQUALS" | "LESS_THAN" | "GREATER_THAN" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN_OR_EQUAL";
        Value: number;
      };
    } | {
      IpExpression: {
        Evaluate: {
          Attribute: "SOURCE_IP";
        };
        Operator: "CIDR_MATCHES" | "NOT_CIDR_MATCHES";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: string[];
      };
    } | {
      VerdictExpression: {
        Evaluate: {
          Attribute: "SPF" | "DKIM";
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        };
        Operator: "EQUALS" | "NOT_EQUALS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: ("PASS" | "FAIL" | "GRAY" | "PROCESSING_FAILED")[];
      };
    } | {
      DmarcExpression: {
        Operator: "EQUALS" | "NOT_EQUALS";
        /**
         * @minItems 1
         * @maxItems 10
         */
        Values: ("NONE" | "QUARANTINE" | "REJECT")[];
      };
    })[];
    /**
     * @minItems 1
     * @maxItems 10
     */
    Actions: ({
      Drop: Record<string, unknown>;
    } | {
      Relay: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 1
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        Relay: string;
        MailFrom?: "REPLACE" | "PRESERVE";
      };
    } | {
      Archive: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 1
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        TargetArchive: string;
      };
    } | {
      WriteToS3: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        RoleArn: string;
        /**
         * @minLength 1
         * @maxLength 62
         * @pattern ^[a-zA-Z0-9.-]+$
         */
        S3Bucket: string;
        /**
         * @minLength 1
         * @maxLength 62
         * @pattern ^[a-zA-Z0-9!_.*'()/-]+$
         */
        S3Prefix?: string;
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9-:/]+$
         */
        S3SseKmsKeyId?: string;
      };
    } | {
      Send: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        RoleArn: string;
      };
    } | {
      AddHeader: {
        /**
         * @minLength 1
         * @maxLength 64
         * @pattern ^[xX]\-[a-zA-Z0-9\-]+$
         */
        HeaderName: string;
        /**
         * @minLength 1
         * @maxLength 128
         */
        HeaderValue: string;
      };
    } | {
      ReplaceRecipient: {
        /**
         * @minItems 1
         * @maxItems 100
         * @uniqueItems true
         */
        ReplaceWith?: string[];
      };
    } | {
      DeliverToMailbox: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 1
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        MailboxArn: string;
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        RoleArn: string;
      };
    } | {
      DeliverToQBusiness: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 36
         * @maxLength 36
         * @pattern ^[a-z0-9-]+$
         */
        ApplicationId: string;
        /**
         * @minLength 36
         * @maxLength 36
         * @pattern ^[a-z0-9-]+$
         */
        IndexId: string;
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        RoleArn: string;
      };
    } | {
      PublishToSns: {
        ActionFailurePolicy?: "CONTINUE" | "DROP";
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^arn:(aws|aws-cn|aws-us-gov):sns:[a-z]{2}-[a-z]+-\d{1}:\d{12}:[\w\-]{1,256}$
         */
        TopicArn: string;
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$
         */
        RoleArn: string;
        Encoding?: "UTF-8" | "BASE64";
        PayloadType?: "CONTENT" | "HEADERS";
      };
    })[];
  })[];
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]*$
     */
    Value: string;
  }[];
};
