// This file is auto-generated. Do not edit manually.
// Source: aws-chatbot-customaction.json

/** Definition of AWS::Chatbot::CustomAction Resource Type */
export type AwsChatbotCustomaction = {
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]{1,64}$
   */
  ActionName: string;
  /**
   * @minLength 1
   * @maxLength 30
   * @pattern ^[A-Za-z0-9-_]+$
   */
  AliasName?: string;
  Attachments?: ({
    /**
     * @minLength 1
     * @maxLength 100
     * @pattern ^[a-zA-Z0-9-]+$
     */
    NotificationType?: string;
    /**
     * @minLength 1
     * @maxLength 50
     * @pattern ^[\S\s]+$
     */
    ButtonText?: string;
    /**
     * @minItems 1
     * @maxItems 5
     */
    Criteria?: ({
      Operator: "HAS_VALUE" | "EQUALS";
      VariableName: string;
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Value?: string;
    })[];
    Variables?: Record<string, string>;
  })[];
  /**
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:(aws[a-zA-Z-]*)?:chatbot:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:custom-action/[a-zA-Z0-9_-]{1,64}$
   */
  CustomActionArn?: string;
  Definition: {
    /**
     * @minLength 1
     * @maxLength 5000
     */
    CommandText: string;
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
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
};
