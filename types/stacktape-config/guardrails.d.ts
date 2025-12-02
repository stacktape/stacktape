type GuardrailType = 'stage-restriction' | 'region-restriction';

type StageRestrictionGuardrail = {
  type: 'stage-restriction';
  properties: {
    /**
     * #### Allowed Stages
     *
     * ---
     *
     * A list of stages (e.g., `production`, `staging`) where this stack is allowed to be deployed. If the deployment stage is not in this list, the deployment will be blocked.
     */
    allowedStages?: string[];
  };
};

type RegionRestrictionGuardrail = {
  type: 'region-restriction';
  properties: {
    /**
     * #### Allowed Regions
     *
     * ---
     *
     * A list of AWS regions where this stack is allowed to be deployed. If the deployment region is not in this list, the deployment will be blocked.
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
