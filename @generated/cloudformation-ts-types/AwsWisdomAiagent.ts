// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-aiagent.json

/** Definition of AWS::Wisdom::AIAgent Resource Type */
export type AwsWisdomAiagent = {
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}(:[A-Z0-9_$]+){0,1}$ */
  AIAgentId?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AIAgentArn?: string;
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantId: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantArn?: string;
  Configuration: {
    ManualSearchAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      AnswerGenerationAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      AnswerGenerationAIGuardrailId?: string;
      AssociationConfigurations?: ({
        /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
        AssociationId?: string;
        AssociationType?: "KNOWLEDGE_BASE";
        AssociationConfigurationData?: {
          KnowledgeBaseAssociationConfigurationData: {
            ContentTagFilter?: {
              TagCondition: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              };
            } | {
              AndConditions: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              }[];
            } | {
              OrConditions: ({
                AndConditions: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                }[];
              } | {
                TagCondition: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                };
              })[];
            };
            /**
             * @minimum 1
             * @maximum 100
             */
            MaxResults?: number;
            OverrideKnowledgeBaseSearchType?: "HYBRID" | "SEMANTIC";
          };
        };
      })[];
      /** @minLength 1 */
      Locale?: string;
    };
  } | {
    AnswerRecommendationAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      IntentLabelingGenerationAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      QueryReformulationAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      AnswerGenerationAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      AnswerGenerationAIGuardrailId?: string;
      AssociationConfigurations?: ({
        /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
        AssociationId?: string;
        AssociationType?: "KNOWLEDGE_BASE";
        AssociationConfigurationData?: {
          KnowledgeBaseAssociationConfigurationData: {
            ContentTagFilter?: {
              TagCondition: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              };
            } | {
              AndConditions: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              }[];
            } | {
              OrConditions: ({
                AndConditions: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                }[];
              } | {
                TagCondition: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                };
              })[];
            };
            /**
             * @minimum 1
             * @maximum 100
             */
            MaxResults?: number;
            OverrideKnowledgeBaseSearchType?: "HYBRID" | "SEMANTIC";
          };
        };
      })[];
      /** @minLength 1 */
      Locale?: string;
    };
  } | {
    SelfServiceAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      SelfServicePreProcessingAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      SelfServiceAnswerGenerationAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      SelfServiceAIGuardrailId?: string;
      AssociationConfigurations?: ({
        /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
        AssociationId?: string;
        AssociationType?: "KNOWLEDGE_BASE";
        AssociationConfigurationData?: {
          KnowledgeBaseAssociationConfigurationData: {
            ContentTagFilter?: {
              TagCondition: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              };
            } | {
              AndConditions: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              }[];
            } | {
              OrConditions: ({
                AndConditions: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                }[];
              } | {
                TagCondition: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                };
              })[];
            };
            /**
             * @minimum 1
             * @maximum 100
             */
            MaxResults?: number;
            OverrideKnowledgeBaseSearchType?: "HYBRID" | "SEMANTIC";
          };
        };
      })[];
    };
  } | {
    EmailResponseAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      EmailResponseAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      EmailQueryReformulationAIPromptId?: string;
      AssociationConfigurations?: ({
        /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
        AssociationId?: string;
        AssociationType?: "KNOWLEDGE_BASE";
        AssociationConfigurationData?: {
          KnowledgeBaseAssociationConfigurationData: {
            ContentTagFilter?: {
              TagCondition: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              };
            } | {
              AndConditions: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              }[];
            } | {
              OrConditions: ({
                AndConditions: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                }[];
              } | {
                TagCondition: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                };
              })[];
            };
            /**
             * @minimum 1
             * @maximum 100
             */
            MaxResults?: number;
            OverrideKnowledgeBaseSearchType?: "HYBRID" | "SEMANTIC";
          };
        };
      })[];
      /** @minLength 1 */
      Locale?: string;
    };
  } | {
    EmailOverviewAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      EmailOverviewAIPromptId?: string;
      /** @minLength 1 */
      Locale?: string;
    };
  } | {
    EmailGenerativeAnswerAIAgentConfiguration: {
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      EmailGenerativeAnswerAIPromptId?: string;
      /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$ */
      EmailQueryReformulationAIPromptId?: string;
      AssociationConfigurations?: ({
        /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ */
        AssociationId?: string;
        AssociationType?: "KNOWLEDGE_BASE";
        AssociationConfigurationData?: {
          KnowledgeBaseAssociationConfigurationData: {
            ContentTagFilter?: {
              TagCondition: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              };
            } | {
              AndConditions: {
                /**
                 * @minLength 1
                 * @maxLength 128
                 * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                 */
                Key: string;
                /**
                 * @minLength 1
                 * @maxLength 256
                 */
                Value?: string;
              }[];
            } | {
              OrConditions: ({
                AndConditions: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                }[];
              } | {
                TagCondition: {
                  /**
                   * @minLength 1
                   * @maxLength 128
                   * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
                   */
                  Key: string;
                  /**
                   * @minLength 1
                   * @maxLength 256
                   */
                  Value?: string;
                };
              })[];
            };
            /**
             * @minimum 1
             * @maximum 100
             */
            MaxResults?: number;
            OverrideKnowledgeBaseSearchType?: "HYBRID" | "SEMANTIC";
          };
        };
      })[];
      /** @minLength 1 */
      Locale?: string;
    };
  };
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\s_.,-]+
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\s_.,-]+
   */
  Name?: string;
  Tags?: Record<string, string>;
  Type: "MANUAL_SEARCH" | "ANSWER_RECOMMENDATION" | "SELF_SERVICE" | "EMAIL_RESPONSE" | "EMAIL_OVERVIEW" | "EMAIL_GENERATIVE_ANSWER";
  ModifiedTimeSeconds?: number;
};
