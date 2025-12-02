// This file is auto-generated. Do not edit manually.
// Source: aws-rolesanywhere-crl.json

/** Definition of AWS::RolesAnywhere::CRL Resource Type */
export type AwsRolesanywhereCrl = {
  CrlData: string;
  /** @pattern [a-f0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12} */
  CrlId?: string;
  Enabled?: boolean;
  Name: string;
  /** @pattern ^arn:aws(-[^:]+)?:rolesanywhere(:.*){2}(:trust-anchor.*)$ */
  TrustAnchorArn?: string;
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
