// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoverycontrol-controlpanel.json

/** AWS Route53 Recovery Control Control Panel resource schema . */
export type AwsRoute53recoverycontrolControlpanel = {
  /**
   * Cluster to associate with the Control Panel
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  ClusterArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the cluster.
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  ControlPanelArn?: string;
  /**
   * The name of the control panel. You can use any non-white space character in the name.
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  /**
   * The deployment status of control panel. Status can be one of the following: PENDING, DEPLOYED,
   * PENDING_DELETION.
   * @enum ["PENDING","DEPLOYED","PENDING_DELETION"]
   */
  Status?: "PENDING" | "DEPLOYED" | "PENDING_DELETION";
  /**
   * A flag that Amazon Route 53 Application Recovery Controller sets to true to designate the default
   * control panel for a cluster. When you create a cluster, Amazon Route 53 Application Recovery
   * Controller creates a control panel, and sets this flag for that control panel. If you create a
   * control panel yourself, this flag is set to false.
   */
  DefaultControlPanel?: boolean;
  /** Count of associated routing controls */
  RoutingControlCount?: number;
  /** A collection of tags associated with a resource */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value: string;
  }[];
};
