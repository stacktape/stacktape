// This file is auto-generated. Do not edit manually.
// Source: aws-wafv2-regexpatternset.json

/**
 * Contains a list of Regular expressions based on the provided inputs. RegexPatternSet can be used
 * with other WAF entities with RegexPatternSetReferenceStatement to perform other actions .
 */
export type AwsWafv2Regexpatternset = {
  /** ARN of the WAF entity. */
  Arn?: string;
  /**
   * Description of the entity.
   * @pattern ^[a-zA-Z0-9=:#@/\-,.][a-zA-Z0-9+=:#@/\-,.\s]+[a-zA-Z0-9+=:#@/\-,.]{1,256}$
   */
  Description?: string;
  /**
   * Name of the RegexPatternSet.
   * @pattern ^[0-9A-Za-z_-]{1,128}$
   */
  Name?: string;
  /**
   * Id of the RegexPatternSet
   * @pattern ^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$
   */
  Id?: string;
  RegularExpressionList: string[];
  /**
   * Use CLOUDFRONT for CloudFront RegexPatternSet, use REGIONAL for Application Load Balancer and API
   * Gateway.
   * @enum ["CLOUDFRONT","REGIONAL"]
   */
  Scope: "CLOUDFRONT" | "REGIONAL";
  /** @minItems 1 */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
