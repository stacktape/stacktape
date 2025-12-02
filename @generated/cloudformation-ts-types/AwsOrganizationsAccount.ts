// This file is auto-generated. Do not edit manually.
// Source: aws-organizations-account.json

/** You can use AWS::Organizations::Account to manage accounts in organization. */
export type AwsOrganizationsAccount = {
  /**
   * The friendly name of the member account.
   * @minLength 1
   * @maxLength 50
   * @pattern [\u0020-\u007E]+
   */
  AccountName: string;
  /**
   * The email address of the owner to assign to the new member account.
   * @minLength 6
   * @maxLength 64
   * @pattern [^\s@]+@[^\s@]+\.[^\s@]+
   */
  Email: string;
  /**
   * The name of an IAM role that AWS Organizations automatically preconfigures in the new member
   * account. Default name is OrganizationAccountAccessRole if not specified.
   * @default "OrganizationAccountAccessRole"
   * @minLength 1
   * @maxLength 64
   * @pattern [\w+=,.@-]{1,64}
   */
  RoleName?: string;
  /**
   * List of parent nodes for the member account. Currently only one parent at a time is supported.
   * Default is root.
   * @uniqueItems true
   */
  ParentIds?: string[];
  /**
   * A list of tags that you want to attach to the newly created account. For each tag in the list, you
   * must specify both a tag key and a value.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key identifier, or name, of the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern [\s\S]*
     */
    Key: string;
    /**
     * The string value that's associated with the key of the tag. You can set the value of a tag to an
     * empty string, but you can't set the value of a tag to null.
     * @minLength 0
     * @maxLength 256
     * @pattern [\s\S]*
     */
    Value: string;
  }[];
  /**
   * If the account was created successfully, the unique identifier (ID) of the new account.
   * @maxLength 12
   * @pattern ^\d{12}$
   */
  AccountId?: string;
  /**
   * The Amazon Resource Name (ARN) of the account.
   * @pattern ^arn:aws.*:organizations::\d{12}:account\/o-[a-z0-9]{10,32}\/\d{12}
   */
  Arn?: string;
  /**
   * The method by which the account joined the organization.
   * @enum ["INVITED","CREATED"]
   */
  JoinedMethod?: "INVITED" | "CREATED";
  /** The date the account became a part of the organization. */
  JoinedTimestamp?: string;
  /**
   * The status of the account in the organization.
   * @enum ["ACTIVE","SUSPENDED","PENDING_CLOSURE"]
   */
  Status?: "ACTIVE" | "SUSPENDED" | "PENDING_CLOSURE";
  /**
   * The state of the account in the organization.
   * @enum ["PENDING_ACTIVATION","ACTIVE","SUSPENDED","PENDING_CLOSURE","CLOSED"]
   */
  State?: "PENDING_ACTIVATION" | "ACTIVE" | "SUSPENDED" | "PENDING_CLOSURE" | "CLOSED";
};
