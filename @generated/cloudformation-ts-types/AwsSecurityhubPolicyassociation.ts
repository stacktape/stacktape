// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-policyassociation.json

/**
 * The AWS::SecurityHub::PolicyAssociation resource represents the AWS Security Hub Central
 * Configuration Policy associations in your Target. Only the AWS Security Hub delegated administrator
 * can create the resouce from the home region.
 */
export type AwsSecurityhubPolicyassociation = {
  /**
   * The universally unique identifier (UUID) of the configuration policy or a value of
   * SELF_MANAGED_SECURITY_HUB for a self-managed configuration
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^SELF_MANAGED_SECURITY_HUB$
   */
  ConfigurationPolicyId: string;
  /**
   * The current status of the association between the specified target and the configuration
   * @enum ["SUCCESS","PENDING","FAILED"]
   */
  AssociationStatus?: "SUCCESS" | "PENDING" | "FAILED";
  /**
   * Indicates whether the association between the specified target and the configuration was directly
   * applied by the Security Hub delegated administrator or inherited from a parent
   * @enum ["APPLIED","INHERITED"]
   */
  AssociationType?: "APPLIED" | "INHERITED";
  /** An explanation for a FAILED value for AssociationStatus */
  AssociationStatusMessage?: string;
  /** The identifier of the target account, organizational unit, or the root */
  TargetId: string;
  /**
   * Indicates whether the target is an AWS account, organizational unit, or the organization root
   * @enum ["ACCOUNT","ORGANIZATIONAL_UNIT","ROOT"]
   */
  TargetType: "ACCOUNT" | "ORGANIZATIONAL_UNIT" | "ROOT";
  /**
   * The date and time, in UTC and ISO 8601 format, that the configuration policy association was last
   * updated
   */
  UpdatedAt?: string;
  /** A unique identifier to indicates if the target has an association */
  AssociationIdentifier?: string;
};
