// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-automatedreasoningpolicyversion.json

/** Definition of AWS::Bedrock::AutomatedReasoningPolicyVersion Resource Type */
export type AwsBedrockAutomatedreasoningpolicyversion = {
  PolicyArn: string;
  Name?: string;
  Description?: string;
  Version?: string;
  DefinitionHash?: string;
  LastUpdatedDefinitionHash?: string;
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
};
