// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-prefixlist.json

/** Resource schema of AWS::EC2::PrefixList Type */
export type AwsEc2Prefixlist = {
  /**
   * Name of Prefix List.
   * @minLength 1
   * @maxLength 255
   */
  PrefixListName: string;
  /** Id of Prefix List. */
  PrefixListId?: string;
  /** Owner Id of Prefix List. */
  OwnerId?: string;
  /**
   * Ip Version of Prefix List.
   * @enum ["IPv4","IPv6"]
   */
  AddressFamily: "IPv4" | "IPv6";
  /**
   * Max Entries of Prefix List.
   * @minimum 1
   */
  MaxEntries?: number;
  /** Version of Prefix List. */
  Version?: number;
  /** Tags for Prefix List */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value?: string;
  }[];
  /** Entries of Prefix List. */
  Entries?: {
    /**
     * @minLength 1
     * @maxLength 46
     */
    Cidr: string;
    /**
     * @minLength 0
     * @maxLength 255
     */
    Description?: string;
  }[];
  /** The Amazon Resource Name (ARN) of the Prefix List. */
  Arn?: string;
};
