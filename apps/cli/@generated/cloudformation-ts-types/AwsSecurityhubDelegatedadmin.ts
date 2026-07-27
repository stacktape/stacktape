// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-delegatedadmin.json

/**
 * The ``AWS::SecurityHub::DelegatedAdmin`` resource designates the delegated ASHlong administrator
 * account for an organization. You must enable the integration between ASH and AOlong before you can
 * designate a delegated ASH administrator. Only the management account for an organization can
 * designate the delegated ASH administrator account. For more information, see [Designating the
 * delegated
 * administrator](https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html#designate-admin-instructions)
 * in the *User Guide*.
 * To change the delegated administrator account, remove the current delegated administrator account,
 * and then designate the new account.
 * To designate multiple delegated administrators in different organizations and AWS-Regions, we
 * recommend using
 * [mappings](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html).
 * Tags aren't supported for this resource.
 */
export type AwsSecurityhubDelegatedadmin = {
  /** @pattern ^[0-9]{12}/[a-zA-Z0-9-]{1,32}$ */
  DelegatedAdminIdentifier?: string;
  /**
   * The AWS-account identifier of the account to designate as the Security Hub administrator account.
   * @pattern ^[0-9]{12}$
   */
  AdminAccountId: string;
  /** @enum ["ENABLED","DISABLE_IN_PROGRESS"] */
  Status?: "ENABLED" | "DISABLE_IN_PROGRESS";
};
