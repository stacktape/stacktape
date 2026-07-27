// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-standard.json

/**
 * The ``AWS::SecurityHub::Standard`` resource specifies the enablement of a security standard. The
 * standard is identified by the ``StandardsArn`` property. To view a list of ASH standards and their
 * Amazon Resource Names (ARNs), use the
 * [DescribeStandards](https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_DescribeStandards.html)
 * API operation.
 * You must create a separate ``AWS::SecurityHub::Standard`` resource for each standard that you want
 * to enable.
 * For more information about ASH standards, see [standards
 * reference](https://docs.aws.amazon.com/securityhub/latest/userguide/standards-reference.html) in
 * the *User Guide*.
 */
export type AwsSecurityhubStandard = {
  /** @pattern arn:aws\S*:securityhub:\S* */
  StandardsSubscriptionArn?: string;
  /**
   * The ARN of the standard that you want to enable. To view a list of available ASH standards and
   * their ARNs, use the
   * [DescribeStandards](https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_DescribeStandards.html)
   * API operation.
   * @pattern arn:aws\S*:securityhub:\S
   */
  StandardsArn: string;
  /**
   * Specifies which controls are to be disabled in a standard.
   * *Maximum*: ``100``
   * @minItems 0
   * @maxItems 100
   * @uniqueItems true
   */
  DisabledStandardsControls?: {
    /**
     * The Amazon Resource Name (ARN) of the control.
     * @pattern arn:aws\S*:securityhub:\S*
     */
    StandardsControlArn: string;
    /**
     * A user-defined reason for changing a control's enablement status in a specified standard. If you
     * are disabling a control, then this property is required.
     */
    Reason?: string;
  }[];
};
