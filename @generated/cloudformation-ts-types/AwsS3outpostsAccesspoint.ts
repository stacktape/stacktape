// This file is auto-generated. Do not edit manually.
// Source: aws-s3outposts-accesspoint.json

/** Resource Type Definition for AWS::S3Outposts::AccessPoint */
export type AwsS3outpostsAccesspoint = {
  /**
   * The Amazon Resource Name (ARN) of the specified AccessPoint.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[^:]+:s3-outposts:[a-zA-Z0-9\-]+:\d{12}:outpost\/[^:]+\/accesspoint\/[^:]+$
   */
  Arn?: string;
  /**
   * The Amazon Resource Name (ARN) of the bucket you want to associate this AccessPoint with.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[^:]+:s3-outposts:[a-zA-Z0-9\-]+:\d{12}:outpost\/[^:]+\/bucket\/[^:]+$
   */
  Bucket: string;
  /**
   * A name for the AccessPoint.
   * @minLength 3
   * @maxLength 50
   * @pattern ^[a-z0-9]([a-z0-9\\-]*[a-z0-9])?$
   */
  Name: string;
  /** Virtual Private Cloud (VPC) from which requests can be made to the AccessPoint. */
  VpcConfiguration: {
    /**
     * Virtual Private Cloud (VPC) Id from which AccessPoint will allow requests.
     * @minLength 1
     * @maxLength 1024
     */
    VpcId?: string;
  };
  /** The access point policy associated with this access point. */
  Policy?: Record<string, unknown>;
};
