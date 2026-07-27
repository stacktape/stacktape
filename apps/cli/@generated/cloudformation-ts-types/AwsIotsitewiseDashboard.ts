// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-dashboard.json

/** Resource schema for AWS::IoTSiteWise::Dashboard */
export type AwsIotsitewiseDashboard = {
  /** The ID of the project in which to create the dashboard. */
  ProjectId?: string;
  /** The ID of the dashboard. */
  DashboardId?: string;
  /** A friendly name for the dashboard. */
  DashboardName: string;
  /** A description for the dashboard. */
  DashboardDescription: string;
  /** The dashboard definition specified in a JSON literal. */
  DashboardDefinition: string;
  /** The ARN of the dashboard. */
  DashboardArn?: string;
  /**
   * A list of key-value pairs that contain metadata for the dashboard.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
