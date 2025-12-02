// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-organizationconfiguration.json

/**
 * The AWS::SecurityHub::OrganizationConfiguration resource represents the configuration of your
 * organization in Security Hub. Only the Security Hub administrator account can create Organization
 * Configuration resource in each region and can opt-in to Central Configuration only in the
 * aggregation region of FindingAggregator.
 */
export type AwsSecurityhubOrganizationconfiguration = {
  /**
   * Whether to automatically enable Security Hub in new member accounts when they join the
   * organization.
   */
  AutoEnable: boolean;
  /**
   * Whether to automatically enable Security Hub default standards in new member accounts when they
   * join the organization.
   * @enum ["DEFAULT","NONE"]
   */
  AutoEnableStandards?: "DEFAULT" | "NONE";
  /**
   * Indicates whether the organization uses local or central configuration.
   * @enum ["CENTRAL","LOCAL"]
   */
  ConfigurationType?: "CENTRAL" | "LOCAL";
  /**
   * Describes whether central configuration could be enabled as the ConfigurationType for the
   * organization.
   * @enum ["PENDING","ENABLED","FAILED"]
   */
  Status?: "PENDING" | "ENABLED" | "FAILED";
  /**
   * Provides an explanation if the value of Status is equal to FAILED when ConfigurationType is equal
   * to CENTRAL.
   */
  StatusMessage?: string;
  /**
   * Whether the maximum number of allowed member accounts are already associated with the Security Hub
   * administrator account.
   */
  MemberAccountLimitReached?: boolean;
  /**
   * The identifier of the OrganizationConfiguration being created and assigned as the unique
   * identifier.
   * @pattern ^[0-9]{12}/[a-zA-Z0-9-]{1,32}/securityhub-organization-configuration$
   */
  OrganizationConfigurationIdentifier?: string;
};
