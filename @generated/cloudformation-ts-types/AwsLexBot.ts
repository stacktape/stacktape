// This file is auto-generated. Do not edit manually.
// Source: aws-lex-bot.json

/**
 * Amazon Lex conversational bot performing automated tasks such as ordering a pizza, booking a hotel,
 * and so on.
 */
export type AwsLexBot = {
  Id?: string;
  Arn?: string;
  Name: string;
  Description?: string;
  RoleArn: string;
  DataPrivacy: {
    ChildDirected: boolean;
  };
  ErrorLogSettings?: {
    Enabled: boolean;
  };
  /**
   * @minimum 60
   * @maximum 86400
   */
  IdleSessionTTLInSeconds: number;
  /** @uniqueItems true */
  BotLocales?: ({
    LocaleId: string;
    Description?: string;
    VoiceSettings?: {
      VoiceId: string;
      /** @enum ["standard","neural","long-form","generative"] */
      Engine?: "standard" | "neural" | "long-form" | "generative";
    };
    GenerativeAISettings?: {
      BuildtimeSettings?: {
        DescriptiveBotBuilderSpecification?: {
          Enabled: boolean;
          BedrockModelSpecification?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            ModelArn: string;
            BedrockGuardrailConfiguration?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailIdentifier?: string;
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailVersion?: string;
            };
            /** @enum ["ENABLED","DISABLED"] */
            BedrockTraceStatus?: "ENABLED" | "DISABLED";
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockModelCustomPrompt?: string;
          };
        };
        SampleUtteranceGenerationSpecification?: {
          Enabled: boolean;
          BedrockModelSpecification?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            ModelArn: string;
            BedrockGuardrailConfiguration?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailIdentifier?: string;
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailVersion?: string;
            };
            /** @enum ["ENABLED","DISABLED"] */
            BedrockTraceStatus?: "ENABLED" | "DISABLED";
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockModelCustomPrompt?: string;
          };
        };
      };
      RuntimeSettings?: {
        NluImprovementSpecification?: {
          Enabled: boolean;
        };
        SlotResolutionImprovementSpecification?: {
          Enabled: boolean;
          BedrockModelSpecification?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            ModelArn: string;
            BedrockGuardrailConfiguration?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailIdentifier?: string;
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailVersion?: string;
            };
            /** @enum ["ENABLED","DISABLED"] */
            BedrockTraceStatus?: "ENABLED" | "DISABLED";
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockModelCustomPrompt?: string;
          };
        };
      };
    };
    NluConfidenceThreshold: number;
    /**
     * @maxItems 1000
     * @uniqueItems true
     */
    Intents?: ({
      Name: string;
      /** Description of thr intent. */
      Description?: string;
      ParentIntentSignature?: string;
      SampleUtterances?: {
        Utterance: string;
      }[];
      DialogCodeHook?: {
        Enabled: boolean;
      };
      FulfillmentCodeHook?: {
        FulfillmentUpdatesSpecification?: {
          StartResponse?: {
            MessageGroups: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            /**
             * @minimum 1
             * @maximum 900
             */
            DelayInSeconds: number;
            AllowInterrupt?: boolean;
          };
          UpdateResponse?: {
            MessageGroups: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            /**
             * @minimum 1
             * @maximum 900
             */
            FrequencyInSeconds: number;
            AllowInterrupt?: boolean;
          };
          /**
           * @minimum 1
           * @maximum 900
           */
          TimeoutInSeconds?: number;
          Active: boolean;
        };
        PostFulfillmentStatusSpecification?: {
          SuccessResponse?: {
            MessageGroupsList: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            AllowInterrupt?: boolean;
          };
          SuccessNextStep?: {
            DialogAction?: {
              Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
              SlotToElicit?: string;
              SuppressNextMessage?: boolean;
            };
            Intent?: {
              Name?: string;
              Slots?: ({
                SlotName?: string;
                SlotValueOverride?: {
                  Shape?: "Scalar" | "List";
                  Value?: {
                    /**
                     * @minLength 1
                     * @maxLength 202
                     */
                    InterpretedValue?: string;
                  };
                  Values?: unknown[];
                };
              })[];
            };
            SessionAttributes?: {
              /**
               * @minLength 1
               * @maxLength 1024
               */
              Key: string;
              /**
               * @minLength 0
               * @maxLength 1024
               */
              Value?: string;
            }[];
          };
          SuccessConditional?: {
            IsActive: boolean;
            ConditionalBranches: ({
              Name: string;
              Condition: {
                ExpressionString: string;
              };
              NextStep: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            })[];
            DefaultBranch: {
              NextStep?: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            };
          };
          FailureResponse?: {
            MessageGroupsList: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            AllowInterrupt?: boolean;
          };
          FailureNextStep?: {
            DialogAction?: {
              Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
              SlotToElicit?: string;
              SuppressNextMessage?: boolean;
            };
            Intent?: {
              Name?: string;
              Slots?: ({
                SlotName?: string;
                SlotValueOverride?: {
                  Shape?: "Scalar" | "List";
                  Value?: {
                    /**
                     * @minLength 1
                     * @maxLength 202
                     */
                    InterpretedValue?: string;
                  };
                  Values?: unknown[];
                };
              })[];
            };
            SessionAttributes?: {
              /**
               * @minLength 1
               * @maxLength 1024
               */
              Key: string;
              /**
               * @minLength 0
               * @maxLength 1024
               */
              Value?: string;
            }[];
          };
          FailureConditional?: {
            IsActive: boolean;
            ConditionalBranches: ({
              Name: string;
              Condition: {
                ExpressionString: string;
              };
              NextStep: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            })[];
            DefaultBranch: {
              NextStep?: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            };
          };
          TimeoutResponse?: {
            MessageGroupsList: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            AllowInterrupt?: boolean;
          };
          TimeoutNextStep?: {
            DialogAction?: {
              Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
              SlotToElicit?: string;
              SuppressNextMessage?: boolean;
            };
            Intent?: {
              Name?: string;
              Slots?: ({
                SlotName?: string;
                SlotValueOverride?: {
                  Shape?: "Scalar" | "List";
                  Value?: {
                    /**
                     * @minLength 1
                     * @maxLength 202
                     */
                    InterpretedValue?: string;
                  };
                  Values?: unknown[];
                };
              })[];
            };
            SessionAttributes?: {
              /**
               * @minLength 1
               * @maxLength 1024
               */
              Key: string;
              /**
               * @minLength 0
               * @maxLength 1024
               */
              Value?: string;
            }[];
          };
          TimeoutConditional?: {
            IsActive: boolean;
            ConditionalBranches: ({
              Name: string;
              Condition: {
                ExpressionString: string;
              };
              NextStep: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            })[];
            DefaultBranch: {
              NextStep?: {
                DialogAction?: {
                  Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                  SlotToElicit?: string;
                  SuppressNextMessage?: boolean;
                };
                Intent?: {
                  Name?: string;
                  Slots?: ({
                    SlotName?: string;
                    SlotValueOverride?: {
                      Shape?: "Scalar" | "List";
                      Value?: {
                        /**
                         * @minLength 1
                         * @maxLength 202
                         */
                        InterpretedValue?: string;
                      };
                      Values?: unknown[];
                    };
                  })[];
                };
                SessionAttributes?: {
                  /**
                   * @minLength 1
                   * @maxLength 1024
                   */
                  Key: string;
                  /**
                   * @minLength 0
                   * @maxLength 1024
                   */
                  Value?: string;
                }[];
              };
              Response?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                AllowInterrupt?: boolean;
              };
            };
          };
        };
        Enabled: boolean;
        IsActive?: boolean;
      };
      IntentConfirmationSetting?: {
        PromptSpecification: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          MaxRetries: number;
          AllowInterrupt?: boolean;
          MessageSelectionStrategy?: "Random" | "Ordered";
          PromptAttemptsSpecification?: Record<string, {
            AllowedInputTypes: {
              AllowAudioInput: boolean;
              AllowDTMFInput: boolean;
            };
            AllowInterrupt?: boolean;
            AudioAndDTMFInputSpecification?: {
              /** @minimum 1 */
              StartTimeoutMs: number;
              DTMFSpecification?: {
                /** @pattern ^[A-D0-9#*]{1}$ */
                DeletionCharacter: string;
                /** @pattern ^[A-D0-9#*]{1}$ */
                EndCharacter: string;
                /** @minimum 1 */
                EndTimeoutMs: number;
                /**
                 * @minimum 1
                 * @maximum 1024
                 */
                MaxLength: number;
              };
              AudioSpecification?: {
                /** @minimum 1 */
                EndTimeoutMs: number;
                /** @minimum 1 */
                MaxLengthMs: number;
              };
            };
            TextInputSpecification?: {
              /** @minimum 1 */
              StartTimeoutMs: number;
            };
          }>;
        };
        IsActive?: boolean;
        ConfirmationResponse?: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          AllowInterrupt?: boolean;
        };
        ConfirmationNextStep?: {
          DialogAction?: {
            Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
            SlotToElicit?: string;
            SuppressNextMessage?: boolean;
          };
          Intent?: {
            Name?: string;
            Slots?: ({
              SlotName?: string;
              SlotValueOverride?: {
                Shape?: "Scalar" | "List";
                Value?: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  InterpretedValue?: string;
                };
                Values?: unknown[];
              };
            })[];
          };
          SessionAttributes?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value?: string;
          }[];
        };
        ConfirmationConditional?: {
          IsActive: boolean;
          ConditionalBranches: ({
            Name: string;
            Condition: {
              ExpressionString: string;
            };
            NextStep: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          })[];
          DefaultBranch: {
            NextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          };
        };
        DeclinationResponse?: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          AllowInterrupt?: boolean;
        };
        DeclinationNextStep?: {
          DialogAction?: {
            Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
            SlotToElicit?: string;
            SuppressNextMessage?: boolean;
          };
          Intent?: {
            Name?: string;
            Slots?: ({
              SlotName?: string;
              SlotValueOverride?: {
                Shape?: "Scalar" | "List";
                Value?: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  InterpretedValue?: string;
                };
                Values?: unknown[];
              };
            })[];
          };
          SessionAttributes?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value?: string;
          }[];
        };
        DeclinationConditional?: {
          IsActive: boolean;
          ConditionalBranches: ({
            Name: string;
            Condition: {
              ExpressionString: string;
            };
            NextStep: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          })[];
          DefaultBranch: {
            NextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          };
        };
        FailureResponse?: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          AllowInterrupt?: boolean;
        };
        FailureNextStep?: {
          DialogAction?: {
            Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
            SlotToElicit?: string;
            SuppressNextMessage?: boolean;
          };
          Intent?: {
            Name?: string;
            Slots?: ({
              SlotName?: string;
              SlotValueOverride?: {
                Shape?: "Scalar" | "List";
                Value?: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  InterpretedValue?: string;
                };
                Values?: unknown[];
              };
            })[];
          };
          SessionAttributes?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value?: string;
          }[];
        };
        FailureConditional?: {
          IsActive: boolean;
          ConditionalBranches: ({
            Name: string;
            Condition: {
              ExpressionString: string;
            };
            NextStep: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          })[];
          DefaultBranch: {
            NextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          };
        };
        CodeHook?: {
          EnableCodeHookInvocation: boolean;
          IsActive: boolean;
          InvocationLabel?: string;
          PostCodeHookSpecification: {
            SuccessResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            SuccessNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            SuccessConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            FailureResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            FailureNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            FailureConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            TimeoutResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            TimeoutNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            TimeoutConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
          };
        };
        ElicitationCodeHook?: {
          EnableCodeHookInvocation: boolean;
          InvocationLabel?: string;
        };
      };
      IntentClosingSetting?: {
        ClosingResponse?: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          AllowInterrupt?: boolean;
        };
        IsActive?: boolean;
        Conditional?: {
          IsActive: boolean;
          ConditionalBranches: ({
            Name: string;
            Condition: {
              ExpressionString: string;
            };
            NextStep: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          })[];
          DefaultBranch: {
            NextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          };
        };
        NextStep?: {
          DialogAction?: {
            Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
            SlotToElicit?: string;
            SuppressNextMessage?: boolean;
          };
          Intent?: {
            Name?: string;
            Slots?: ({
              SlotName?: string;
              SlotValueOverride?: {
                Shape?: "Scalar" | "List";
                Value?: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  InterpretedValue?: string;
                };
                Values?: unknown[];
              };
            })[];
          };
          SessionAttributes?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value?: string;
          }[];
        };
      };
      InitialResponseSetting?: {
        InitialResponse?: {
          MessageGroupsList: {
            Message: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            };
            /** @maxItems 2 */
            Variations?: {
              PlainTextMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              CustomPayload?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              SSMLMessage?: {
                /**
                 * @minLength 1
                 * @maxLength 1000
                 */
                Value: string;
              };
              ImageResponseCard?: {
                Title: string;
                Subtitle?: string;
                ImageUrl?: string;
                /** @maxItems 5 */
                Buttons?: {
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Text: string;
                  /**
                   * @minLength 1
                   * @maxLength 50
                   */
                  Value: string;
                }[];
              };
            }[];
          }[];
          AllowInterrupt?: boolean;
        };
        NextStep?: {
          DialogAction?: {
            Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
            SlotToElicit?: string;
            SuppressNextMessage?: boolean;
          };
          Intent?: {
            Name?: string;
            Slots?: ({
              SlotName?: string;
              SlotValueOverride?: {
                Shape?: "Scalar" | "List";
                Value?: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  InterpretedValue?: string;
                };
                Values?: unknown[];
              };
            })[];
          };
          SessionAttributes?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value?: string;
          }[];
        };
        Conditional?: {
          IsActive: boolean;
          ConditionalBranches: ({
            Name: string;
            Condition: {
              ExpressionString: string;
            };
            NextStep: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          })[];
          DefaultBranch: {
            NextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            Response?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
          };
        };
        CodeHook?: {
          EnableCodeHookInvocation: boolean;
          IsActive: boolean;
          InvocationLabel?: string;
          PostCodeHookSpecification: {
            SuccessResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            SuccessNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            SuccessConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            FailureResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            FailureNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            FailureConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            TimeoutResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            TimeoutNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            TimeoutConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
          };
        };
      };
      InputContexts?: {
        Name: string;
      }[];
      OutputContexts?: {
        Name: string;
        TimeToLiveInSeconds: number;
        TurnsToLive: number;
      }[];
      KendraConfiguration?: {
        KendraIndex: string;
        QueryFilterStringEnabled?: boolean;
        QueryFilterString?: string;
      };
      QnAIntentConfiguration?: {
        DataSourceConfiguration: {
          OpensearchConfiguration?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            DomainEndpoint?: string;
            /**
             * @minLength 1
             * @maxLength 5000
             */
            IndexName?: string;
            IncludeFields?: string[];
            ExactResponse?: boolean;
            ExactResponseFields?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              QuestionField?: string;
              /**
               * @minLength 1
               * @maxLength 5000
               */
              AnswerField?: string;
            };
          };
          BedrockKnowledgeStoreConfiguration?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockKnowledgeBaseArn?: string;
            ExactResponse?: boolean;
            BKBExactResponseFields?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              AnswerField?: string;
            };
          };
          KendraConfiguration?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            KendraIndex: string;
            /**
             * @minLength 1
             * @maxLength 5000
             */
            QueryFilterString?: string;
            QueryFilterStringEnabled: boolean;
            ExactResponse: boolean;
          };
        };
        BedrockModelConfiguration: {
          /**
           * @minLength 1
           * @maxLength 5000
           */
          ModelArn: string;
          BedrockGuardrailConfiguration?: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockGuardrailIdentifier?: string;
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockGuardrailVersion?: string;
          };
          /** @enum ["ENABLED","DISABLED"] */
          BedrockTraceStatus?: "ENABLED" | "DISABLED";
          /**
           * @minLength 1
           * @maxLength 5000
           */
          BedrockModelCustomPrompt?: string;
        };
      };
      QInConnectIntentConfiguration?: {
        QInConnectAssistantConfiguration?: {
          /**
           * @minLength 1
           * @maxLength 200
           * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$
           */
          AssistantArn: string;
        };
      };
      BedrockAgentIntentConfiguration?: {
        BedrockAgentConfiguration?: {
          /**
           * @minLength 1
           * @maxLength 5000
           */
          BedrockAgentId?: string;
          /**
           * @minLength 1
           * @maxLength 5000
           */
          BedrockAgentAliasId?: string;
        };
        BedrockAgentIntentKnowledgeBaseConfiguration?: {
          /**
           * @minLength 1
           * @maxLength 5000
           */
          BedrockKnowledgeBaseArn: string;
          BedrockModelConfiguration: {
            /**
             * @minLength 1
             * @maxLength 5000
             */
            ModelArn: string;
            BedrockGuardrailConfiguration?: {
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailIdentifier?: string;
              /**
               * @minLength 1
               * @maxLength 5000
               */
              BedrockGuardrailVersion?: string;
            };
            /** @enum ["ENABLED","DISABLED"] */
            BedrockTraceStatus?: "ENABLED" | "DISABLED";
            /**
             * @minLength 1
             * @maxLength 5000
             */
            BedrockModelCustomPrompt?: string;
          };
        };
      };
      SlotPriorities?: {
        Priority: number;
        SlotName: string;
      }[];
      /**
       * @maxItems 100
       * @uniqueItems true
       */
      Slots?: ({
        Name: string;
        Description?: string;
        SlotTypeName: string;
        ValueElicitationSetting: {
          DefaultValueSpecification?: {
            /** @maxItems 10 */
            DefaultValueList: {
              /**
               * @minLength 1
               * @maxLength 202
               */
              DefaultValue: string;
            }[];
          };
          SlotConstraint: "Required" | "Optional";
          PromptSpecification?: {
            MessageGroupsList: {
              Message: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              };
              /** @maxItems 2 */
              Variations?: {
                PlainTextMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                CustomPayload?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                SSMLMessage?: {
                  /**
                   * @minLength 1
                   * @maxLength 1000
                   */
                  Value: string;
                };
                ImageResponseCard?: {
                  Title: string;
                  Subtitle?: string;
                  ImageUrl?: string;
                  /** @maxItems 5 */
                  Buttons?: {
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Text: string;
                    /**
                     * @minLength 1
                     * @maxLength 50
                     */
                    Value: string;
                  }[];
                };
              }[];
            }[];
            MaxRetries: number;
            AllowInterrupt?: boolean;
            MessageSelectionStrategy?: "Random" | "Ordered";
            PromptAttemptsSpecification?: Record<string, {
              AllowedInputTypes: {
                AllowAudioInput: boolean;
                AllowDTMFInput: boolean;
              };
              AllowInterrupt?: boolean;
              AudioAndDTMFInputSpecification?: {
                /** @minimum 1 */
                StartTimeoutMs: number;
                DTMFSpecification?: {
                  /** @pattern ^[A-D0-9#*]{1}$ */
                  DeletionCharacter: string;
                  /** @pattern ^[A-D0-9#*]{1}$ */
                  EndCharacter: string;
                  /** @minimum 1 */
                  EndTimeoutMs: number;
                  /**
                   * @minimum 1
                   * @maximum 1024
                   */
                  MaxLength: number;
                };
                AudioSpecification?: {
                  /** @minimum 1 */
                  EndTimeoutMs: number;
                  /** @minimum 1 */
                  MaxLengthMs: number;
                };
              };
              TextInputSpecification?: {
                /** @minimum 1 */
                StartTimeoutMs: number;
              };
            }>;
          };
          SampleUtterances?: {
            Utterance: string;
          }[];
          WaitAndContinueSpecification?: {
            WaitingResponse: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            ContinueResponse: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            StillWaitingResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              FrequencyInSeconds: number;
              TimeoutInSeconds: number;
              AllowInterrupt?: boolean;
            };
            IsActive?: boolean;
          };
          SlotCaptureSetting?: {
            CaptureResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            CaptureNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            CaptureConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            FailureResponse?: {
              MessageGroupsList: {
                Message: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                };
                /** @maxItems 2 */
                Variations?: {
                  PlainTextMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  CustomPayload?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  SSMLMessage?: {
                    /**
                     * @minLength 1
                     * @maxLength 1000
                     */
                    Value: string;
                  };
                  ImageResponseCard?: {
                    Title: string;
                    Subtitle?: string;
                    ImageUrl?: string;
                    /** @maxItems 5 */
                    Buttons?: {
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Text: string;
                      /**
                       * @minLength 1
                       * @maxLength 50
                       */
                      Value: string;
                    }[];
                  };
                }[];
              }[];
              AllowInterrupt?: boolean;
            };
            FailureNextStep?: {
              DialogAction?: {
                Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                SlotToElicit?: string;
                SuppressNextMessage?: boolean;
              };
              Intent?: {
                Name?: string;
                Slots?: ({
                  SlotName?: string;
                  SlotValueOverride?: {
                    Shape?: "Scalar" | "List";
                    Value?: {
                      /**
                       * @minLength 1
                       * @maxLength 202
                       */
                      InterpretedValue?: string;
                    };
                    Values?: unknown[];
                  };
                })[];
              };
              SessionAttributes?: {
                /**
                 * @minLength 1
                 * @maxLength 1024
                 */
                Key: string;
                /**
                 * @minLength 0
                 * @maxLength 1024
                 */
                Value?: string;
              }[];
            };
            FailureConditional?: {
              IsActive: boolean;
              ConditionalBranches: ({
                Name: string;
                Condition: {
                  ExpressionString: string;
                };
                NextStep: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              })[];
              DefaultBranch: {
                NextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                Response?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
              };
            };
            CodeHook?: {
              EnableCodeHookInvocation: boolean;
              IsActive: boolean;
              InvocationLabel?: string;
              PostCodeHookSpecification: {
                SuccessResponse?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
                SuccessNextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                SuccessConditional?: {
                  IsActive: boolean;
                  ConditionalBranches: ({
                    Name: string;
                    Condition: {
                      ExpressionString: string;
                    };
                    NextStep: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  })[];
                  DefaultBranch: {
                    NextStep?: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  };
                };
                FailureResponse?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
                FailureNextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                FailureConditional?: {
                  IsActive: boolean;
                  ConditionalBranches: ({
                    Name: string;
                    Condition: {
                      ExpressionString: string;
                    };
                    NextStep: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  })[];
                  DefaultBranch: {
                    NextStep?: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  };
                };
                TimeoutResponse?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
                TimeoutNextStep?: {
                  DialogAction?: {
                    Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                    SlotToElicit?: string;
                    SuppressNextMessage?: boolean;
                  };
                  Intent?: {
                    Name?: string;
                    Slots?: ({
                      SlotName?: string;
                      SlotValueOverride?: {
                        Shape?: "Scalar" | "List";
                        Value?: {
                          /**
                           * @minLength 1
                           * @maxLength 202
                           */
                          InterpretedValue?: string;
                        };
                        Values?: unknown[];
                      };
                    })[];
                  };
                  SessionAttributes?: {
                    /**
                     * @minLength 1
                     * @maxLength 1024
                     */
                    Key: string;
                    /**
                     * @minLength 0
                     * @maxLength 1024
                     */
                    Value?: string;
                  }[];
                };
                TimeoutConditional?: {
                  IsActive: boolean;
                  ConditionalBranches: ({
                    Name: string;
                    Condition: {
                      ExpressionString: string;
                    };
                    NextStep: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  })[];
                  DefaultBranch: {
                    NextStep?: {
                      DialogAction?: {
                        Type: "CloseIntent" | "ConfirmIntent" | "ElicitIntent" | "ElicitSlot" | "StartIntent" | "FulfillIntent" | "EndConversation" | "EvaluateConditional" | "InvokeDialogCodeHook";
                        SlotToElicit?: string;
                        SuppressNextMessage?: boolean;
                      };
                      Intent?: {
                        Name?: string;
                        Slots?: ({
                          SlotName?: string;
                          SlotValueOverride?: {
                            Shape?: "Scalar" | "List";
                            Value?: {
                              /**
                               * @minLength 1
                               * @maxLength 202
                               */
                              InterpretedValue?: string;
                            };
                            Values?: unknown[];
                          };
                        })[];
                      };
                      SessionAttributes?: {
                        /**
                         * @minLength 1
                         * @maxLength 1024
                         */
                        Key: string;
                        /**
                         * @minLength 0
                         * @maxLength 1024
                         */
                        Value?: string;
                      }[];
                    };
                    Response?: {
                      MessageGroupsList: {
                        Message: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        };
                        /** @maxItems 2 */
                        Variations?: {
                          PlainTextMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          CustomPayload?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          SSMLMessage?: {
                            /**
                             * @minLength 1
                             * @maxLength 1000
                             */
                            Value: string;
                          };
                          ImageResponseCard?: {
                            Title: string;
                            Subtitle?: string;
                            ImageUrl?: string;
                            /** @maxItems 5 */
                            Buttons?: {
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Text: string;
                              /**
                               * @minLength 1
                               * @maxLength 50
                               */
                              Value: string;
                            }[];
                          };
                        }[];
                      }[];
                      AllowInterrupt?: boolean;
                    };
                  };
                };
              };
            };
            ElicitationCodeHook?: {
              EnableCodeHookInvocation: boolean;
              InvocationLabel?: string;
            };
          };
        };
        ObfuscationSetting?: {
          /** @enum ["None","DefaultObfuscation"] */
          ObfuscationSettingType: "None" | "DefaultObfuscation";
        };
        MultipleValuesSetting?: {
          AllowMultipleValues?: boolean;
        };
        SubSlotSetting?: {
          /**
           * @minLength 1
           * @maxLength 1000
           * @pattern [0-9A-Za-z_\-\s\(\)]+
           */
          Expression?: string;
          SlotSpecifications?: Record<string, {
            SlotTypeId: string;
            ValueElicitationSetting: {
              PromptSpecification?: {
                MessageGroupsList: {
                  Message: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  };
                  /** @maxItems 2 */
                  Variations?: {
                    PlainTextMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    CustomPayload?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    SSMLMessage?: {
                      /**
                       * @minLength 1
                       * @maxLength 1000
                       */
                      Value: string;
                    };
                    ImageResponseCard?: {
                      Title: string;
                      Subtitle?: string;
                      ImageUrl?: string;
                      /** @maxItems 5 */
                      Buttons?: {
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Text: string;
                        /**
                         * @minLength 1
                         * @maxLength 50
                         */
                        Value: string;
                      }[];
                    };
                  }[];
                }[];
                MaxRetries: number;
                AllowInterrupt?: boolean;
                MessageSelectionStrategy?: "Random" | "Ordered";
                PromptAttemptsSpecification?: Record<string, {
                  AllowedInputTypes: {
                    AllowAudioInput: boolean;
                    AllowDTMFInput: boolean;
                  };
                  AllowInterrupt?: boolean;
                  AudioAndDTMFInputSpecification?: {
                    /** @minimum 1 */
                    StartTimeoutMs: number;
                    DTMFSpecification?: {
                      /** @pattern ^[A-D0-9#*]{1}$ */
                      DeletionCharacter: string;
                      /** @pattern ^[A-D0-9#*]{1}$ */
                      EndCharacter: string;
                      /** @minimum 1 */
                      EndTimeoutMs: number;
                      /**
                       * @minimum 1
                       * @maximum 1024
                       */
                      MaxLength: number;
                    };
                    AudioSpecification?: {
                      /** @minimum 1 */
                      EndTimeoutMs: number;
                      /** @minimum 1 */
                      MaxLengthMs: number;
                    };
                  };
                  TextInputSpecification?: {
                    /** @minimum 1 */
                    StartTimeoutMs: number;
                  };
                }>;
              };
              DefaultValueSpecification?: {
                /** @maxItems 10 */
                DefaultValueList: {
                  /**
                   * @minLength 1
                   * @maxLength 202
                   */
                  DefaultValue: string;
                }[];
              };
              SampleUtterances?: {
                Utterance: string;
              }[];
              WaitAndContinueSpecification?: {
                WaitingResponse: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
                ContinueResponse: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  AllowInterrupt?: boolean;
                };
                StillWaitingResponse?: {
                  MessageGroupsList: {
                    Message: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    };
                    /** @maxItems 2 */
                    Variations?: {
                      PlainTextMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      CustomPayload?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      SSMLMessage?: {
                        /**
                         * @minLength 1
                         * @maxLength 1000
                         */
                        Value: string;
                      };
                      ImageResponseCard?: {
                        Title: string;
                        Subtitle?: string;
                        ImageUrl?: string;
                        /** @maxItems 5 */
                        Buttons?: {
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Text: string;
                          /**
                           * @minLength 1
                           * @maxLength 50
                           */
                          Value: string;
                        }[];
                      };
                    }[];
                  }[];
                  FrequencyInSeconds: number;
                  TimeoutInSeconds: number;
                  AllowInterrupt?: boolean;
                };
                IsActive?: boolean;
              };
            };
          }>;
        };
      })[];
    })[];
    /**
     * @maxItems 250
     * @uniqueItems true
     */
    SlotTypes?: ({
      Name: string;
      Description?: string;
      ParentSlotTypeSignature?: string;
      SlotTypeValues?: {
        SampleValue: {
          /**
           * @minLength 1
           * @maxLength 140
           */
          Value: string;
        };
        Synonyms?: {
          /**
           * @minLength 1
           * @maxLength 140
           */
          Value: string;
        }[];
      }[];
      ValueSelectionSetting?: {
        ResolutionStrategy: "ORIGINAL_VALUE" | "TOP_RESOLUTION" | "CONCATENATION";
        RegexFilter?: {
          /**
           * @minLength 1
           * @maxLength 300
           */
          Pattern: string;
        };
        AdvancedRecognitionSetting?: {
          AudioRecognitionStrategy?: "UseSlotValuesAsCustomVocabulary";
        };
      };
      ExternalSourceSetting?: {
        GrammarSlotTypeSetting?: {
          Source?: {
            S3BucketName: string;
            S3ObjectKey: string;
            /**
             * @minLength 20
             * @maxLength 2048
             * @pattern ^arn:[\w\-]+:kms:[\w\-]+:[\d]{12}:(?:key\/[\w\-]+|alias\/[a-zA-Z0-9:\/_\-]{1,256})$
             */
            KmsKeyArn?: string;
          };
        };
      };
      CompositeSlotTypeSetting?: {
        /**
         * @minItems 1
         * @maxItems 6
         * @uniqueItems true
         */
        SubSlots?: {
          /**
           * @minLength 1
           * @maxLength 100
           * @pattern ^([0-9a-zA-Z][_-]?){1,100}$
           */
          Name: string;
          SlotTypeId: string;
        }[];
      };
    })[];
    CustomVocabulary?: {
      CustomVocabularyItems: {
        /**
         * @minLength 1
         * @maxLength 100
         */
        Phrase: string;
        /**
         * @minimum 0
         * @maximum 3
         */
        Weight?: number;
        /**
         * @minLength 1
         * @maxLength 100
         */
        DisplayAs?: string;
      }[];
    };
  })[];
  BotFileS3Location?: {
    S3Bucket: string;
    S3ObjectKey: string;
    /**
     * @minLength 1
     * @maxLength 1024
     */
    S3ObjectVersion?: string;
  };
  /**
   * @maxItems 200
   * @uniqueItems true
   */
  BotTags?: {
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
   * @maxItems 200
   * @uniqueItems true
   */
  TestBotAliasTags?: {
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
  AutoBuildBotLocales?: boolean;
  TestBotAliasSettings?: {
    BotAliasLocaleSettings?: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      LocaleId: string;
      BotAliasLocaleSetting: {
        CodeHookSpecification?: {
          LambdaCodeHook: {
            /**
             * @minLength 1
             * @maxLength 5
             */
            CodeHookInterfaceVersion: string;
            /**
             * @minLength 20
             * @maxLength 2048
             */
            LambdaArn: string;
          };
        };
        Enabled: boolean;
      };
    }[];
    ConversationLogSettings?: {
      AudioLogSettings?: {
        Destination: {
          S3Bucket: {
            /**
             * @minLength 1
             * @maxLength 2048
             * @pattern ^arn:[\w\-]+:s3:::[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
             */
            S3BucketArn: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            LogPrefix: string;
            /**
             * @minLength 20
             * @maxLength 2048
             * @pattern ^arn:[\w\-]+:kms:[\w\-]+:[\d]{12}:(?:key\/[\w\-]+|alias\/[a-zA-Z0-9:\/_\-]{1,256})$
             */
            KmsKeyArn?: string;
          };
        };
        Enabled: boolean;
      }[];
      TextLogSettings?: {
        Destination: {
          CloudWatch: {
            /**
             * @minLength 1
             * @maxLength 2048
             */
            CloudWatchLogGroupArn: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            LogPrefix: string;
          };
        };
        Enabled: boolean;
      }[];
    };
    Description?: string;
    SentimentAnalysisSettings?: {
      DetectSentiment: boolean;
    };
  };
  Replication?: {
    /**
     * @minItems 1
     * @maxItems 1
     * @uniqueItems true
     */
    ReplicaRegions: string[];
  };
};
