// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-user.json

/** Definition of AWS::Transfer::User Resource Type */
export type AwsTransferUser = {
  /**
   * @minLength 20
   * @maxLength 1600
   * @pattern ^arn:\S+$
   */
  Arn?: string;
  /**
   * @minLength 0
   * @maxLength 1024
   * @pattern ^(|/.*)$
   */
  HomeDirectory?: string;
  /**
   * @minItems 1
   * @maxItems 50000
   */
  HomeDirectoryMappings?: ({
    /**
     * @minLength 0
     * @maxLength 1024
     * @pattern ^/.*$
     */
    Entry: string;
    /**
     * @minLength 0
     * @maxLength 1024
     * @pattern ^/.*$
     */
    Target: string;
    Type?: "FILE" | "DIRECTORY";
  })[];
  HomeDirectoryType?: "PATH" | "LOGICAL";
  /**
   * @minLength 0
   * @maxLength 2048
   */
  Policy?: string;
  PosixProfile?: {
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
    /**
     * @minItems 0
     * @maxItems 16
     */
    SecondaryGids?: number[];
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:.*role/\S+$
   */
  Role: string;
  /**
   * @minLength 19
   * @maxLength 19
   * @pattern ^s-([0-9a-f]{17})$
   */
  ServerId: string;
  /** This represents the SSH User Public Keys for CloudFormation resource */
  SshPublicKeys?: string[];
  /**
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 3
   * @maxLength 100
   * @pattern ^[\w][\w@.-]{2,99}$
   */
  UserName: string;
};
