// This file is auto-generated. Do not edit manually.
// Source: aws-wafv2-ipset.json

/** Contains a list of IP addresses. This can be either IPV4 or IPV6. The list will be mutually */
export type AwsWafv2Ipset = {
  Arn?: string;
  Description?: string;
  Name?: string;
  Id?: string;
  Scope: "CLOUDFRONT" | "REGIONAL";
  IPAddressVersion: "IPV4" | "IPV6";
  /** List of IPAddresses. */
  Addresses: string[];
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
