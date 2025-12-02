// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-aiprompt.json

/** Definition of AWS::Wisdom::AIPrompt Resource Type */
export type AwsWisdomAiprompt = {
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}(:[A-Z0-9_$]+){0,1}$ */
  AIPromptId?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AIPromptArn?: string;
  ApiFormat: "ANTHROPIC_CLAUDE_MESSAGES" | "ANTHROPIC_CLAUDE_TEXT_COMPLETIONS" | "MESSAGES" | "TEXT_COMPLETIONS";
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantId?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantArn?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\s_.,-]+
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  ModelId: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\s_.,-]+
   */
  Name?: string;
  Tags?: Record<string, string>;
  TemplateConfiguration: {
    TextFullAIPromptEditTemplateConfiguration: {
      /**
       * @minLength 1
       * @maxLength 200000
       */
      Text: string;
    };
  };
  TemplateType: "TEXT";
  Type: "ANSWER_GENERATION" | "INTENT_LABELING_GENERATION" | "QUERY_REFORMULATION" | "SELF_SERVICE_PRE_PROCESSING" | "SELF_SERVICE_ANSWER_GENERATION" | "EMAIL_RESPONSE" | "EMAIL_OVERVIEW" | "EMAIL_GENERATIVE_ANSWER" | "EMAIL_QUERY_REFORMULATION";
  ModifiedTimeSeconds?: number;
};
