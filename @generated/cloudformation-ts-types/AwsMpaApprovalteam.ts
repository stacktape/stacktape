// This file is auto-generated. Do not edit manually.
// Source: aws-mpa-approvalteam.json

/** Resource Type definition for AWS::MPA::ApprovalTeam. */
export type AwsMpaApprovalteam = {
  ApprovalStrategy: {
    MofN: {
      MinApprovalsRequired: number;
    };
  };
  /**
   * @minItems 1
   * @uniqueItems true
   */
  Approvers: {
    PrimaryIdentityId: string;
    PrimaryIdentitySourceArn: string;
    ApproverId?: string;
    ResponseTime?: string;
    PrimaryIdentityStatus?: string;
  }[];
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /**
   * @minItems 1
   * @uniqueItems true
   */
  Policies: unknown[];
  Name: string;
  Description: string;
  Arn?: string;
  VersionId?: string;
  UpdateSessionArn?: string;
  CreationTime?: string;
  LastUpdateTime?: string;
  NumberOfApprovers?: number;
  Status?: string;
  StatusCode?: string;
  StatusMessage?: string;
};
