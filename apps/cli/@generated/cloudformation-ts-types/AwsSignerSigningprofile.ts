// This file is auto-generated. Do not edit manually.
// Source: aws-signer-signingprofile.json

/** A signing profile is a signing template that can be used to carry out a pre-defined signing job. */
export type AwsSignerSigningprofile = {
  /**
   * A name for the signing profile. If you don't specify a name, AWS CloudFormation generates a unique
   * physical ID and uses that ID for the signing profile name.
   */
  ProfileName?: string;
  /**
   * A version for the signing profile. AWS Signer generates a unique version for each profile of the
   * same profile name.
   */
  ProfileVersion?: string;
  /** The Amazon Resource Name (ARN) of the specified signing profile. */
  Arn?: string;
  /** The Amazon Resource Name (ARN) of the specified signing profile version. */
  ProfileVersionArn?: string;
  /** Signature validity period of the profile. */
  SignatureValidityPeriod?: {
    Value?: number;
    /** @enum ["DAYS","MONTHS","YEARS"] */
    Type?: "DAYS" | "MONTHS" | "YEARS";
  };
  /** The ID of the target signing platform. */
  PlatformId: "AWSLambda-SHA384-ECDSA" | "Notation-OCI-SHA384-ECDSA";
  /** A list of tags associated with the signing profile. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Value?: string;
  }[];
};
