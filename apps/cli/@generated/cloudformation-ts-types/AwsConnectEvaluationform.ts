// This file is auto-generated. Do not edit manually.
// Source: aws-connect-evaluationform.json

/** Creates an evaluation form for the specified CON instance. */
export type AwsConnectEvaluationform = {
  /** A scoring strategy of the evaluation form. */
  ScoringStrategy?: {
    /**
     * The scoring status of the evaluation form.
     * *Allowed values*: ``ENABLED`` | ``DISABLED``
     * @enum ["ENABLED","DISABLED"]
     */
    Status: "ENABLED" | "DISABLED";
    /**
     * The scoring mode of the evaluation form.
     * *Allowed values*: ``QUESTION_ONLY`` | ``SECTION_ONLY``
     * @enum ["QUESTION_ONLY","SECTION_ONLY"]
     */
    Mode: "QUESTION_ONLY" | "SECTION_ONLY";
  };
  /**
   * The status of the evaluation form.
   * *Allowed values*: ``DRAFT`` | ``ACTIVE``
   * @default "DRAFT"
   * @enum ["DRAFT","ACTIVE"]
   */
  Status: "DRAFT" | "ACTIVE";
  AutoEvaluationConfiguration?: {
    Enabled?: boolean;
  };
  /**
   * The description of the evaluation form.
   * *Length Constraints*: Minimum length of 0. Maximum length of 1024.
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * A title of the evaluation form.
   * @minLength 1
   * @maxLength 128
   */
  Title: string;
  /**
   * Items that are part of the evaluation form. The total number of sections and questions must not
   * exceed 100 each. Questions must be contained in a section.
   * *Minimum size*: 1
   * *Maximum size*: 100
   * @minItems 1
   * @maxItems 200
   */
  Items: ({
    /** A subsection or inner section of an item. */
    Section: {
      /**
       * The title of the section.
       * *Length Constraints*: Minimum length of 1. Maximum length of 128.
       * @minLength 1
       * @maxLength 128
       */
      Title: string;
      /**
       * The instructions of the section.
       * @maxLength 1024
       */
      Instructions?: string;
      /**
       * The items of the section.
       * *Minimum*: 1
       * @minItems 1
       * @maxItems 200
       */
      Items?: ({
        /** The information of the question. */
        Question?: {
          /** The flag to enable not applicable answers to the question. */
          NotApplicableEnabled?: boolean;
          Enablement?: {
            /** Specifies the logical condition that determines when to apply the enablement rules. */
            Condition: {
              /**
               * The logical operator used to combine multiple operands, determining how the condition is evaluated
               * as a whole.
               * @enum ["OR","AND"]
               */
              Operator?: "OR" | "AND";
              /**
               * The list of operands that compose the condition. Each operand represents a specific criteria to be
               * evaluated.
               * @minItems 1
               */
              Operands: ({
                /** A direct comparison expression that evaluates a form item's value against specified criteria. */
                Expression?: {
                  /**
                   * The list of possible values to compare against the source form item's value.
                   * @minItems 1
                   */
                  Values: {
                    /**
                     * Type of the source entity value.
                     * @enum ["OPTION_REF_ID"]
                     */
                    Type?: "OPTION_REF_ID";
                    /** The reference id of the source entity value. */
                    RefId?: string;
                  }[];
                  /** Identifies the form item whose value will be evaluated in the expression. */
                  Source: {
                    /**
                     * The type of the source entity.
                     * @enum ["QUESTION_REF_ID"]
                     */
                    Type: "QUESTION_REF_ID";
                    RefId?: string;
                  };
                  /**
                   * Specifies the comparison method to determine if the source value matches any of the specified
                   * values.
                   * @enum ["IN","NOT_IN","ALL_IN","EXACT"]
                   */
                  Comparator: "IN" | "NOT_IN" | "ALL_IN" | "EXACT";
                };
              })[];
            };
            /**
             * Defines the enablement status to be applied when the specified condition is met.
             * @enum ["DISABLE","ENABLE"]
             */
            Action: "DISABLE" | "ENABLE";
            /**
             * Specifies the default enablement status to be applied when the condition is not satisfied.
             * @enum ["DISABLE","ENABLE"]
             */
            DefaultAction?: "DISABLE" | "ENABLE";
          };
          /**
           * The title of the question.
           * *Length Constraints*: Minimum length of 1. Maximum length of 350.
           * @minLength 1
           * @maxLength 350
           */
          Title: string;
          /**
           * The type of the question.
           * *Allowed values*: ``NUMERIC`` | ``SINGLESELECT`` | ``TEXT``
           * @enum ["NUMERIC","SINGLESELECT","TEXT","MULTISELECT","DATETIME"]
           */
          QuestionType: "NUMERIC" | "SINGLESELECT" | "TEXT" | "MULTISELECT" | "DATETIME";
          /**
           * The instructions of the section.
           * *Length Constraints*: Minimum length of 0. Maximum length of 1024.
           * @maxLength 1024
           */
          Instructions?: string;
          /**
           * The identifier of the question. An identifier must be unique within the evaluation form.
           * *Length Constraints*: Minimum length of 1. Maximum length of 40.
           */
          RefId: string;
          /**
           * The properties of the type of question. Text questions do not have to define question type
           * properties.
           */
          QuestionTypeProperties?: {
            /** The properties of the numeric question. */
            Numeric?: {
              /**
               * The scoring options of the numeric question.
               * @minItems 1
               * @maxItems 10
               */
              Options?: {
                /**
                 * The score assigned to answer values within the range option.
                 * *Minimum*: 0
                 * *Maximum*: 10
                 */
                Score?: number;
                AutomaticFailConfiguration?: {
                  /**
                   * The target section refId to control failure propagation boundary.
                   * @pattern ^[a-zA-Z0-9._-]{1,40}$
                   */
                  TargetSection?: string;
                };
                /** The minimum answer value of the range option. */
                MinValue: number;
                /** The maximum answer value of the range option. */
                MaxValue: number;
                /**
                 * The flag to mark the option as automatic fail. If an automatic fail answer is provided, the overall
                 * evaluation gets a score of 0.
                 */
                AutomaticFail?: boolean;
              }[];
              /** The automation properties of the numeric question. */
              Automation?: {
                AnswerSource?: {
                  /**
                   * The type of the answer source
                   * @enum ["CONTACT_LENS_DATA","GEN_AI"]
                   */
                  SourceType: "CONTACT_LENS_DATA" | "GEN_AI";
                };
                /** The property value of the automation. */
                PropertyValue?: {
                  /**
                   * The property label of the automation.
                   * @enum ["OVERALL_CUSTOMER_SENTIMENT_SCORE","OVERALL_AGENT_SENTIMENT_SCORE","NON_TALK_TIME","NON_TALK_TIME_PERCENTAGE","NUMBER_OF_INTERRUPTIONS","CONTACT_DURATION","AGENT_INTERACTION_DURATION","CUSTOMER_HOLD_TIME","LONGEST_HOLD_DURATION","NUMBER_OF_HOLDS","AGENT_INTERACTION_AND_HOLD_DURATION","CUSTOMER_SENTIMENT_SCORE_WITHOUT_AGENT"]
                   */
                  Label: "OVERALL_CUSTOMER_SENTIMENT_SCORE" | "OVERALL_AGENT_SENTIMENT_SCORE" | "NON_TALK_TIME" | "NON_TALK_TIME_PERCENTAGE" | "NUMBER_OF_INTERRUPTIONS" | "CONTACT_DURATION" | "AGENT_INTERACTION_DURATION" | "CUSTOMER_HOLD_TIME" | "LONGEST_HOLD_DURATION" | "NUMBER_OF_HOLDS" | "AGENT_INTERACTION_AND_HOLD_DURATION" | "CUSTOMER_SENTIMENT_SCORE_WITHOUT_AGENT";
                };
              };
              /** The minimum answer value. */
              MinValue: number;
              /** The maximum answer value. */
              MaxValue: number;
            };
            /** The properties of the numeric question. */
            SingleSelect?: {
              /**
               * The display mode of the single select question.
               * *Allowed values*: ``DROPDOWN`` | ``RADIO``
               * @enum ["DROPDOWN","RADIO"]
               */
              DisplayAs?: "DROPDOWN" | "RADIO";
              /**
               * The answer options of the single select question.
               * *Minimum*: 2
               * *Maximum*: 256
               * @minItems 2
               * @maxItems 256
               */
              Options: {
                /**
                 * The score assigned to the answer option.
                 * *Minimum*: 0
                 * *Maximum*: 10
                 */
                Score?: number;
                AutomaticFailConfiguration?: {
                  /**
                   * The target section refId to control failure propagation boundary.
                   * @pattern ^[a-zA-Z0-9._-]{1,40}$
                   */
                  TargetSection?: string;
                };
                /**
                 * The title of the answer option.
                 * *Length Constraints*: Minimum length of 1. Maximum length of 128.
                 * @minLength 1
                 * @maxLength 128
                 */
                Text: string;
                /**
                 * The identifier of the answer option. An identifier must be unique within the question.
                 * *Length Constraints*: Minimum length of 1. Maximum length of 40.
                 */
                RefId: string;
                /**
                 * The flag to mark the option as automatic fail. If an automatic fail answer is provided, the overall
                 * evaluation gets a score of 0.
                 */
                AutomaticFail?: boolean;
              }[];
              /** The display mode of the single select question. */
              Automation?: {
                /**
                 * The automation options of the single select question.
                 * *Minimum*: 1
                 * *Maximum*: 20
                 * @minItems 1
                 * @maxItems 20
                 */
                Options: ({
                  /** The automation option based on a rule category for the single select question. */
                  RuleCategory: {
                    /**
                     * The condition to apply for the automation option. If the condition is PRESENT, then the option is
                     * applied when the contact data includes the category. Similarly, if the condition is NOT_PRESENT,
                     * then the option is applied when the contact data does not include the category.
                     * *Allowed values*: ``PRESENT`` | ``NOT_PRESENT``
                     * *Maximum*: 50
                     * @enum ["PRESENT","NOT_PRESENT"]
                     */
                    Condition: "PRESENT" | "NOT_PRESENT";
                    /**
                     * The category name, as defined in Rules.
                     * *Minimum*: 1
                     * *Maximum*: 50
                     * @minLength 1
                     * @maxLength 50
                     */
                    Category: string;
                    /**
                     * The identifier of the answer option. An identifier must be unique within the question.
                     * *Length Constraints*: Minimum length of 1. Maximum length of 40.
                     */
                    OptionRefId: string;
                  };
                })[];
                AnswerSource?: {
                  /**
                   * The type of the answer source
                   * @enum ["CONTACT_LENS_DATA","GEN_AI"]
                   */
                  SourceType: "CONTACT_LENS_DATA" | "GEN_AI";
                };
                /**
                 * The identifier of the default answer option, when none of the automation options match the
                 * criteria.
                 * *Length Constraints*: Minimum length of 1. Maximum length of 40.
                 */
                DefaultOptionRefId?: string;
              };
            };
            Text?: {
              /** Specifies how the question can be automatically answered. */
              Automation?: {
                /** The source of automation answer of the question. */
                AnswerSource?: {
                  /**
                   * The type of the answer source
                   * @enum ["CONTACT_LENS_DATA","GEN_AI"]
                   */
                  SourceType: "CONTACT_LENS_DATA" | "GEN_AI";
                };
              };
            };
          };
          /**
           * The scoring weight of the section.
           * *Minimum*: 0
           * *Maximum*: 100
           */
          Weight?: number;
        };
        /** The information of the section. */
        Section?: unknown;
      })[];
      /**
       * The identifier of the section. An identifier must be unique within the evaluation form.
       * *Length Constraints*: Minimum length of 1. Maximum length of 40.
       */
      RefId: string;
      /**
       * The scoring weight of the section.
       * *Minimum*: 0
       * *Maximum*: 100
       */
      Weight?: number;
    };
  })[];
  /** @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/evaluation-form/[-a-zA-Z0-9]*$ */
  EvaluationFormArn?: string;
  /**
   * The tags used to organize, track, or control access for this resource. For example, { "tags":
   * {"key1":"value1", "key2":"value2"} }.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
  }[];
};
