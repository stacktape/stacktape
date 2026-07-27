// This file is auto-generated. Do not edit manually.
// Source: aws-stepfunctions-statemachinealias.json

/** Resource schema for StateMachineAlias */
export type AwsStepfunctionsStatemachinealias = {
  /**
   * The ARN of the alias.
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
  /**
   * The alias name.
   * @minLength 1
   * @maxLength 80
   */
  Name?: string;
  /**
   * An optional description of the alias.
   * @minLength 1
   * @maxLength 256
   */
  Description?: string;
  RoutingConfiguration?: {
    /**
     * The Amazon Resource Name (ARN) that identifies one or two state machine versions defined in the
     * routing configuration.
     * @minLength 1
     * @maxLength 2048
     */
    StateMachineVersionArn: string;
    /**
     * The percentage of traffic you want to route to the state machine version. The sum of the weights in
     * the routing configuration must be equal to 100.
     * @minimum 0
     * @maximum 100
     */
    Weight: number;
  }[];
  DeploymentPreference?: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    StateMachineVersionArn: string;
    /**
     * The type of deployment to perform.
     * @enum ["LINEAR","ALL_AT_ONCE","CANARY"]
     */
    Type: "LINEAR" | "ALL_AT_ONCE" | "CANARY";
    /**
     * The percentage of traffic to shift to the new version in each increment.
     * @minimum 1
     * @maximum 99
     */
    Percentage?: number;
    /**
     * The time in minutes between each traffic shifting increment.
     * @minimum 1
     * @maximum 2100
     */
    Interval?: number;
    /**
     * A list of CloudWatch alarm names that will be monitored during the deployment. The deployment will
     * fail and rollback if any alarms go into ALARM state.
     * @minItems 1
     * @maxItems 100
     * @uniqueItems true
     */
    Alarms?: string[];
  };
};
