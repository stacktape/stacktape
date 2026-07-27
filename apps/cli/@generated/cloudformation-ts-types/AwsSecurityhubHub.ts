// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-hub.json

/**
 * The AWS::SecurityHub::Hub resource represents the implementation of the AWS Security Hub service in
 * your account. One hub resource is created for each Region in which you enable Security Hub.
 */
export type AwsSecurityhubHub = {
  /**
   * An ARN is automatically created for the customer.
   * @pattern ^arn:.*
   */
  ARN?: string;
  /** Whether to enable the security standards that Security Hub has designated as automatically enabled. */
  EnableDefaultStandards?: boolean;
  /**
   * This field, used when enabling Security Hub, specifies whether the calling account has consolidated
   * control findings turned on. If the value for this field is set to SECURITY_CONTROL, Security Hub
   * generates a single finding for a control check even when the check applies to multiple enabled
   * standards.  If the value for this field is set to STANDARD_CONTROL, Security Hub generates separate
   * findings for a control check when the check applies to multiple enabled standards.
   * @pattern ^(SECURITY_CONTROL|STANDARD_CONTROL)$
   */
  ControlFindingGenerator?: string;
  /** Whether to automatically enable new controls when they are added to standards that are enabled */
  AutoEnableControls?: boolean;
  Tags?: Record<string, string>;
  /** The date and time when Security Hub was enabled in the account. */
  SubscribedAt?: string;
};
