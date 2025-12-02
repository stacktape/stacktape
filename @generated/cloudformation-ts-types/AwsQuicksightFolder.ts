// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-folder.json

/** Definition of the AWS::QuickSight::Folder Resource Type. */
export type AwsQuicksightFolder = {
  /**
   * <p>The Amazon Resource Name (ARN) for the folder.</p>
   * @pattern ^arn:.*
   */
  Arn?: string;
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  /** <p>The time that the folder was created.</p> */
  CreatedTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[\w\-]+$
   */
  FolderId?: string;
  FolderType?: "SHARED" | "RESTRICTED";
  /** <p>The time that the folder was last updated.</p> */
  LastUpdatedTime?: string;
  /**
   * @minLength 1
   * @maxLength 200
   */
  Name?: string;
  ParentFolderArn?: string;
  /**
   * @minItems 1
   * @maxItems 64
   */
  Permissions?: {
    /**
     * <p>The Amazon Resource Name (ARN) of the principal. This can be one of the
     * following:</p>
     * <ul>
     * <li>
     * <p>The ARN of an Amazon QuickSight user or group associated with a data source or
     * dataset. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon QuickSight user, group, or namespace associated with an
     * analysis, dashboard, template, or theme. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon Web Services account root: This is an IAM ARN rather than a
     * QuickSight
     * ARN. Use this option only to share resources (templates) across Amazon Web
     * Services accounts.
     * (This is less common.) </p>
     * </li>
     * </ul>
     * @minLength 1
     * @maxLength 256
     * @pattern ^arn:.*
     */
    Principal: string;
    /**
     * <p>The IAM action to grant or revoke permissions on.</p>
     * @minItems 1
     * @maxItems 20
     */
    Actions: string[];
  }[];
  SharingModel?: "ACCOUNT" | "NAMESPACE";
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
