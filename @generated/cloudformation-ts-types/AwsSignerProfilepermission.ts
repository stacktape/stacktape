// This file is auto-generated. Do not edit manually.
// Source: aws-signer-profilepermission.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsSignerProfilepermission = {
  /** @pattern ^[0-9a-zA-Z_]{2,64}$ */
  ProfileName: string;
  /** @pattern ^[0-9a-zA-Z]{10}$ */
  ProfileVersion?: string;
  Action: string;
  Principal: string;
  StatementId: string;
};
