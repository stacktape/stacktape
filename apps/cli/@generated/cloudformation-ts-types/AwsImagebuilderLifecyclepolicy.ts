// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-lifecyclepolicy.json

/** Resource schema for AWS::ImageBuilder::LifecyclePolicy */
export type AwsImagebuilderLifecyclepolicy = {
  /** The Amazon Resource Name (ARN) of the lifecycle policy. */
  Arn?: string;
  /** The name of the lifecycle policy. */
  Name: string;
  /** The description of the lifecycle policy. */
  Description?: string;
  /**
   * The status of the lifecycle policy.
   * @enum ["DISABLED","ENABLED"]
   */
  Status?: "DISABLED" | "ENABLED";
  /** The execution role of the lifecycle policy. */
  ExecutionRole: string;
  /**
   * The resource type of the lifecycle policy.
   * @enum ["AMI_IMAGE","CONTAINER_IMAGE"]
   */
  ResourceType: "AMI_IMAGE" | "CONTAINER_IMAGE";
  /** The policy details of the lifecycle policy. */
  PolicyDetails: ({
    Action: {
      /**
       * The action type of the policy detail.
       * @enum ["DELETE","DEPRECATE","DISABLE"]
       */
      Type: "DELETE" | "DEPRECATE" | "DISABLE";
      IncludeResources?: {
        /** Use to configure lifecycle actions on AMIs. */
        Amis?: boolean;
        /** Use to configure lifecycle actions on containers. */
        Containers?: boolean;
        /** Use to configure lifecycle actions on snapshots. */
        Snapshots?: boolean;
      };
    };
    Filter: {
      /**
       * The filter type.
       * @enum ["AGE","COUNT"]
       */
      Type: "AGE" | "COUNT";
      /** The filter value. */
      Value: number;
      /** The value's time unit. */
      Unit?: "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
      /** The minimum number of Image Builder resources to retain. */
      RetainAtLeast?: number;
    };
    ExclusionRules?: {
      /** The Image Builder tags to filter on. */
      TagMap?: Record<string, string>;
      Amis?: {
        /** Use to apply lifecycle policy actions on whether the AMI is public. */
        IsPublic?: boolean;
        /** Use to apply lifecycle policy actions on AMIs distributed to a set of regions. */
        Regions?: string[];
        /** Use to apply lifecycle policy actions on AMIs shared with a set of regions. */
        SharedAccounts?: string[];
        /** Use to apply lifecycle policy actions on AMIs launched before a certain time. */
        LastLaunched?: {
          /** The last launched value. */
          Value: number;
          /** The value's time unit. */
          Unit: "DAYS" | "WEEKS" | "MONTHS" | "YEARS";
        };
        /** The AMIs to select by tag. */
        TagMap?: Record<string, string>;
      };
    };
  })[];
  /** The resource selection of the lifecycle policy. */
  ResourceSelection: {
    /** The recipes to select. */
    Recipes?: {
      /** The recipe name. */
      Name: string;
      /** The recipe version. */
      SemanticVersion: string;
    }[];
    /** The Image Builder resources to select by tag. */
    TagMap?: Record<string, string>;
  };
  /** The tags associated with the lifecycle policy. */
  Tags?: Record<string, string>;
};
