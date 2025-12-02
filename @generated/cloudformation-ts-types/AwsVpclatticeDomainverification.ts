// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-domainverification.json

/** Creates a Lattice Domain Verification */
export type AwsVpclatticeDomainverification = {
  /**
   * @minLength 3
   * @maxLength 255
   */
  DomainName: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((dv-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:domainverification/dv-[0-9a-z]{17}))$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:domainverification/dv-[0-9a-z]{17}$
   */
  Arn?: string;
  /** @enum ["VERIFIED","PENDING","VERIFICATION_TIMED_OUT"] */
  Status?: "VERIFIED" | "PENDING" | "VERIFICATION_TIMED_OUT";
  TxtMethodConfig?: {
    name?: string;
    value?: string;
  };
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
  }[];
};
