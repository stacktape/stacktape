// This file is auto-generated. Do not edit manually.
// Source: aws-ses-vdmattributes.json

/** Resource Type definition for AWS::SES::VdmAttributes */
export type AwsSesVdmattributes = {
  /** Unique identifier for this resource */
  VdmAttributesResourceId?: string;
  DashboardAttributes?: {
    /**
     * Whether emails sent from this account have engagement tracking enabled.
     * @pattern ENABLED|DISABLED
     */
    EngagementMetrics?: string;
  };
  GuardianAttributes?: {
    /**
     * Whether emails sent from this account have optimized delivery algorithm enabled.
     * @pattern ENABLED|DISABLED
     */
    OptimizedSharedDelivery?: string;
  };
};
