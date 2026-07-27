// This file is auto-generated. Do not edit manually.
// Source: aws-identitystore-group.json

/** Resource Type definition for AWS::IdentityStore::Group */
export type AwsIdentitystoreGroup = {
  /**
   * A string containing the description of the group.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^[\p{L}\p{M}\p{S}\p{N}\p{P}\t\n\r  　]+$
   */
  Description?: string;
  /**
   * A string containing the name of the group. This value is commonly displayed when the group is
   * referenced.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^[\p{L}\p{M}\p{S}\p{N}\p{P}\t\n\r  ]+$
   */
  DisplayName: string;
  /**
   * The unique identifier for a group in the identity store.
   * @minLength 1
   * @maxLength 47
   * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
   */
  GroupId?: string;
  /**
   * The globally unique identifier for the identity store.
   * @minLength 1
   * @maxLength 36
   * @pattern ^d-[0-9a-f]{10}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  IdentityStoreId: string;
};
