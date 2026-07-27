// This file is auto-generated. Do not edit manually.
// Source: aws-s3-accessgrant.json

/**
 * The AWS::S3::AccessGrant resource is an Amazon S3 resource type representing permissions to a
 * specific S3 bucket or prefix hosted in an S3 Access Grants instance.
 */
export type AwsS3Accessgrant = {
  /** The ID assigned to this access grant. */
  AccessGrantId?: string;
  /** The custom S3 location to be accessed by the grantee */
  AccessGrantsLocationId: string;
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /**
   * The level of access to be afforded to the grantee
   * @enum ["READ","WRITE","READWRITE"]
   */
  Permission: "READ" | "WRITE" | "READWRITE";
  /** The ARN of the application grantees will use to access the location */
  ApplicationArn?: string;
  /**
   * The type of S3SubPrefix.
   * @enum ["Object"]
   */
  S3PrefixType?: "Object";
  /**
   * The S3 path of the data to which you are granting access. It is a combination of the S3 path of the
   * registered location and the subprefix.
   */
  GrantScope?: string;
  /** The Amazon Resource Name (ARN) of the specified access grant. */
  AccessGrantArn?: string;
  /** The principal who will be granted permission to access S3. */
  Grantee: {
    /**
     * Configures the transfer acceleration state for an Amazon S3 bucket.
     * @enum ["IAM","DIRECTORY_USER","DIRECTORY_GROUP"]
     */
    GranteeType: "IAM" | "DIRECTORY_USER" | "DIRECTORY_GROUP";
    /** The unique identifier of the Grantee */
    GranteeIdentifier: string;
  };
  /**
   * The configuration options of the grant location, which is the S3 path to the data to which you are
   * granting access.
   */
  AccessGrantsLocationConfiguration?: {
    /** The S3 sub prefix of a registered location in your S3 Access Grants instance */
    S3SubPrefix: string;
  };
};
