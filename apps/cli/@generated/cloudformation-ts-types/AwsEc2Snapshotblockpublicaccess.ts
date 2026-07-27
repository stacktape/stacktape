// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-snapshotblockpublicaccess.json

/** Resource Type definition for AWS::EC2::SnapshotBlockPublicAccess */
export type AwsEc2Snapshotblockpublicaccess = {
  /**
   * The state of EBS Snapshot Block Public Access.
   * @enum ["block-all-sharing","block-new-sharing"]
   */
  State: "block-all-sharing" | "block-new-sharing";
  /** The identifier for the specified AWS account. */
  AccountId?: string;
};
