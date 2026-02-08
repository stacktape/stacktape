type GuardrailType = 'stage-restriction' | 'region-restriction';

type StageRestrictionGuardrail = {
  type: 'stage-restriction';
  properties: {
    /**
     * #### Stages where this stack can be deployed (e.g., `["production", "staging"]`). Others are blocked.
     */
    allowedStages?: string[];
  };
};

type RegionRestrictionGuardrail = {
  type: 'region-restriction';
  properties: {
    /**
     * #### AWS regions where this stack can be deployed (e.g., `["eu-west-1", "us-east-1"]`). Others are blocked.
     */
    allowedRegions?: AWSRegion[];
  };
};

type GuardrailDefinition = StageRestrictionGuardrail | RegionRestrictionGuardrail;

// enforceDeadLetterQueues?: boolean;
// @todo
// allowedStagesForAccounts: any[];
// @todo
// requireChangesConfirmation?: boolean;
/**
 * #### CloudFormation Stack Policies
 *
 * ---
 *
 * Stack policies that protect stack resources from unintentional updates or deletions.
 *
 * By default, Stacktape automatically creates policies that prevent the deletion of databases with `deletionProtection` enabled.
 *
 * For more details on stack policies, refer to the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
 */
// cloudformationStackPolicies?: CfStackPolicyStatement[];
