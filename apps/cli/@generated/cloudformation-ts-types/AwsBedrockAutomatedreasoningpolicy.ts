// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-automatedreasoningpolicy.json

/** Definition of AWS::Bedrock::AutomatedReasoningPolicy Resource Type */
export type AwsBedrockAutomatedreasoningpolicy = {
  Name: string;
  Description?: string;
  PolicyDefinition?: {
    /** The policy format version. */
    Version?: string;
    /** The types definition block of an AutomatedReasoningPolicyDefinition. */
    Types?: {
      /**
       * A name for this type.
       * @minLength 1
       * @maxLength 64
       * @pattern ^[A-Za-z][A-Za-z0-9_]+$
       */
      Name: string;
      /**
       * A natural language description of this type.
       * @maxLength 1024
       * @pattern ^[\s\S]+$
       */
      Description?: string;
      /** A list of valid values for this type. */
      Values: {
        /**
         * The value of the type value.
         * @minLength 1
         * @maxLength 64
         * @pattern ^[A-Za-z][A-Za-z0-9_]+$
         */
        Value: string;
        /**
         * A natural language description of the type's value.
         * @maxLength 1024
         * @pattern ^[\s\S]+$
         */
        Description?: string;
      }[];
    }[];
    /** The rules definition block of an AutomatedReasoningPolicyDefinition. */
    Rules?: {
      /**
       * A unique id within the PolicyDefinition
       * @minLength 12
       * @maxLength 12
       * @pattern ^[A-Z][0-9A-Z]{11}$
       */
      Id: string;
      /**
       * The SMT expression for this rule
       * @maxLength 2048
       * @pattern ^[\s\S]+$
       */
      Expression: string;
      /**
       * An alternate expression for this rule
       * @maxLength 2048
       * @pattern ^[\s\S]+$
       */
      AlternateExpression?: string;
    }[];
    /** The variables definition block of an AutomatedReasoningPolicyDefinition. */
    Variables?: {
      /**
       * A name from this variable.
       * @minLength 1
       * @maxLength 64
       * @pattern ^[A-Za-z][A-Za-z0-9_]+$
       */
      Name: string;
      /**
       * A type for this variable.
       * @minLength 1
       * @maxLength 64
       * @pattern ^[A-Za-z][A-Za-z0-9_]+$
       */
      Type: string;
      /**
       * A natural language description of this variable.
       * @maxLength 1024
       * @pattern ^[\s\S]+$
       */
      Description: string;
    }[];
  };
  PolicyArn?: string;
  KmsKeyId?: string;
  KmsKeyArn?: string;
  Version?: string;
  DefinitionHash?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  PolicyId?: string;
  Tags?: {
    /**
     * Tag Key
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Key: string;
    /**
     * Tag Value
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Value: string;
  }[];
  ForceDelete?: boolean;
};
