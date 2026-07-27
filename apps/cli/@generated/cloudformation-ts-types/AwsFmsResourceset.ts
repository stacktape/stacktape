// This file is auto-generated. Do not edit manually.
// Source: aws-fms-resourceset.json

/** Creates an AWS Firewall Manager resource set. */
export type AwsFmsResourceset = {
  Id?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^([a-zA-Z0-9_.:/=+\-@\s]+)$
   */
  Name: string;
  /**
   * @maxLength 256
   * @pattern ^([a-zA-Z0-9_.:/=+\-@\s]*)$
   */
  Description?: string;
  /** @uniqueItems true */
  ResourceTypeList: string[];
  /** @uniqueItems true */
  Resources?: string[];
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([^\s]*)$
     */
    Key: string;
    /**
     * @maxLength 256
     * @pattern ^([^\s]*)$
     */
    Value: string;
  }[];
};
