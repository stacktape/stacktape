// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-guardrailversion.json

/** Definition of AWS::Bedrock::GuardrailVersion Resource Type */
export type AwsBedrockGuardrailversion = {
  /**
   * Description of the Guardrail version
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * Arn representation for the guardrail
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+$
   */
  GuardrailArn?: string;
  /**
   * Unique id for the guardrail
   * @maxLength 64
   * @pattern ^[a-z0-9]+$
   */
  GuardrailId?: string;
  /**
   * Identifier (GuardrailId or GuardrailArn) for the guardrail
   * @maxLength 2048
   * @pattern ^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$
   */
  GuardrailIdentifier: string;
  /**
   * Guardrail version
   * @pattern ^[1-9][0-9]{0,7}$
   */
  Version?: string;
};
