// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoverycontrol-routingcontrol.json

/** AWS Route53 Recovery Control Routing Control resource schema . */
export type AwsRoute53recoverycontrolRoutingcontrol = {
  /**
   * The Amazon Resource Name (ARN) of the routing control.
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  RoutingControlArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the control panel.
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  ControlPanelArn?: string;
  /**
   * The name of the routing control. You can use any non-white space character in the name.
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  /**
   * The deployment status of the routing control. Status can be one of the following: PENDING,
   * DEPLOYED, PENDING_DELETION.
   * @enum ["PENDING","DEPLOYED","PENDING_DELETION"]
   */
  Status?: "PENDING" | "DEPLOYED" | "PENDING_DELETION";
  /**
   * Arn associated with Control Panel
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  ClusterArn?: string;
};
