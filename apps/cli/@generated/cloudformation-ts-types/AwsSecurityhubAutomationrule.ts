// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-automationrule.json

/**
 * The ``AWS::SecurityHub::AutomationRule`` resource specifies an automation rule based on input
 * parameters. For more information, see [Automation
 * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
 * Guide*.
 */
export type AwsSecurityhubAutomationrule = {
  /** @pattern arn:aws\S*:securityhub:\S* */
  RuleArn?: string;
  /**
   * Whether the rule is active after it is created. If this parameter is equal to ``ENABLED``, ASH
   * applies the rule to findings and finding updates after the rule is created.
   * @enum ["ENABLED","DISABLED"]
   */
  RuleStatus?: "ENABLED" | "DISABLED";
  /**
   * An integer ranging from 1 to 1000 that represents the order in which the rule action is applied to
   * findings. Security Hub applies rules with lower values for this parameter first.
   * @minimum 1
   * @maximum 1000
   */
  RuleOrder: number;
  /**
   * A description of the rule.
   * @minLength 1
   * @maxLength 1024
   */
  Description: string;
  /**
   * The name of the rule.
   * @minLength 1
   * @maxLength 256
   */
  RuleName: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  /**
   * @minLength 1
   * @maxLength 256
   */
  CreatedBy?: string;
  /**
   * Specifies whether a rule is the last to be applied with respect to a finding that matches the rule
   * criteria. This is useful when a finding matches the criteria for multiple rules, and each rule has
   * different actions. If a rule is terminal, Security Hub applies the rule action to a finding that
   * matches the rule criteria and doesn't evaluate other rules for the finding. By default, a rule
   * isn't terminal.
   */
  IsTerminal?: boolean;
  /**
   * One or more actions to update finding fields if a finding matches the conditions specified in
   * ``Criteria``.
   * @minItems 1
   * @maxItems 1
   */
  Actions: ({
    /**
     * Specifies the type of action that Security Hub takes when a finding matches the defined criteria of
     * a rule.
     * @enum ["FINDING_FIELDS_UPDATE"]
     */
    Type: "FINDING_FIELDS_UPDATE";
    /** Specifies that the automation rule action is an update to a finding field. */
    FindingFieldsUpdate: {
      /**
       * The rule action updates the ``Types`` field of a finding.
       * @maxItems 50
       * @uniqueItems true
       */
      Types?: string[];
      /** The rule action will update the ``Severity`` field of a finding. */
      Severity?: {
        /**
         * The native severity as defined by the AWS service or integrated partner product that generated the
         * finding.
         */
        Product?: number;
        /**
         * The severity value of the finding. The allowed values are the following.
         * +  ``INFORMATIONAL`` - No issue was found.
         * +  ``LOW`` - The issue does not require action on its own.
         * +  ``MEDIUM`` - The issue must be addressed but not urgently.
         * +  ``HIGH`` - The issue must be addressed as a priority.
         * +  ``CRITICAL`` - The issue must be remediated immediately to avoid it escalating.
         * @enum ["INFORMATIONAL","LOW","MEDIUM","HIGH","CRITICAL"]
         */
        Label?: "INFORMATIONAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        /**
         * The normalized severity for the finding. This attribute is to be deprecated in favor of ``Label``.
         * If you provide ``Normalized`` and don't provide ``Label``, ``Label`` is set automatically as
         * follows.
         * +  0 - ``INFORMATIONAL``
         * +  1–39 - ``LOW``
         * +  40–69 - ``MEDIUM``
         * +  70–89 - ``HIGH``
         * +  90–100 - ``CRITICAL``
         */
        Normalized?: number;
      };
      /** The rule action updates the ``Confidence`` field of a finding. */
      Confidence?: number;
      /** The rule action updates the ``Criticality`` field of a finding. */
      Criticality?: number;
      /** The rule action updates the ``UserDefinedFields`` field of a finding. */
      UserDefinedFields?: Record<string, string>;
      /**
       * The rule action updates the ``VerificationState`` field of a finding.
       * @enum ["UNKNOWN","TRUE_POSITIVE","FALSE_POSITIVE","BENIGN_POSITIVE"]
       */
      VerificationState?: "UNKNOWN" | "TRUE_POSITIVE" | "FALSE_POSITIVE" | "BENIGN_POSITIVE";
      /**
       * The rule action will update the ``RelatedFindings`` field of a finding.
       * @minItems 1
       * @maxItems 10
       */
      RelatedFindings?: ({
        /** The Amazon Resource Name (ARN) for the product that generated a related finding. */
        ProductArn: string;
        /**
         * The product-generated identifier for a related finding.
         * Array Members: Minimum number of 1 item. Maximum number of 20 items.
         */
        Id: string | string;
      })[];
      /** The rule action will update the ``Note`` field of a finding. */
      Note?: {
        /**
         * The updated note text.
         * @minLength 1
         * @maxLength 512
         */
        Text: string;
        /** The principal that updated the note. */
        UpdatedBy: string | string;
      };
      /** The rule action will update the ``Workflow`` field of a finding. */
      Workflow?: {
        /**
         * The status of the investigation into the finding. The workflow status is specific to an individual
         * finding. It does not affect the generation of new findings. For example, setting the workflow
         * status to ``SUPPRESSED`` or ``RESOLVED`` does not prevent a new finding for the same issue.
         * The allowed values are the following.
         * +  ``NEW`` - The initial state of a finding, before it is reviewed.
         * Security Hub also resets ``WorkFlowStatus`` from ``NOTIFIED`` or ``RESOLVED`` to ``NEW`` in the
         * following cases:
         * +  The record state changes from ``ARCHIVED`` to ``ACTIVE``.
         * +  The compliance status changes from ``PASSED`` to either ``WARNING``, ``FAILED``, or
         * ``NOT_AVAILABLE``.
         * +  ``NOTIFIED`` - Indicates that you notified the resource owner about the security issue. Used
         * when the initial reviewer is not the resource owner, and needs intervention from the resource
         * owner.
         * +  ``RESOLVED`` - The finding was reviewed and remediated and is now considered resolved.
         * +  ``SUPPRESSED`` - Indicates that you reviewed the finding and don't believe that any action is
         * needed. The finding is no longer updated.
         * @enum ["NEW","NOTIFIED","RESOLVED","SUPPRESSED"]
         */
        Status: "NEW" | "NOTIFIED" | "RESOLVED" | "SUPPRESSED";
      };
    };
  })[];
  /**
   * A set of [Security Finding Format
   * (ASFF)](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html)
   * finding field attributes and corresponding expected values that ASH uses to filter findings. If a
   * rule is enabled and a finding matches the criteria specified in this parameter, ASH applies the
   * rule action to the finding.
   */
  Criteria: {
    /**
     * The Amazon Resource Name (ARN) for a third-party product that generated a finding in Security Hub.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ProductArn?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The AWS-account ID in which a finding was generated.
     * Array Members: Minimum number of 1 item. Maximum number of 100 items.
     * @maxItems 100
     */
    AwsAccountId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The product-specific identifier for a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    Id?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The identifier for the solution-specific component that generated a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 100 items.
     * @maxItems 100
     */
    GeneratorId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * One or more finding types in the format of namespace/category/classifier that classify a finding.
     * For a list of namespaces, classifiers, and categories, see [Types taxonomy for
     * ASFF](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format-type-taxonomy.html)
     * in the *User Guide*.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    Type?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * A timestamp that indicates when the potential security issue captured by a finding was first
     * observed by the security findings product.
     * For more information about the validation and formatting of timestamp fields in ASHlong, see
     * [Timestamps](https://docs.aws.amazon.com/securityhub/1.0/APIReference/Welcome.html#timestamps).
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    FirstObservedAt?: (unknown | unknown & unknown)[];
    /**
     * A timestamp that indicates when the security findings provider most recently observed a change in
     * the resource that is involved in the finding.
     * For more information about the validation and formatting of timestamp fields in ASHlong, see
     * [Timestamps](https://docs.aws.amazon.com/securityhub/1.0/APIReference/Welcome.html#timestamps).
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    LastObservedAt?: (unknown | unknown & unknown)[];
    /**
     * A timestamp that indicates when this finding record was created.
     * For more information about the validation and formatting of timestamp fields in ASHlong, see
     * [Timestamps](https://docs.aws.amazon.com/securityhub/1.0/APIReference/Welcome.html#timestamps).
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    CreatedAt?: (unknown | unknown & unknown)[];
    /**
     * A timestamp that indicates when the finding record was most recently updated.
     * For more information about the validation and formatting of timestamp fields in ASHlong, see
     * [Timestamps](https://docs.aws.amazon.com/securityhub/1.0/APIReference/Welcome.html#timestamps).
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    UpdatedAt?: (unknown | unknown & unknown)[];
    /**
     * The likelihood that a finding accurately identifies the behavior or issue that it was intended to
     * identify. ``Confidence`` is scored on a 0–100 basis using a ratio scale. A value of ``0`` means 0
     * percent confidence, and a value of ``100`` means 100 percent confidence. For example, a data
     * exfiltration detection based on a statistical deviation of network traffic has low confidence
     * because an actual exfiltration hasn't been verified. For more information, see
     * [Confidence](https://docs.aws.amazon.com/securityhub/latest/userguide/asff-top-level-attributes.html#asff-confidence)
     * in the *User Guide*.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    Confidence?: (unknown | unknown | unknown)[];
    /**
     * The level of importance that is assigned to the resources that are associated with a finding.
     * ``Criticality`` is scored on a 0–100 basis, using a ratio scale that supports only full integers. A
     * score of ``0`` means that the underlying resources have no criticality, and a score of ``100`` is
     * reserved for the most critical resources. For more information, see
     * [Criticality](https://docs.aws.amazon.com/securityhub/latest/userguide/asff-top-level-attributes.html#asff-criticality)
     * in the *User Guide*.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    Criticality?: (unknown | unknown | unknown)[];
    /**
     * A finding's title.
     * Array Members: Minimum number of 1 item. Maximum number of 100 items.
     * @maxItems 100
     */
    Title?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * A finding's description.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    Description?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * Provides a URL that links to a page about the current finding in the finding product.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    SourceUrl?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * Provides the name of the product that generated the finding. For control-based findings, the
     * product name is Security Hub.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ProductName?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The name of the company for the product that generated the finding. For control-based findings, the
     * company is AWS.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    CompanyName?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The severity value of the finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    SeverityLabel?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * A finding's title.
     * Array Members: Minimum number of 1 item. Maximum number of 100 items.
     * @maxItems 20
     */
    ResourceType?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The identifier for the given resource type. For AWS resources that are identified by Amazon
     * Resource Names (ARNs), this is the ARN. For AWS resources that lack ARNs, this is the identifier as
     * defined by the AWS-service that created the resource. For non-AWS resources, this is a unique
     * identifier that is associated with the resource.
     * Array Members: Minimum number of 1 item. Maximum number of 100 items.
     * @maxItems 100
     */
    ResourceId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The partition in which the resource that the finding pertains to is located. A partition is a group
     * of AWS-Regions. Each AWS-account is scoped to one partition.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ResourcePartition?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The AWS-Region where the resource that a finding pertains to is located.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ResourceRegion?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * A list of AWS tags associated with a resource at the time the finding was processed.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ResourceTags?: ({
      /**
       * The condition to apply to the key value when filtering Security Hub findings with a map filter.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department CONTAINS Security`` matches findings that include
       * the value ``Security`` for the ``Department`` tag. In the same example, a finding with a value of
       * ``Security team`` for the ``Department`` tag is a match.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department EQUALS Security`` matches findings that have the
       * value ``Security`` for the ``Department`` tag.
       * ``CONTAINS`` and ``EQUALS`` filters on the same field are joined by ``OR``. A finding matches if
       * it matches any one of those filters. For example, the filters ``Department CONTAINS Security OR
       * Department CONTAINS Finance`` match a finding that includes either ``Security``, ``Finance``, or
       * both values.
       * To search for values that don't have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_CONTAINS Finance`` matches findings that
       * exclude the value ``Finance`` for the ``Department`` tag.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_EQUALS Finance`` matches findings that don’t
       * have the value ``Finance`` for the ``Department`` tag.
       * ``NOT_CONTAINS`` and ``NOT_EQUALS`` filters on the same field are joined by ``AND``. A finding
       * matches only if it matches all of those filters. For example, the filters ``Department NOT_CONTAINS
       * Security AND Department NOT_CONTAINS Finance`` match a finding that excludes both the ``Security``
       * and ``Finance`` values.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters
       * can only be used with other ``NOT_CONTAINS`` filters.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can’t have both an ``EQUALS`` filter and a ``NOT_EQUALS`` filter on the same field.
       * Combining filters in this way returns an error.
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules. For more
       * information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       * @enum ["EQUALS","NOT_EQUALS","CONTAINS","NOT_CONTAINS"]
       */
      Comparison: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The key of the map filter. For example, for ``ResourceTags``, ``Key`` identifies the name of the
       * tag. For ``UserDefinedFields``, ``Key`` is the name of the field.
       */
      Key: string;
      /**
       * The value for the key in the map filter. Filter values are case sensitive. For example, one of the
       * values for a tag called ``Department`` might be ``Security``. If you provide ``security`` as the
       * filter value, then there's no match.
       */
      Value: string;
    })[];
    /**
     * Custom fields and values about the resource that a finding pertains to.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ResourceDetailsOther?: ({
      /**
       * The condition to apply to the key value when filtering Security Hub findings with a map filter.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department CONTAINS Security`` matches findings that include
       * the value ``Security`` for the ``Department`` tag. In the same example, a finding with a value of
       * ``Security team`` for the ``Department`` tag is a match.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department EQUALS Security`` matches findings that have the
       * value ``Security`` for the ``Department`` tag.
       * ``CONTAINS`` and ``EQUALS`` filters on the same field are joined by ``OR``. A finding matches if
       * it matches any one of those filters. For example, the filters ``Department CONTAINS Security OR
       * Department CONTAINS Finance`` match a finding that includes either ``Security``, ``Finance``, or
       * both values.
       * To search for values that don't have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_CONTAINS Finance`` matches findings that
       * exclude the value ``Finance`` for the ``Department`` tag.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_EQUALS Finance`` matches findings that don’t
       * have the value ``Finance`` for the ``Department`` tag.
       * ``NOT_CONTAINS`` and ``NOT_EQUALS`` filters on the same field are joined by ``AND``. A finding
       * matches only if it matches all of those filters. For example, the filters ``Department NOT_CONTAINS
       * Security AND Department NOT_CONTAINS Finance`` match a finding that excludes both the ``Security``
       * and ``Finance`` values.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters
       * can only be used with other ``NOT_CONTAINS`` filters.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can’t have both an ``EQUALS`` filter and a ``NOT_EQUALS`` filter on the same field.
       * Combining filters in this way returns an error.
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules. For more
       * information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       * @enum ["EQUALS","NOT_EQUALS","CONTAINS","NOT_CONTAINS"]
       */
      Comparison: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The key of the map filter. For example, for ``ResourceTags``, ``Key`` identifies the name of the
       * tag. For ``UserDefinedFields``, ``Key`` is the name of the field.
       */
      Key: string;
      /**
       * The value for the key in the map filter. Filter values are case sensitive. For example, one of the
       * values for a tag called ``Department`` might be ``Security``. If you provide ``security`` as the
       * filter value, then there's no match.
       */
      Value: string;
    })[];
    /**
     * The result of a security check. This field is only used for findings generated from controls.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ComplianceStatus?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The security control ID for which a finding was generated. Security control IDs are the same across
     * standards.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ComplianceSecurityControlId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The unique identifier of a standard in which a control is enabled. This field consists of the
     * resource portion of the Amazon Resource Name (ARN) returned for a standard in the
     * [DescribeStandards](https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_DescribeStandards.html)
     * API response.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    ComplianceAssociatedStandardsId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * Provides the veracity of a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    VerificationState?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * Provides information about the status of the investigation into a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    WorkflowStatus?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * Provides the current state of a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    RecordState?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The ARN for the product that generated a related finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    RelatedFindingsProductArn?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The product-generated identifier for a related finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    RelatedFindingsId?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The text of a user-defined note that's added to a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    NoteText?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * The timestamp of when the note was updated.
     * For more information about the validation and formatting of timestamp fields in ASHlong, see
     * [Timestamps](https://docs.aws.amazon.com/securityhub/1.0/APIReference/Welcome.html#timestamps).
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    NoteUpdatedAt?: (unknown | unknown & unknown)[];
    /**
     * The principal that created a note.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    NoteUpdatedBy?: ({
      /**
       * The condition to apply to a string value when filtering Security Hub findings.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, the filter
       * ``Title CONTAINS CloudFront`` matches findings that have a ``Title`` that includes the string
       * CloudFront.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, the
       * filter ``AwsAccountId EQUALS 123456789012`` only matches findings that have an account ID of
       * ``123456789012``.
       * +  To search for values that start with the filter value, use ``PREFIX``. For example, the filter
       * ``ResourceRegion PREFIX us`` matches findings that have a ``ResourceRegion`` that starts with
       * ``us``. A ``ResourceRegion`` that starts with a different value, such as ``af``, ``ap``, or ``ca``,
       * doesn't match.
       * ``CONTAINS``, ``EQUALS``, and ``PREFIX`` filters on the same field are joined by ``OR``. A finding
       * matches if it matches any one of those filters. For example, the filters ``Title CONTAINS
       * CloudFront OR Title CONTAINS CloudWatch`` match a finding that includes either ``CloudFront``,
       * ``CloudWatch``, or both strings in the title.
       * To search for values that don’t have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, the
       * filter ``Title NOT_CONTAINS CloudFront`` matches findings that have a ``Title`` that excludes the
       * string CloudFront.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, the filter
       * ``AwsAccountId NOT_EQUALS 123456789012`` only matches findings that have an account ID other than
       * ``123456789012``.
       * +  To search for values that don't start with the filter value, use ``PREFIX_NOT_EQUALS``. For
       * example, the filter ``ResourceRegion PREFIX_NOT_EQUALS us`` matches findings with a
       * ``ResourceRegion`` that starts with a value other than ``us``.
       * ``NOT_CONTAINS``, ``NOT_EQUALS``, and ``PREFIX_NOT_EQUALS`` filters on the same field are joined
       * by ``AND``. A finding matches only if it matches all of those filters. For example, the filters
       * ``Title NOT_CONTAINS CloudFront AND Title NOT_CONTAINS CloudWatch`` match a finding that excludes
       * both ``CloudFront`` and ``CloudWatch`` in the title.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can't provide both an ``EQUALS`` filter and a ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filter on the same field. Combining filters in this way returns an error.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters can
       * only be used with other ``NOT_CONTAINS`` filters.
       * You can combine ``PREFIX`` filters with ``NOT_EQUALS`` or ``PREFIX_NOT_EQUALS`` filters for the
       * same field. Security Hub first processes the ``PREFIX`` filters, and then the ``NOT_EQUALS`` or
       * ``PREFIX_NOT_EQUALS`` filters.
       * For example, for the following filters, Security Hub first identifies findings that have resource
       * types that start with either ``AwsIam`` or ``AwsEc2``. It then excludes findings that have a
       * resource type of ``AwsIamPolicy`` and findings that have a resource type of
       * ``AwsEc2NetworkInterface``.
       * +   ``ResourceType PREFIX AwsIam``
       * +   ``ResourceType PREFIX AwsEc2``
       * +   ``ResourceType NOT_EQUALS AwsIamPolicy``
       * +   ``ResourceType NOT_EQUALS AwsEc2NetworkInterface``
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules V1.
       * ``CONTAINS_WORD`` operator is only supported in ``GetFindingsV2``, ``GetFindingStatisticsV2``,
       * ``GetResourcesV2``, and ``GetResourceStatisticsV2`` APIs. For more information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       */
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The string filter value. Filter values are case sensitive. For example, the product name for
       * control-based findings is ``Security Hub``. If you provide ``security hub`` as the filter value,
       * there's no match.
       */
      Value: string;
    })[];
    /**
     * A list of user-defined name and value string pairs added to a finding.
     * Array Members: Minimum number of 1 item. Maximum number of 20 items.
     * @maxItems 20
     */
    UserDefinedFields?: ({
      /**
       * The condition to apply to the key value when filtering Security Hub findings with a map filter.
       * To search for values that have the filter value, use one of the following comparison operators:
       * +  To search for values that include the filter value, use ``CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department CONTAINS Security`` matches findings that include
       * the value ``Security`` for the ``Department`` tag. In the same example, a finding with a value of
       * ``Security team`` for the ``Department`` tag is a match.
       * +  To search for values that exactly match the filter value, use ``EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department EQUALS Security`` matches findings that have the
       * value ``Security`` for the ``Department`` tag.
       * ``CONTAINS`` and ``EQUALS`` filters on the same field are joined by ``OR``. A finding matches if
       * it matches any one of those filters. For example, the filters ``Department CONTAINS Security OR
       * Department CONTAINS Finance`` match a finding that includes either ``Security``, ``Finance``, or
       * both values.
       * To search for values that don't have the filter value, use one of the following comparison
       * operators:
       * +  To search for values that exclude the filter value, use ``NOT_CONTAINS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_CONTAINS Finance`` matches findings that
       * exclude the value ``Finance`` for the ``Department`` tag.
       * +  To search for values other than the filter value, use ``NOT_EQUALS``. For example, for the
       * ``ResourceTags`` field, the filter ``Department NOT_EQUALS Finance`` matches findings that don’t
       * have the value ``Finance`` for the ``Department`` tag.
       * ``NOT_CONTAINS`` and ``NOT_EQUALS`` filters on the same field are joined by ``AND``. A finding
       * matches only if it matches all of those filters. For example, the filters ``Department NOT_CONTAINS
       * Security AND Department NOT_CONTAINS Finance`` match a finding that excludes both the ``Security``
       * and ``Finance`` values.
       * ``CONTAINS`` filters can only be used with other ``CONTAINS`` filters. ``NOT_CONTAINS`` filters
       * can only be used with other ``NOT_CONTAINS`` filters.
       * You can’t have both a ``CONTAINS`` filter and a ``NOT_CONTAINS`` filter on the same field.
       * Similarly, you can’t have both an ``EQUALS`` filter and a ``NOT_EQUALS`` filter on the same field.
       * Combining filters in this way returns an error.
       * ``CONTAINS`` and ``NOT_CONTAINS`` operators can be used only with automation rules. For more
       * information, see [Automation
       * rules](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html) in the *User
       * Guide*.
       * @enum ["EQUALS","NOT_EQUALS","CONTAINS","NOT_CONTAINS"]
       */
      Comparison: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS";
      /**
       * The key of the map filter. For example, for ``ResourceTags``, ``Key`` identifies the name of the
       * tag. For ``UserDefinedFields``, ``Key`` is the name of the field.
       */
      Key: string;
      /**
       * The value for the key in the map filter. Filter values are case sensitive. For example, one of the
       * values for a tag called ``Department`` might be ``Security``. If you provide ``security`` as the
       * filter value, then there's no match.
       */
      Value: string;
    })[];
  };
  /** User-defined tags associated with an automation rule. */
  Tags?: Record<string, string>;
};
