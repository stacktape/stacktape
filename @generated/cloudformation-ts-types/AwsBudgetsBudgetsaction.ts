// This file is auto-generated. Do not edit manually.
// Source: aws-budgets-budgetsaction.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsBudgetsBudgetsaction = {
  ActionId?: string;
  BudgetName: string;
  /** @enum ["ACTUAL","FORECASTED"] */
  NotificationType: "ACTUAL" | "FORECASTED";
  /** @enum ["APPLY_IAM_POLICY","APPLY_SCP_POLICY","RUN_SSM_DOCUMENTS"] */
  ActionType: "APPLY_IAM_POLICY" | "APPLY_SCP_POLICY" | "RUN_SSM_DOCUMENTS";
  ActionThreshold: {
    Value: number;
    /** @enum ["PERCENTAGE","ABSOLUTE_VALUE"] */
    Type: "PERCENTAGE" | "ABSOLUTE_VALUE";
  };
  ExecutionRoleArn: string;
  /** @enum ["AUTOMATIC","MANUAL"] */
  ApprovalModel?: "AUTOMATIC" | "MANUAL";
  /**
   * @minItems 1
   * @maxItems 11
   */
  Subscribers: ({
    /** @enum ["SNS","EMAIL"] */
    Type: "SNS" | "EMAIL";
    Address: string;
  })[];
  Definition: {
    IamActionDefinition?: {
      PolicyArn: string;
      /**
       * @minItems 1
       * @maxItems 100
       */
      Roles?: string[];
      /**
       * @minItems 1
       * @maxItems 100
       */
      Groups?: string[];
      /**
       * @minItems 1
       * @maxItems 100
       */
      Users?: string[];
    };
    ScpActionDefinition?: {
      PolicyId: string;
      /**
       * @minItems 1
       * @maxItems 100
       */
      TargetIds: string[];
    };
    SsmActionDefinition?: {
      /** @enum ["STOP_EC2_INSTANCES","STOP_RDS_INSTANCES"] */
      Subtype: "STOP_EC2_INSTANCES" | "STOP_RDS_INSTANCES";
      Region: string;
      /**
       * @minItems 1
       * @maxItems 100
       */
      InstanceIds: string[];
    };
  };
  ResourceTags?: {
    Key: string;
    Value: string;
  }[];
};
