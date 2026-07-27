// This file is auto-generated. Do not edit manually.
// Source: aws-fsx-s3accesspointattachment.json

/** Resource type definition for AWS::FSx::S3AccessPointAttachment */
export type AwsFsxS3accesspointattachment = {
  /**
   * The Name of the S3AccessPointAttachment
   * @minLength 3
   * @maxLength 50
   * @pattern ^(?=[a-z0-9])[a-z0-9-]{1,48}[a-z0-9]$
   */
  Name: string;
  /** @enum ["OPENZFS"] */
  Type: "OPENZFS";
  OpenZFSConfiguration: {
    /**
     * @minLength 23
     * @maxLength 23
     * @pattern ^(fsvol-[0-9a-f]{17,})$
     */
    VolumeId: string;
    FileSystemIdentity: {
      /** @enum ["POSIX"] */
      Type: "POSIX";
      PosixUser: {
        /**
         * @minimum 0
         * @maximum 4294967295
         */
        Uid: number;
        /**
         * @minimum 0
         * @maximum 4294967295
         */
        Gid: number;
        SecondaryGids?: {
          /**
           * @minimum 0
           * @maximum 4294967295
           */
          Gid: number;
        }[];
      };
    };
  };
  S3AccessPoint?: {
    /**
     * @minLength 8
     * @maxLength 1024
     * @pattern ^arn:[^:]{1,63}:[^:]{0,63}:[^:]{0,63}:(?:|\d{12}):[^/].{0,1023}$
     */
    ResourceARN?: string;
    /**
     * @minLength 1
     * @maxLength 63
     * @pattern ^[0-9a-z\\-]{1,63}
     */
    Alias?: string;
    VpcConfiguration?: {
      /**
       * @minLength 12
       * @maxLength 21
       * @pattern ^(vpc-[0-9a-f]{8,})$
       */
      VpcId: string;
    };
    /**
     * @minLength 1
     * @maxLength 200000
     */
    Policy?: Record<string, unknown> | string;
  };
};
