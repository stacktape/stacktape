// This file is auto-generated. Do not edit manually.
// Source: aws-identitystore-groupmembership.json

/** Resource Type Definition for AWS:IdentityStore::GroupMembership */
export type AwsIdentitystoreGroupmembership = {
  /**
   * The unique identifier for a group in the identity store.
   * @minLength 1
   * @maxLength 47
   * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
   */
  GroupId: string;
  /**
   * The globally unique identifier for the identity store.
   * @minLength 1
   * @maxLength 36
   * @pattern ^d-[0-9a-f]{10}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  IdentityStoreId: string;
  /** An object containing the identifier of a group member. */
  MemberId: {
    /**
     * The identifier for a user in the identity store.
     * @minLength 1
     * @maxLength 47
     * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
     */
    UserId: string;
  };
  /**
   * The identifier for a GroupMembership in the identity store.
   * @minLength 1
   * @maxLength 47
   * @pattern ^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$
   */
  MembershipId?: string;
};
