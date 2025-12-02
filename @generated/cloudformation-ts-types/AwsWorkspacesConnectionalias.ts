// This file is auto-generated. Do not edit manually.
// Source: aws-workspaces-connectionalias.json

/** Resource Type definition for AWS::WorkSpaces::ConnectionAlias */
export type AwsWorkspacesConnectionalias = {
  /**
   * @minLength 1
   * @maxLength 25
   */
  Associations?: ({
    /** @enum ["NOT_ASSOCIATED","PENDING_ASSOCIATION","ASSOCIATED_WITH_OWNER_ACCOUNT","ASSOCIATED_WITH_SHARED_ACCOUNT","PENDING_DISASSOCIATION"] */
    AssociationStatus?: "NOT_ASSOCIATED" | "PENDING_ASSOCIATION" | "ASSOCIATED_WITH_OWNER_ACCOUNT" | "ASSOCIATED_WITH_SHARED_ACCOUNT" | "PENDING_DISASSOCIATION";
    AssociatedAccountId?: string;
    /**
     * @minLength 1
     * @maxLength 1000
     * @pattern .+
     */
    ResourceId?: string;
    /**
     * @minLength 1
     * @maxLength 20
     * @pattern ^[a-zA-Z0-9]+$
     */
    ConnectionIdentifier?: string;
  })[];
  /**
   * @minLength 13
   * @maxLength 68
   * @pattern ^wsca-[0-9a-z]{8,63}$
   */
  AliasId?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[.0-9a-zA-Z\-]{1,255}$
   */
  ConnectionString: string;
  /** @enum ["CREATING","CREATED","DELETING"] */
  ConnectionAliasState?: "CREATING" | "CREATED" | "DELETING";
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
