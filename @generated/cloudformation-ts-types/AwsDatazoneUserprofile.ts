// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-userprofile.json

/**
 * A user profile represents Amazon DataZone users. Amazon DataZone supports both IAM roles and SSO
 * identities to interact with the Amazon DataZone Management Console and the data portal for
 * different purposes. Domain administrators use IAM roles to perform the initial administrative
 * domain-related work in the Amazon DataZone Management Console, including creating new Amazon
 * DataZone domains, configuring metadata form types, and implementing policies. Data workers use
 * their SSO corporate identities via Identity Center to log into the Amazon DataZone Data Portal and
 * access projects where they have memberships.
 */
export type AwsDatazoneUserprofile = {
  Details?: {
    Iam: {
      /** The ARN of the IAM User Profile. */
      Arn?: string;
    };
  } | {
    Sso: {
      /**
       * The username of the SSO User Profile.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^[a-zA-Z_0-9+=,.@-]+$
       */
      Username?: string;
      /** The First Name of the IAM User Profile. */
      FirstName?: string;
      /** The Last Name of the IAM User Profile. */
      LastName?: string;
    };
  };
  /**
   * The identifier of the Amazon DataZone domain in which the user profile is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The identifier of the Amazon DataZone domain in which the user profile would be created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /** The ID of the Amazon DataZone user profile. */
  Id?: string;
  Status?: "ASSIGNED" | "NOT_ASSIGNED" | "ACTIVATED" | "DEACTIVATED";
  Type?: "IAM" | "SSO";
  /**
   * The ID of the user.
   * @pattern (^([0-9a-f]{10}-|)[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$|^[a-zA-Z_0-9+=,.@-]+$|^arn:aws:iam::\d{12}:.+$)
   */
  UserIdentifier: string;
  UserType?: "IAM_USER" | "IAM_ROLE" | "SSO_USER";
};
